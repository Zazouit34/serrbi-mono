import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@workspace/db";
import { extractResumeProfileFromRawText } from "../agent/intentExtractor";
import { buildResumeEmbeddingText } from "@/lib/embedding-text";
import { embedText } from "@/lib/embedding";

export const runtime = "nodejs";

type ResumeInsightRequest = {
  text?: string;
  locale?: string;
};

type ResumeInsightResponse = {
  overallScore: number;
  skillGaps: string[];
  suggestedRoles: string[];
  salaryRange: { min: number; max: number };
  improvements: string[];
};

function getChatApiUrl(): string {
  const value = process.env.CHAT_API_URL;
  if (!value) {
    throw new Error("Missing required environment variable: CHAT_API_URL ");
  }
  return value;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function pickFirstString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

function extractAssistantText(json: any): string | null {
  return pickFirstString(
    json?.output?.choices?.[0]?.message?.content,
    json?.output?.text,
    json?.output?.texts?.[0],
    json?.output?.choices?.[0]?.text,
    json?.choices?.[0]?.message?.content,
    json?.choices?.[0]?.text,
  );
}

async function callQwenJson(messages: { role: "system" | "user"; content: string }[]): Promise<string> {
  const url = getChatApiUrl();
  const apiKey = getRequiredEnv("DASHSCOPE_API_KEY");
  const model = "qwen3-32b";

  const dashscopeBody = {
    model,
    input: { messages },
    parameters: {
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 900,
      result_format: "message",
      enable_thinking: false,
    },
  };

  let response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(dashscopeBody),
  });

  if (!response.ok) {
    const openaiBody = {
      model,
      messages,
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 900,
      enable_thinking: false,
    };
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(openaiBody),
    });
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Resume insight model call failed (${response.status})${details ? `: ${details.slice(0, 300)}` : ""}`);
  }

  const json = await response.json();
  const text = extractAssistantText(json);
  if (!text) throw new Error("Resume insight model returned empty output.");
  return text;
}

function safeParseInsight(text: string): ResumeInsightResponse | null {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  const jsonSlice = firstBrace !== -1 && lastBrace !== -1 ? text.slice(firstBrace, lastBrace + 1) : text;

  let parsed: any;
  try {
    parsed = JSON.parse(jsonSlice);
  } catch {
    return null;
  }

  if (
    typeof parsed?.overallScore !== "number" ||
    !Array.isArray(parsed?.skillGaps) ||
    !Array.isArray(parsed?.suggestedRoles) ||
    typeof parsed?.salaryRange?.min !== "number" ||
    typeof parsed?.salaryRange?.max !== "number" ||
    !Array.isArray(parsed?.improvements)
  ) {
    return null;
  }

  return {
    overallScore: Math.max(0, Math.min(100, Math.round(parsed.overallScore))),
    skillGaps: parsed.skillGaps.map((v: unknown) => String(v)).filter(Boolean).slice(0, 12),
    suggestedRoles: parsed.suggestedRoles.map((v: unknown) => String(v)).filter(Boolean).slice(0, 10),
    salaryRange: {
      min: Math.max(0, Math.round(parsed.salaryRange.min)),
      max: Math.max(0, Math.round(parsed.salaryRange.max)),
    },
    improvements: parsed.improvements.map((v: unknown) => String(v)).filter(Boolean).slice(0, 12),
  };
}

function fallbackInsight(): ResumeInsightResponse {
  return {
    overallScore: 65,
    skillGaps: ["Domain-specific keywords", "Quantified achievements"],
    suggestedRoles: ["Operations Specialist", "Project Coordinator"],
    salaryRange: { min: 7000, max: 14000 },
    improvements: [
      "Add measurable results for each experience line.",
      "Align skills section with target job keywords.",
      "Strengthen summary with role-specific impact statements.",
    ],
  };
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as ResumeInsightRequest | null;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const locale = typeof body?.locale === "string" ? body.locale : "en";
    if (!text) {
      return NextResponse.json({ error: "Resume text is required" }, { status: 400 });
    }

    const profile = await extractResumeProfileFromRawText({ resumeText: text, locale });
    const standardizedText = buildResumeEmbeddingText(profile);
    const resumeEmbedding = await embedText(standardizedText);
    const embeddingLiteral = `[${resumeEmbedding.join(",")}]`;

    const topJobs = await (prisma as any).$queryRawUnsafe(
      `
        SELECT
          "title",
          "tags",
          "experienceLevel",
          "city",
          "category",
          (1 - ("embedding_vector" <=> $1::vector))::float AS "similarity"
        FROM "Job"
        WHERE "embedding_vector" IS NOT NULL
          AND "status" = 'published'
        ORDER BY "embedding_vector" <=> $1::vector ASC
        LIMIT 8
      `,
      embeddingLiteral,
    );

    const systemPrompt = `
You are a multilingual resume strategist.
Return JSON only with this exact shape:
{
  "overallScore": number,
  "skillGaps": string[],
  "suggestedRoles": string[],
  "salaryRange": { "min": number, "max": number },
  "improvements": string[]
}
Rules:
- Keep overallScore in [0, 100].
- Salary must be monthly MAD.
- Base the answer on resume profile + semantic matches.
- Keep recommendations practical and concise.
`.trim();

    const userPayload = JSON.stringify({
      locale,
      profile,
      semanticMatches: topJobs,
      note: "Use the semantic matches as grounding evidence for role fit, skill gaps, and salary range.",
    });

    const raw = await callQwenJson([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPayload },
    ]);
    const parsed = safeParseInsight(raw);
    if (!parsed) {
      return NextResponse.json(fallbackInsight(), { status: 200 });
    }
    return NextResponse.json(parsed, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate resume insight" },
      { status: 500 },
    );
  }
}


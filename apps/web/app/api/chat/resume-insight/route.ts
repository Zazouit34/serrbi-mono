import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, JobListingStatus } from "@workspace/db";
import { extractResumeProfileFromRawText } from "../agent/intentExtractor";
import { callChatLlm } from "@/lib/chat-llm";

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

function safeParseInsight(text: string): ResumeInsightResponse | null {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  const jsonSlice =
    firstBrace !== -1 && lastBrace !== -1 ? text.slice(firstBrace, lastBrace + 1) : text;

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

async function getGroundingJobs(profile: {
  job_title?: string | null;
  skills?: string[];
}) {
  const title = profile.job_title?.trim();
  const skills = (profile.skills ?? []).slice(0, 5);

  if (title) {
    const matches = await prisma.job.findMany({
      where: {
        status: JobListingStatus.published,
        OR: [
          { title: { contains: title, mode: "insensitive" } },
          ...skills.map((skill) => ({
            tags: { has: skill },
          })),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        title: true,
        tags: true,
        experienceLevel: true,
        city: true,
        category: true,
      },
    });
    if (matches.length > 0) return matches;
  }

  return prisma.job.findMany({
    where: { status: JobListingStatus.published },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      title: true,
      tags: true,
      experienceLevel: true,
      city: true,
      category: true,
    },
  });
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
    const groundingJobs = await getGroundingJobs(profile);

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
- Salary must be monthly EUR for Morocco / France / Belgium / Germany markets.
- Base the answer on the resume profile and sample job listings provided.
- Keep recommendations practical and concise.
- Respond in the user's locale when possible: ${locale}.
`.trim();

    const userPayload = JSON.stringify({
      locale,
      resumeText: text.slice(0, 12000),
      profile,
      sampleJobs: groundingJobs,
      note: "Use the sample jobs as grounding evidence for role fit, skill gaps, and salary range.",
    });

    const raw = await callChatLlm(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPayload },
      ],
      { temperature: 0.2, maxTokens: 900 },
    );

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

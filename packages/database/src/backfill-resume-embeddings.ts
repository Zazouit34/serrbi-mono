import { PDFParse } from "pdf-parse";
import { prisma } from "./client";

type ResumeProfile = {
  full_name: string | null;
  job_title: string | null;
  experience_years: number | null;
  experience_level: "junior" | "mid" | "senior" | null;
  skills: string[];
  industries: string[];
  education_level: string | null;
  locations_preferred: string[];
  remote_preference: boolean | null;
  salary_expectation: {
    min: number | null;
  };
  career_summary: string | null;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "no") return false;
  }
  return null;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

async function callIntentLlm(messages: Array<{ role: "system" | "user"; content: string }>): Promise<string> {
  const url = getRequiredEnv("CHAT_API_URL");
  const apiKey = getRequiredEnv("DASHSCOPE_API_KEY");
  const model = "qwen3-32b";

  const body = {
    model,
    input: { messages },
    parameters: {
      temperature: 0.1,
      top_p: 0.9,
      max_tokens: 700,
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
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        top_p: 0.9,
        max_tokens: 700,
        enable_thinking: false,
      }),
    });
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Resume extraction LLM error ${response.status}: ${details}`);
  }

  const payload: any = await response.json();
  const content =
    payload?.output?.choices?.[0]?.message?.content ??
    payload?.output?.text ??
    payload?.choices?.[0]?.message?.content ??
    payload?.choices?.[0]?.text;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Resume extraction LLM returned empty content");
  }
  return content;
}

function parseResumeProfile(raw: string): ResumeProfile | null {
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  const jsonSlice = firstBrace !== -1 && lastBrace !== -1 ? raw.slice(firstBrace, lastBrace + 1) : raw;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonSlice);
  } catch {
    return null;
  }

  const obj = parsed as Record<string, unknown>;
  const levelRaw = parseString(obj.experience_level);
  const level = levelRaw === "junior" || levelRaw === "mid" || levelRaw === "senior" ? levelRaw : null;
  const salaryObj =
    obj.salary_expectation && typeof obj.salary_expectation === "object"
      ? (obj.salary_expectation as Record<string, unknown>)
      : {};

  return {
    full_name: parseString(obj.full_name),
    job_title: parseString(obj.job_title),
    experience_years: parseNumber(obj.experience_years),
    experience_level: level,
    skills: parseStringArray(obj.skills),
    industries: parseStringArray(obj.industries),
    education_level: parseString(obj.education_level),
    locations_preferred: parseStringArray(obj.locations_preferred),
    remote_preference: parseBoolean(obj.remote_preference),
    salary_expectation: { min: parseNumber(salaryObj.min) },
    career_summary: parseString(obj.career_summary),
  };
}

async function extractResumeProfile(resumeText: string): Promise<ResumeProfile> {
  const prompt = `
You are a resume profile extractor.
Extract structured candidate data from raw resume text.
Return JSON only.

Schema:
{
  "full_name": string | null,
  "job_title": string | null,
  "experience_years": number | null,
  "experience_level": "junior" | "mid" | "senior" | null,
  "skills": string[],
  "industries": string[],
  "education_level": string | null,
  "locations_preferred": string[],
  "remote_preference": boolean | null,
  "salary_expectation": { "min": number | null },
  "career_summary": string | null
}

Rules:
- Do not invent facts; use null/[] when unknown.
- Keep career_summary concise.
`.trim();

  const raw = await callIntentLlm([
    { role: "system", content: prompt },
    { role: "user", content: resumeText.slice(0, 20000) },
  ]);
  const parsed = parseResumeProfile(raw);
  if (!parsed) {
    throw new Error("Failed to parse resume profile JSON");
  }
  return parsed;
}

function buildResumeEmbeddingText(profile: ResumeProfile): string {
  const parts = [
    profile.job_title ? `role:${profile.job_title}` : "",
    profile.experience_level ? `experience_level:${profile.experience_level}` : "",
    profile.experience_years != null ? `experience_years:${profile.experience_years}` : "",
    profile.skills.length ? `skills:${profile.skills.join(", ")}` : "",
    profile.industries.length ? `industries:${profile.industries.join(", ")}` : "",
    profile.education_level ? `education:${profile.education_level}` : "",
    profile.locations_preferred.length ? `preferred_locations:${profile.locations_preferred.join(", ")}` : "",
    profile.remote_preference != null ? `remote:${profile.remote_preference ? "yes" : "no"}` : "",
    profile.salary_expectation.min != null ? `salary_min:${profile.salary_expectation.min}` : "",
    profile.career_summary ? `summary:${profile.career_summary}` : "",
  ];
  return parts.filter(Boolean).join(" | ");
}

async function callEmbeddingApi(text: string): Promise<number[]> {
  const baseUrl = getRequiredEnv("EMBEDDING_API_URL");
  const apiKey = getRequiredEnv("DASHSCOPE_API_KEY");
  const url = baseUrl.includes("/services/embeddings/")
    ? baseUrl
    : `${baseUrl.replace(/\/$/, "")}/services/embeddings/text-embedding/text-embedding`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-v4",
      input: { texts: [text] },
      parameters: { output_type: "dense" },
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Embedding API error ${response.status}: ${details}`);
  }

  const payload: any = await response.json();
  const embedding = payload?.output?.embeddings?.[0]?.embedding;
  if (!Array.isArray(embedding) || !embedding.every((x) => typeof x === "number")) {
    throw new Error("Invalid embedding response for resume");
  }
  return embedding as number[];
}

async function getResumeTextFromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch resume URL (${res.status})`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const parser = new PDFParse({ data: bytes });
  const parsed = await parser.getText();
  const text = typeof parsed.text === "string" ? parsed.text : "";
  return text.replace(/\s+/g, " ").trim();
}

async function main() {
  const BATCH_SIZE = 10;
  const forceReembed = process.env.FORCE_REEMBED === "true";
  let processed = 0;
  let updated = 0;
  let failed = 0;

  while (true) {
    const users = await prisma.user.findMany({
      where: forceReembed
        ? { resumeUrl: { not: null } }
        : {
            resumeUrl: { not: null },
            resumeEmbedding: { isEmpty: true },
          },
      select: {
        id: true,
        email: true,
        resumeUrl: true,
      },
      orderBy: { createdAt: "asc" },
      skip: processed,
      take: BATCH_SIZE,
    });

    if (users.length === 0) break;

    for (const user of users) {
      processed += 1;
      try {
        if (!user.resumeUrl) continue;
        const resumeText = await getResumeTextFromUrl(user.resumeUrl);
        if (!resumeText || resumeText.length < 40) {
          throw new Error("Resume text too short after parsing");
        }
        const profile = await extractResumeProfile(resumeText);
        const standardized = buildResumeEmbeddingText(profile);
        const embedding = await callEmbeddingApi(standardized);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            resumeEmbedding: embedding,
          },
        });
        updated += 1;
        console.log(`[resume-backfill] updated user=${user.id} email=${user.email}`);
      } catch (error) {
        failed += 1;
        console.error(`[resume-backfill] failed user=${user.id} email=${user.email}`, error);
      }
    }
  }

  console.log(`[resume-backfill] done processed=${processed} updated=${updated} failed=${failed}`);
}

main()
  .catch((err) => {
    console.error("Error while backfilling resume embeddings:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_ID = "tngtech/deepseek-r1t2-chimera:free";

type AnalyzeAction = "resumeAnalysis" | "careerSwitch";

interface ResumePayload {
  text: string;
}

interface CareerSwitchPayload {
  currentRole: string;
  currentSkills?: string;
  interests: string;
  targetIndustry?: string;
  timeframe?: string;
  budget?: string;
}

interface AnalyzeRequestBody {
  action: AnalyzeAction;
  payload: ResumePayload | CareerSwitchPayload;
}

async function callOpenRouter(prompt: string) {
  const apiKey =
    process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY / NEXT_PUBLIC_OPENROUTER_API_KEY is not configured.",
    );
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.OPENROUTER_REFERRER || "http://localhost",
      "X-Title": "SerrbiAIAnalyze",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: MODEL_ID,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter error ${response.status}${
        details ? `: ${details.slice(0, 200)}` : ""
      }`,
    );
  }

  const data = (await response.json()) as any;
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenRouter returned invalid payload.");
  }

  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  const jsonSlice =
    firstBrace !== -1 && lastBrace !== -1
      ? content.slice(firstBrace, lastBrace + 1)
      : content;

  return JSON.parse(jsonSlice);
}

function buildResumePrompt(text: string): string {
  return `
You are an expert career coach and resume analyst.

Analyze the resume text below and respond ONLY in valid JSON following exactly this structure:
{
  "overallScore": number,
  "skillGaps": string[],
  "suggestedRoles": string[],
  "salaryRange": { "min": number, "max": number },
  "improvements": string[]
}

### Language
- Detect whether the resume is primarily written in English, French or Arabic.
- Write all strings in "skillGaps", "suggestedRoles" and "improvements" in the same language as the resume.
- If you are unsure, default to English.

### Scoring Rules
- Increase the score for resumes that are well-written, structured, and professional.
- Decrease the score if the resume is incomplete, messy, extremely short, or not a real resume.
- Score must always be between 0 and 100.

### Salary
- Estimate the monthly salary range in EURO (€) based on the resume’s skills, experience, and job roles.
- Provide realistic numbers for Europe (Morocco / France / Belgium / Germany).

Resume text:
"""${text || ""}"""
`.trim();
}

function buildCareerSwitchPrompt(payload: CareerSwitchPayload): string {
  return `
You are an expert career coach. Based on the user's details below, suggest three ideal career transition paths.
Return JSON with this shape:
{
  "paths": [
    {
      "title": string,
      "currentSalary": { "min": number, "max": number },
      "targetSalary": { "min": number, "max": number },
      "timeToTransition": string,
      "requiredSkills": string[],
      "steps": string[],
      "difficulty": "Easy" | "Moderate" | "Challenging"
    }
  ]
}

All salaries must be in EURO per month and realistic for Morocco, France, Belgium, or Germany based on the context.

User Profile:
- Current Role: ${payload.currentRole}
- Skills: ${payload.currentSkills || "N/A"}
- Interests: ${payload.interests}
- Target Industry: ${payload.targetIndustry || "N/A"}
- Transition Timeframe: ${payload.timeframe || "N/A"}
- Learning Budget: ${payload.budget || "N/A"}
`.trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as AnalyzeRequestBody | null;
    if (!body?.action || !body?.payload) {
      return NextResponse.json(
        { error: "Missing action or payload" },
        { status: 400 },
      );
    }

    let prompt: string;

    if (body.action === "resumeAnalysis") {
      const payload = body.payload as ResumePayload;
      if (!payload.text?.trim()) {
        return NextResponse.json(
          { error: "Resume text is required" },
          { status: 400 },
        );
      }
      prompt = buildResumePrompt(payload.text);
    } else if (body.action === "careerSwitch") {
      const payload = body.payload as CareerSwitchPayload;
      if (!payload.currentRole?.trim() || !payload.interests?.trim()) {
        return NextResponse.json(
          { error: "Current role and interests are required" },
          { status: 400 },
        );
      }
      prompt = buildCareerSwitchPrompt(payload);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = await callOpenRouter(prompt);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI error occurred";
    return NextResponse.json(
      { error: "AI request failed", details: message },
      { status: 500 },
    );
  }
}


import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_ID = "tngtech/deepseek-r1t2-chimera:free";

type AnalyzeAction = "resumeAnalysis" | "careerSwitch";

interface ResumePayload {
  text: string;
  locale?: string;
}

interface CareerSwitchPayload {
  currentRole: string;
  currentSkills?: string;
  interests: string;
  targetIndustry?: string;
  timeframe?: string;
  budget?: string;
}

interface Snapshot {
  title: string;
  about: string;
  workExperience: Array<{
    role: string;
    company: string;
    period: string;
    location: string;
  }>;
  salary: { min: number; max: number };
  skills: string[];
  industry: string;
  timeframe: string;
  budget: string;
}

interface RoadmapStep {
  title: string;
  description: string;
}

interface CareerSwitchResult {
  insight?: string;
  currentSnapshot: Snapshot;
  recommendedSnapshot: Snapshot;
  roadmap: RoadmapStep[];
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

function buildResumePrompt(text: string, locale?: string): string {
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
- Preferred output language: ${locale || "English"}.
- If a preferred language is provided, respond using it even if the resume is in another language. Otherwise, detect whether the resume is primarily English, French, or Arabic and respond in that language. If unsure, default to English.

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

function formatList(list?: string) {
  return list
    ? list
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .join(", ")
    : "";
}

function buildCareerSwitchPrompt(payload: CareerSwitchPayload): string {
  const skillsSummary =
    formatList(payload.currentSkills) || "a diverse set of foundational skills";
  return `
You are an expert multilingual career strategist. Produce a calm, advisor-style response.

Respond ONLY in JSON with this shape (no extra keys):
{
  "insight": string,
  "currentSnapshot": {
    "title": string,
    "about": string,
    "workExperience": [
      { "role": string, "company": string, "period": string, "location": string }
    ],
    "salary": { "min": number, "max": number },
    "skills": string[],
    "industry": string,
    "timeframe": string,
    "budget": string
  },
  "recommendedSnapshot": {
    "title": string,
    "about": string,
    "workExperience": [
      { "role": string, "company": string, "period": string, "location": string }
    ],
    "salary": { "min": number, "max": number },
    "skills": string[],
    "industry": string,
    "timeframe": string,
    "budget": string
  },
  "roadmap": [
    {
      "title": string,
      "description": string,
      "timeline": string,
      "focus": string,
      "skills": string[],
      "resources": string[],
      "deliverables": string[],
      "metrics": string[],
      "salaryImpact": string,
      "risk": string
    }
  ]
}

Language:
- Detect if the user data is primarily French, Arabic, or English. Write ALL strings in that language. If mixed, choose the majority language; if unclear, default to English.

Guidance:
- Keep salary values realistic for Morocco, France, Belgium, or Germany and expressed as EURO per month.
- Make the roadmap feel like a gold-standard career switch plan: include learning time curve, effort, milestone metrics, tangible deliverables, and expected salary impact per step.
- Focus steps on the fastest path from current to recommended snapshot: foundational skills -> portfolio/deliverables -> networking/interviews -> final transition.

User Profile:
- Current role: ${payload.currentRole}
- Interests: ${payload.interests}
- Key skills: ${skillsSummary}
- Target industry: ${payload.targetIndustry || "TBD"}
- Transition timeframe: ${payload.timeframe || "TBD"}
- Learning budget: ${payload.budget || "TBD"}

Make the current snapshot describe the user's present chapter. The recommended snapshot should read like the next chapter (title, salary band, top skills, industry, timeline, budget). Ensure roadmap steps are concise but rich in actions, resources, and metrics.
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
      prompt = buildResumePrompt(payload.text, payload.locale);
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
    return NextResponse.json(result as CareerSwitchResult, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI error occurred";
    return NextResponse.json(
      { error: "AI request failed", details: message },
      { status: 500 },
    );
  }
}


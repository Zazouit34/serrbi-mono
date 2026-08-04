import { NextResponse } from "next/server";
import { callChatLlmJson } from "@/lib/chat-llm";

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
- Estimate the monthly salary range in EURO (€) based on the resume's skills, experience, and job roles.
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

    const result = await callChatLlmJson(
      [{ role: "user", content: prompt }],
      { temperature: 0.3, maxTokens: 2000 },
    );

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

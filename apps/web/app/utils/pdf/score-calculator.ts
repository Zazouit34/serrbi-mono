export type LLMResumeAnalysis = {
  overallScore: number; // 0–100
  skillGaps: string[];
  suggestedRoles: string[];
  salaryRange: { min: number; max: number }; // monthly salary in EUR
  improvements: string[];
};

export type ResumeScore = {
  score: number; // 0–100
  breakdown: { category: string; score: number; max: number; missing?: string[] }[];
  suggestions: string[];
  llm?: LLMResumeAnalysis;
};

const re = {
  email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  phone: /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/,
  year: /\b(19|20)\d{2}\b/,
  monthYear: /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(19|20)\d{2}\b/i,
  link: /(https?:\/\/|linkedin\.com|github\.com|portfolio|behance|dribbble|linktr\.ee)/i,
  bullets: /(^[\-\*\u2022]\s+)|(\u2022)/m,
  impact: /\b(\d+%|\$?\d+(?:,\d{3})*)\b/,
};

const sectionKeys = {
  experience: ["experience", "employment", "work history", "professional experience"],
  education: ["education", "degree", "university", "college", "bachelor", "master", "phd"],
  skills: ["skills", "competencies", "expertise", "abilities", "proficiencies"],
  summary: ["summary", "objective", "profile", "about me"],
  projects: ["projects", "portfolio", "case studies", "selected work"],
  certs: ["certifications", "licenses", "training", "courses"],
};

const actionVerbs = [
  "led", "managed", "built", "created", "developed", "designed", "implemented", "launched", "optimized",
  "improved", "organized", "coordinated", "planned", "executed", "trained", "analyzed", "collaborated",
  "mentored", "delivered", "achieved", "supported", "increased", "reduced", "initiated", "directed"
];

function has(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function includesSection(text: string, keys: string[]) {
  return keys.some((k) => new RegExp(`\\b${k}[:\\s\\n]`, "i").test(text));
}

function scorePresence(present: boolean, max: number) {
  return present ? max : 0;
}

function scoreVerbs(text: string, max: number) {
  const count = actionVerbs.filter((v) => new RegExp(`\\b${v}\\b`, "i").test(text)).length;
  const ratio = Math.min(1, count / 8); // 8+ verbs = full score
  return Math.round(max * ratio);
}

function scoreLength(words: number, max: number) {
  if (words >= 300 && words <= 900) return max;
  if (words < 150) return Math.round(max * 0.3);
  if (words < 300) return Math.round(max * 0.6);
  if (words > 1500) return Math.round(max * 0.4);
  if (words > 900) return Math.round(max * 0.7);
  return max;
}

function scoreRecency(text: string, max: number) {
  const yearRegex = /\b(19|20)\d{2}\b/g; // ✅ add global flag
  const years = Array.from(text.matchAll(yearRegex), (m) => parseInt(m[0]));
  if (!years.length) return 0;
  const recent = years.some((y) => y >= new Date().getFullYear() - 7);
  return recent ? max : Math.round(max * 0.3);
}

function scoreResumeHeuristic(textInput: string): ResumeScore {
  const text = textInput || "";
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  const presence = {
    email: has(text, re.email),
    phone: has(text, re.phone),
    experience: includesSection(text, sectionKeys.experience),
    education: includesSection(text, sectionKeys.education),
    skills: includesSection(text, sectionKeys.skills),
    summary: includesSection(text, sectionKeys.summary),
    projects: includesSection(text, sectionKeys.projects),
    certs: includesSection(text, sectionKeys.certs),
    links: has(text, re.link),
    dates: has(text, re.monthYear) || has(text, re.year),
    bullets: has(text, re.bullets),
    impact: has(text, re.impact),
  };

  const weights = {
    contact: 15,
    experience: 20,
    education: 10,
    skills: 10,
    summary: 7,
    projectsCerts: 8,
    links: 5,
    dates: 5,
    bullets: 5,
    verbs: 5,
    length: 5,
    recency: 3,
    impact: 2,
  };

  const breakdown: ResumeScore["breakdown"] = [
    {
      category: "Contact Info",
      score: (presence.email ? 8 : 0) + (presence.phone ? 7 : 0),
      max: weights.contact,
      missing: [
        ...(presence.email ? [] : ["Professional email"]),
        ...(presence.phone ? [] : ["Phone number"]),
      ],
    },
    {
      category: "Experience",
      score: scorePresence(presence.experience, weights.experience),
      max: weights.experience,
      missing: presence.experience ? [] : ["Experience or Work History section"],
    },
    {
      category: "Education",
      score: scorePresence(presence.education, weights.education),
      max: weights.education,
      missing: presence.education ? [] : ["Education or Degree section"],
    },
    {
      category: "Skills",
      score: scorePresence(presence.skills, weights.skills),
      max: weights.skills,
      missing: presence.skills ? [] : ["Skills or Abilities section"],
    },
    {
      category: "Summary/Profile",
      score: scorePresence(presence.summary, weights.summary),
      max: weights.summary,
      missing: presence.summary ? [] : ["Professional summary or objective"],
    },
    {
      category: "Projects / Certifications",
      score: (presence.projects ? 4 : 0) + (presence.certs ? 4 : 0),
      max: weights.projectsCerts,
      missing: [
        ...(presence.projects ? [] : ["Relevant projects or case studies"]),
        ...(presence.certs ? [] : ["Certifications or training"]),
      ],
    },
    {
      category: "Professional Links",
      score: scorePresence(presence.links, weights.links),
      max: weights.links,
      missing: presence.links ? [] : ["LinkedIn, portfolio, or professional website"],
    },
    {
      category: "Dates / Timeline",
      score: scorePresence(presence.dates, weights.dates),
      max: weights.dates,
      missing: presence.dates ? [] : ["Add dates for roles or education"],
    },
    {
      category: "Bullets / Formatting",
      score: scorePresence(presence.bullets, weights.bullets),
      max: weights.bullets,
      missing: presence.bullets ? [] : ["Use bullet points for readability"],
    },
    {
      category: "Action Verbs",
      score: scoreVerbs(text, weights.verbs),
      max: weights.verbs,
    },
    {
      category: "Length / Structure",
      score: scoreLength(words, weights.length),
      max: weights.length,
    },
    {
      category: "Recency",
      score: scoreRecency(text, weights.recency),
      max: weights.recency,
      missing: [],
    },
    {
      category: "Impact / Metrics",
      score: scorePresence(presence.impact, weights.impact),
      max: weights.impact,
      missing: presence.impact ? [] : ["Include measurable results (%, $, numbers)"],
    },
  ];

  const score = Math.min(
    100,
    breakdown.reduce((sum, b) => sum + b.score, 0)
  );

  const suggestions = Array.from(
    new Set(
      breakdown.flatMap((b) => b.missing || []).filter(Boolean)
    )
  );

  // Contextual smart suggestions
  if (!presence.links && text.toLowerCase().includes("manager"))
    suggestions.push("Add a LinkedIn profile to strengthen professional credibility.");
  if (presence.skills && !presence.projects)
    suggestions.push("Consider showcasing real examples or projects for stronger impact.");

  return {
    score: Math.round(score),
    breakdown,
    suggestions,
  };
}

async function callLLMForResume(textInput: string): Promise<LLMResumeAnalysis | null> {
  const response = await fetch("/api/ai/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "resumeAnalysis",
      payload: { text: textInput },
    }),
  });

  if (!response.ok) {
    // eslint-disable-next-line no-console
    console.error(
      "LLM resume analysis failed:",
      response.status,
      await response.text().catch(() => "")
    );
    return null;
  }

  const parsed = (await response.json()) as {
    overallScore: number;
    skillGaps: string[];
    suggestedRoles: string[];
    salaryRange: { min: number; max: number };
    improvements: string[];
  };

  if (
    typeof parsed?.overallScore !== "number" ||
    !Array.isArray(parsed.skillGaps) ||
    !Array.isArray(parsed.suggestedRoles) ||
    typeof parsed.salaryRange?.min !== "number" ||
    typeof parsed.salaryRange?.max !== "number" ||
    !Array.isArray(parsed.improvements)
  ) {
    // eslint-disable-next-line no-console
    console.error("LLM resume analysis returned invalid shape:", parsed);
    return null;
  }

  const overallScore = Math.min(100, Math.max(0, Math.round(parsed.overallScore)));

  return {
    overallScore,
    skillGaps: parsed.skillGaps.map(String),
    suggestedRoles: parsed.suggestedRoles.map(String),
    salaryRange: {
      min: parsed.salaryRange.min,
      max: parsed.salaryRange.max,
    },
    improvements: parsed.improvements.map(String),
  };
}

export async function scoreResume(textInput: string): Promise<ResumeScore> {
  // For now, we want to rely **only** on the LLM.
  // We still reuse the heuristic breakdown just for the category bars UI,
  // but the final score + suggestions come 100% from the model.
  const base = scoreResumeHeuristic(textInput);

  const llm = await callLLMForResume(textInput);

  if (!llm) {
    // If the LLM is not available, surface an error instead of silently
    // falling back to the old heuristic so it's obvious during testing.
    throw new Error("LLM resume analysis is not available (missing API key or request failed).");
  }

  return {
    ...base,
    score: llm.overallScore,
    suggestions: Array.from(new Set<string>(llm.improvements)),
    llm,
  };
}

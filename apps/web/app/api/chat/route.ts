import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, SubscriptionStatus, type PrismaClient } from "@workspace/db";
import { PLANS } from "@/lib/plans";
import { trackAgentEvent } from "@/lib/agent/tracker";
import {
  extractIntent,
  type JobIntentData,
  type ServiceIntentData,
  type ChatMessage as IntentExtractorMessage,
} from "./agent/intentExtractor";
import { jobSearchEngine } from "./agent/jobSearchEngine";
import { serviceSearchEngine } from "./agent/serviceSearchEngine";
import { rankJobsWithResumeMatch } from "./agent/scoreEngine";

import {
  buildSuggestionsPrompt,
  buildPlanLimitPrompt,
  buildScopeMismatchPrompt,
  buildPostResultNarrativePrompt,
  buildLocationClarifyPrompt,
} from "./agent/prompt/intent";
import {
  shouldBypassIntentLlm,
  checkJobSearchReadiness,
  checkScopeGuard,
  generateDbGroundedSuggestions,
  detectExplicitIntentOverride,
} from "./agent/orchestrator";

export const runtime = "nodejs";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatRole = "system" | "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ChatContext = {
  locale?: string;
  scope?: "auto" | "jobs" | "services" | "tasks";
  query?: string;
  categoryHint?: string;
  sessionId?: string;
};

type ChatRequestBody = {
  messages: ChatMessage[];
  context?: ChatContext;
};

type AgentIntent = "jobs" | "services" | "tasks";
type ConfidenceMode = "strong" | "moderate" | "weak";
type AgentAction = "chat" | "search";

type AgentResponse = {
  action: AgentAction;
  intent: AgentIntent;
  searchQuery: string;
  assistantText?: string;
  relatedPrompts: string[];
  results?: {
    type: AgentIntent;
    items: any[];
  };
  showResumeUploadCta?: boolean;
  resumeInsight?: {
    score: number;
    skillGaps: string[];
    improvements: string[];
    suggestedRoles?: string[];
  };
  intentMismatch?: { suggestedIntent: AgentIntent };
  debug?: Record<string, unknown>;
  planLimitReached?: boolean;
  upgradeUrl?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const FREE_DAILY_LIMIT = 20;
const SEARCH_PAGE_SIZE = 3;

// ─── Env ──────────────────────────────────────────────────────────────────────

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// ─── LLM caller ───────────────────────────────────────────────────────────────

function pickFirstString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
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

async function callLLM(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const url = getRequiredEnv("CHAT_API_URL");
  const apiKey = getRequiredEnv("DASHSCOPE_API_KEY");
  const model = "qwen3-32b";
  const temperature = opts?.temperature ?? 0.4;
  const max_tokens = opts?.maxTokens ?? 700;

  let response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: { messages },
      parameters: {
        temperature,
        top_p: 0.9,
        max_tokens,
        result_format: "message",
        enable_thinking: false,
      },
    }),
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
        temperature,
        top_p: 0.9,
        max_tokens,
        enable_thinking: false,
      }),
    });
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `LLM error ${response.status}${details ? `: ${details.slice(0, 300)}` : ""}`,
    );
  }

  const json = await response.json();
  const text = extractAssistantText(json);
  if (!text) throw new Error("LLM returned unexpected payload shape");
  return text;
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normalizeLocale(locale: string): "en" | "fr" | "ar" {
  const lower = locale.toLowerCase();
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("ar")) return "ar";
  return "en";
}

function normalizeSessionId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().slice(0, 120);
  return cleaned || null;
}

function normalizeForIntent(text: string): string {
  return text
    ? text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[.,!?;:()[\]{}'"`~@#$%^&*_+=<>|\\/.-]/g, " ")
        .replace(/\s+/g, " ")
    : "";
}



// ─── LLM-powered helpers ──────────────────────────────────────────────────────

/**
 * Asks the user for their job domain/category.
 * Prefers the LLM's own reply if it already wrote a clarification.
 * Falls back to a fresh LLM call, then a hardcoded string as last resort.
 */
async function buildLocationClarifyMessage(
  userMessage: string,
): Promise<string> {
  try {
    return await callLLM(
      [
        { role: "system", content: buildLocationClarifyPrompt() },
        { role: "user", content: userMessage },
      ],
      { temperature: 0.4, maxTokens: 80 },
    );
  } catch {
    if (/[\u0600-\u06ff]/.test(userMessage)) {
      return "في أي مدينة تفضل العمل؟ (الدار البيضاء، الرباط...) أو تفضل العمل عن بعد؟";
    }
    const lower = userMessage.toLowerCase();
    if (["je", "un", "une", "des", "dans", "pour", "avec", "cherche"].some(w => lower.includes(w))) {
      return "Dans quelle ville tu préfères travailler ? (Casablanca, Rabat...) Ou tu préfères le remote ou hybride ?";
    }
    return "Which city do you prefer? (Casablanca, Rabat...) Or do you prefer remote or hybrid?";
  }
}

async function buildJobClarifyMessage(
  userMessage: string,
): Promise<string> {
  try {
    return await callLLM(
      [
        {
          role: "system",
          content: `You are a helpful marketplace assistant.
The user wants a job but hasn't told you their field or domain yet.
Ask them naturally in their language what domain or field they work in.
Give 3-4 short examples (e.g. Tech, Finance, Health, Hospitality).
Keep it under 2 sentences. Sound like a helpful friend.
Return only the message text — no JSON, no preamble.`,
        },
        { role: "user", content: userMessage },
      ],
      { temperature: 0.4, maxTokens: 80 },
    );
  } catch {
    return "What field are you looking for? (Tech, Finance, Health, Hospitality...)";
  }
}

/**
 * Generates 3 smart contextual follow-up suggestions via the LLM.
 * The LLM detects language from the query automatically.
 */
async function generateSmartSuggestions(opts: {
  intent: AgentIntent;
  query: string;
  extractedData: JobIntentData | ServiceIntentData | null;
  items: any[];
}): Promise<string[]> {
  const context = {
    query: opts.query,
    intent: opts.intent,
    extractedFilters: opts.extractedData
      ? {
          category:
            (opts.extractedData as any).category ??
            (opts.extractedData as any).serviceCategory ??
            null,
          city: (opts.extractedData as any).city ?? null,
          locationRequirement:
            (opts.extractedData as any).locationRequirement ?? null,
          experienceLevel:
            (opts.extractedData as any).experienceLevel ?? null,
        }
      : null,
    topResults: opts.items.slice(0, 3).map((item: any) => ({
      title: item.title ?? null,
      city: item.city ?? null,
      category: item.category ?? item.serviceCategory ?? null,
    })),
  };

  try {
    const raw = await callLLM(
      [
        { role: "system", content: buildSuggestionsPrompt() },
        { role: "user", content: JSON.stringify(context) },
      ],
      { temperature: 0.7, maxTokens: 120 },
    );
    const first = raw.indexOf("[");
    const last = raw.lastIndexOf("]");
    if (first === -1 || last === -1) throw new Error("No JSON array in response");
    const parsed = JSON.parse(raw.slice(first, last + 1));
    if (
      Array.isArray(parsed) &&
      parsed.length >= 1 &&
      parsed.every((s) => typeof s === "string")
    ) {
      return parsed.slice(0, 3).filter(Boolean);
    }
    throw new Error("Invalid format");
  } catch {
    if (opts.intent === "jobs")
      return ["More job opportunities", "Filter by experience level", "Remote positions only"];
    if (opts.intent === "services")
      return ["Highest rated providers", "Filter by city", "Compare prices"];
    return ["More tasks available", "Filter by budget", "Urgent tasks only"];
  }
}

async function buildPlanLimitMessage(userMessage: string): Promise<string> {
  try {
    return await callLLM(
      [
        { role: "system", content: buildPlanLimitPrompt() },
        { role: "user", content: userMessage },
      ],
      { temperature: 0.3, maxTokens: 100 },
    );
  } catch {
    return "You've reached your free daily limit. Upgrade from the Plans page to continue.";
  }
}

async function buildScopeMismatchMessage(opts: {
  currentScope: string;
  suggestedIntent: string;
  userMessage: string;
}): Promise<string> {
  try {
    return await callLLM(
      [
        { role: "system", content: buildScopeMismatchPrompt() },
        {
          role: "user",
          content: JSON.stringify({
            currentScope: opts.currentScope,
            suggestedIntent: opts.suggestedIntent,
            userMessage: opts.userMessage,
          }),
        },
      ],
      { temperature: 0.3, maxTokens: 100 },
    );
  } catch {
    return `You're currently searching ${opts.currentScope}. Switch to ${opts.suggestedIntent}?`;
  }
}

async function generatePostResultNarrative(opts: {
  userMessage: string;
  searchQuery: string;
  intent: AgentIntent;
  items: any[];
  locale: string;
  hasResume: boolean;
}): Promise<string> {
  const context = {
    searchQuery: opts.searchQuery,
    intent: opts.intent,
    hasResume: opts.hasResume,
    topResults: opts.items.slice(0, 3).map((item, i) => ({
      position: i + 1,
      title: item.title,
      companyName: item.companyName ?? null,
      city: item.city ?? null,
      locationRequirement: item.locationRequirement ?? null,
      wage: item.wage ?? null,
      experienceLevel: item.experienceLevel ?? null,
      matchScore: item.matchScore ?? null,
      matchedSkills: item.resumeMatch?.matchedSkills ?? [],
      averageRating: item.averageRating ?? null,
      price: item.price ?? null,
    })),
  };

  const systemPrompt = buildPostResultNarrativePrompt();

  try {
    return await callLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(context) },
      ],
      { temperature: 0.5, maxTokens: 200 },
    );
  } catch {
    return "";
  }
}

async function localizeSuggestionLabels(opts: {
  rawSuggestions: Array<{ label: string; query: string }>;
  userQuery: string;
  intent: string;
}): Promise<string[]> {
  if (opts.rawSuggestions.length === 0) return [];

  const systemPrompt = `
You convert structured suggestion data into short natural-language labels.
Detect the language from the "userQuery" field and write ALL labels in that language.
Each label must be under 8 words — a short phrase a user would naturally say.

Input format: JSON array of { label: "type:value:category", query: string }
label types:
  "remote:Tech" → "Remote tech positions" / "Postes tech en remote" / "وظائف تقنية عن بعد"
  "hybrid:Finance" → "Hybrid finance roles" / "Postes finance hybrides"
  "city:Rabat:Tech" → "Tech jobs in Rabat" / "Emplois tech à Rabat" / "وظائف تقنية في الرباط"
  "level:junior:Tech" → "Junior tech roles" / "Postes tech junior" / "وظائف تقنية جونيور"
  "level:senior:Tech" → "Senior tech roles" / "Postes tech senior"

Output: JSON array of strings (labels only, same order as input). Nothing else.
`.trim();

  try {
    const raw = await callLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({ userQuery: opts.userQuery, suggestions: opts.rawSuggestions }) },
      ],
      { temperature: 0.3, maxTokens: 100 },
    );
    const first = raw.indexOf("[");
    const last = raw.lastIndexOf("]");
    if (first === -1 || last === -1) throw new Error("No array");
    const parsed = JSON.parse(raw.slice(first, last + 1));
    if (Array.isArray(parsed) && parsed.every((s: unknown) => typeof s === "string")) {
      return parsed.slice(0, 3);
    }
    throw new Error("Invalid format");
  } catch {
    return opts.rawSuggestions.map(s => s.query);
  }
}

// ─── Card mappers ─────────────────────────────────────────────────────────────

function buildJobResumeMatchExplanation(
  locale: string,
  input: {
    matchedSkillsCount: number;
    requiredSkillsCount: number;
    matchedSkills: string[];
  },
): string {
  const matched = input.matchedSkillsCount;
  const required = input.requiredSkillsCount;
  const sampleSkills = input.matchedSkills.slice(0, 3).join(", ");
  const lang = normalizeLocale(locale);
  if (lang === "fr") {
    if (required > 0)
      return `Correspondance compétences : ${matched}/${required}${sampleSkills ? ` (ex: ${sampleSkills})` : ""}.`;
    return "Correspondance sémantique et niveau d'expérience alignés avec votre CV.";
  }
  if (lang === "ar") {
    if (required > 0)
      return `تطابق المهارات: ${matched}/${required}${sampleSkills ? ` (مثل: ${sampleSkills})` : ""}.`;
    return "التطابق مبني على التشابه الدلالي وملاءمة مستوى الخبرة مع السيرة الذاتية.";
  }
  if (required > 0)
    return `Skill overlap: ${matched}/${required}${sampleSkills ? ` (e.g. ${sampleSkills})` : ""}.`;
  return "Match based on semantic similarity and experience alignment with your resume.";
}

function mapJobCards(
  items: any[],
  opts?: { locale?: string; includeResumeMatch?: boolean },
): any[] {
  const locale = opts?.locale ?? "en";
  const includeResumeMatch = opts?.includeResumeMatch ?? false;
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    companyName: item.companyName ?? null,
    companyImage: item.companyImage ?? null,
    wage: item.wage ?? null,
    stateAbbreviation: item.stateAbbreviation ?? null,
    city: item.city ?? null,
    type: item.type,
    experienceLevel: item.experienceLevel,
    locationRequirement: item.locationRequirement,
    category: item.category,
    matchScore:
      typeof item.matchPercent === "number"
        ? Math.round(item.matchPercent)
        : typeof item.blendedScore === "number"
          ? Math.round(Math.max(0, Math.min(1, item.blendedScore)) * 100)
          : typeof item.finalScore === "number"
            ? Math.round(Math.max(0, Math.min(1, item.finalScore)) * 100)
            : null,
    createdAt: item.createdAt,
    description: item.description ?? "",
    resumeMatch: includeResumeMatch
      ? {
          percent:
            typeof item.matchPercent === "number" ? item.matchPercent : null,
          matchedSkillsCount:
            typeof item.matchedSkillsCount === "number"
              ? item.matchedSkillsCount
              : 0,
          requiredSkillsCount:
            typeof item.requiredSkillsCount === "number"
              ? item.requiredSkillsCount
              : 0,
          matchedSkills: Array.isArray(item.matchedSkills)
            ? item.matchedSkills
            : [],
          explanation: buildJobResumeMatchExplanation(locale, {
            matchedSkillsCount:
              typeof item.matchedSkillsCount === "number"
                ? item.matchedSkillsCount
                : 0,
            requiredSkillsCount:
              typeof item.requiredSkillsCount === "number"
                ? item.requiredSkillsCount
                : 0,
            matchedSkills: Array.isArray(item.matchedSkills)
              ? item.matchedSkills
              : [],
          }),
        }
      : null,
  }));
}

function mapServiceCards(items: any[]): any[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    displayImage: item.displayImage ?? null,
    images: Array.isArray(item.images)
      ? item.images
      : typeof item.images === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(item.images);
              return Array.isArray(parsed)
                ? parsed.filter((x: unknown) => typeof x === "string")
                : [];
            } catch {
              return [];
            }
          })()
        : [],
    serviceCategory: item.serviceCategory,
    price: item.price,
    currency: "MAD",
    stateAbbreviation: item.stateAbbreviation ?? null,
    city: item.city ?? null,
    phoneNumber: item.phoneNumber ?? null,
    averageRating: item.averageRating ?? null,
    numberOfReviews: item.numberOfReviews ?? 0,
    matchPercent:
      typeof item.matchPercent === "number" ? item.matchPercent : null,
    matchScore:
      typeof item.matchPercent === "number"
        ? Math.round(item.matchPercent)
        : typeof item.finalScore === "number"
          ? Math.round(Math.max(0, Math.min(1, item.finalScore)) * 100)
          : null,
    selectionReasons: Array.isArray(item.selectionReasons)
      ? item.selectionReasons.slice(0, 3)
      : [],
    confidenceSignals: Array.isArray(item.confidenceSignals)
      ? item.confidenceSignals.slice(0, 3)
      : [],
  }));
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function evaluateConfidenceMode(
  items: Array<{ matchScore?: number | null }>,
): ConfidenceMode {
  const topScore = toNumberOrNull(items[0]?.matchScore) ?? 0;
  const secondScore = toNumberOrNull(items[1]?.matchScore) ?? 0;
  const scoreGap = topScore - secondScore;
  if (topScore >= 75 && scoreGap >= 10) return "strong";
  if (topScore >= 55) return "moderate";
  return "weak";
}

function shouldShowResumeUploadCta(hasResumeEmbedding: boolean): boolean {
  return !hasResumeEmbedding;
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

function getDayBucketUtc(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function isEligiblePaidUser(userId: string): Promise<boolean> {
  const db = prisma as any;
  const subscription = await db.subscription.findFirst({
    where: { userId, status: SubscriptionStatus.ACTIVE },
    select: { planId: true },
  });
  if (!subscription?.planId) return false;
  return [PLANS.BASIC.id, PLANS.PREMIUM.id].includes(subscription.planId);
}

async function getDailyUsageCount(
  userId: string,
  dayBucket: Date,
): Promise<number> {
  const db = prisma as any;
  const row = await db.aiChatUsage.findUnique({
    where: { userId_dayBucket: { userId, dayBucket } },
    select: { requests: true },
  });
  return row?.requests ?? 0;
}

async function incrementDailyUsage(
  userId: string,
  dayBucket: Date,
): Promise<void> {
  const db = prisma as any;
  await db.aiChatUsage.upsert({
    where: { userId_dayBucket: { userId, dayBucket } },
    create: { userId, dayBucket, requests: 1 },
    update: { requests: { increment: 1 } },
  });
}

function logChatDebug(step: string, payload: unknown): void {
  console.log(`[chat-debug] ${step}`, payload);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const includeDebug =
      process.env.CHAT_DEBUG === "true" ||
      process.env.NODE_ENV !== "production";

    const body = (await req.json()) as ChatRequestBody;
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    if (!messages.length) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }

    const lastUser =
      [...messages]
        .reverse()
        .find(
          (m) => m?.role === "user" && typeof m.content === "string",
        )?.content ??
      body.context?.query ??
      "";

    const locale = body.context?.locale || "en";

    // ── Auth & rate limiting ──────────────────────────────────────────────────
    const session = await auth();
    const userId = session?.user?.id;
    const sessionId =
      normalizeSessionId(body.context?.sessionId) ||
      (userId
        ? `agent-${userId}-${Date.now()}`
        : `agent-anon-${Date.now()}`);

    if (userId) {
      const eligiblePaid = await isEligiblePaidUser(userId);
      if (!eligiblePaid) {
        const dayBucket = getDayBucketUtc();
        const used = await getDailyUsageCount(userId, dayBucket);
        if (used >= FREE_DAILY_LIMIT) {
          const limitMessage = await buildPlanLimitMessage(lastUser);
          return NextResponse.json({
            action: "chat",
            intent: "jobs",
            searchQuery: "",
            assistantText: limitMessage,
            relatedPrompts: [],
            planLimitReached: true,
            upgradeUrl: "/subscription",
          } satisfies AgentResponse);
        }
        await incrementDailyUsage(userId, dayBucket);
      }
    }

    // ── Fetch resume data ─────────────────────────────────────────────────────
    const userResumeData = userId
      ? await (prisma as any).user.findUnique({
          where: { id: userId },
          select: {
            resumeEmbedding: true,
            autoApplyKeywords: true,
            resumeUrl: true,
            resumeJobTitle: true,
          },
        })
      : null;

    const hasResumeEmbedding =
      Array.isArray(userResumeData?.resumeEmbedding) &&
      userResumeData.resumeEmbedding.length > 0;

    const resumeProfile = hasResumeEmbedding
      ? {
          job_title: (userResumeData?.resumeJobTitle as string | undefined) ?? null,
          skills:
            (userResumeData?.autoApplyKeywords as string[] | undefined) ?? [],
          experience_level: null,
        }
      : null;

    const scope = body.context?.scope;
    const quickQuery = (lastUser || "").trim();

    const bypassLlm = shouldBypassIntentLlm({
      scope,
      query: quickQuery,
    });

    // ── Intent extraction ─────────────────────────────────────────────────────
    const extractorHistory: IntentExtractorMessage[] = messages
      .filter((m): m is IntentExtractorMessage => {
        return (
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0
        );
      })
      .slice(-4);

    let aiResult = bypassLlm
      ? scope === "services"
        ? {
            type: "search_service" as const,
            reply: "",
            intent_data: { query: quickQuery },
            clarify_field: null,
          }
        : scope === "tasks"
          ? {
              type: "search_task" as const,
              reply: "",
              intent_data: { query: quickQuery },
              clarify_field: null,
            }
          : {
              type: "search_job" as const,
              reply: "",
              intent_data: { query: quickQuery },
              clarify_field: null,
            }
      : await extractIntent({
          locale,
          scope,
          categoryHint: body.context?.categoryHint,
          message: lastUser,
          history: extractorHistory,
          resumeProfile: resumeProfile as any,
        });

    logChatDebug("intent_extracted", {
      message: lastUser,
      type: aiResult.type,
      reply: aiResult.reply,
      intent_data: aiResult.intent_data,
      bypassed: bypassLlm,
    });

    await trackAgentEvent({
      userId,
      sessionId,
      name: "AGENT_INTENT_TRIGGERED",
      intent: aiResult.type,
      data: {
        locale,
        scope: body.context?.scope ?? "auto",
        categoryHint: body.context?.categoryHint ?? null,
        query: (lastUser || "").slice(0, 500),
        extractedIntentData: aiResult.intent_data ?? null,
        bypassed: bypassLlm,
      },
    });

    const pinnedScope = body.context?.scope;

    // Force-correct the intent type when user query contains explicit
    // service/task keywords but LLM stayed in the pinned scope
    if (pinnedScope && pinnedScope !== "auto" && aiResult.type !== "conversation") {
      const forcedType = detectExplicitIntentOverride(quickQuery, pinnedScope);
      if (forcedType && forcedType !== aiResult.type) {
        aiResult = { ...aiResult, type: forcedType };
      }
    }
    if (
      pinnedScope &&
      pinnedScope !== "auto" &&
      aiResult.type !== "conversation"
    ) {
      const guardResult = checkScopeGuard({
        pinnedScope,
        extractedType: aiResult.type,
        query: quickQuery,
      });

      if (guardResult.mismatch) {
        if (guardResult.isExplicit) {
          // Auto-switch: force the intent type without asking
          const typeMap: Record<string, string> = {
            services: "search_service",
            tasks: "search_task",
            jobs: "search_job",
          };
          aiResult = { ...aiResult, type: typeMap[guardResult.suggestedIntent] as any };
          // Fall through to the search blocks with corrected type
        } else {
          // Ask user to confirm the switch
          const mismatchMessage = await buildScopeMismatchMessage({
            currentScope: pinnedScope,
            suggestedIntent: guardResult.suggestedIntent,
            userMessage: lastUser,
          });

          return NextResponse.json({
            action: "chat",
            intent: pinnedScope as AgentIntent,
            searchQuery: "",
            assistantText: mismatchMessage,
            relatedPrompts: [
              `Yes, search ${guardResult.suggestedIntent}`,
              `No, keep searching ${pinnedScope}`,
            ],
            intentMismatch: { suggestedIntent: guardResult.suggestedIntent as AgentIntent },
          } satisfies AgentResponse);
        }
      }
    }

    // ── Conversation ──────────────────────────────────────────────────────────
    if (aiResult.type === "conversation") {
      return NextResponse.json({
        action: "chat",
        intent: "jobs",
        searchQuery: "",
        assistantText: aiResult.reply || "How can I help you today?",
        relatedPrompts: [],
        debug: includeDebug
          ? { stage: "conversation", extracted_intent: aiResult }
          : undefined,
      } satisfies AgentResponse);
    }

    if (aiResult.type === "search_job" && aiResult.intent_data) {
      const intentData = aiResult.intent_data as JobIntentData;

      console.log("[readiness-debug]", {
        category: intentData.category,
        city: intentData.city,
        locationRequirement: intentData.locationRequirement,
        stateAbbreviation: intentData.stateAbbreviation,
        query: intentData.query,
      });

      const readiness = checkJobSearchReadiness(intentData);
      if (!readiness.ready) {
        const llmReply = aiResult.reply?.trim();
        let clarifyText: string;
        if (readiness.missingField === "location") {
          const locationQ = await buildLocationClarifyMessage(lastUser);
          clarifyText = llmReply
            ? `${llmReply} ${locationQ}`
            : locationQ;
        } else {
          clarifyText = await buildJobClarifyMessage(lastUser);
        }
        return NextResponse.json({
          action: "chat",
          intent: "jobs",
          searchQuery: "",
          assistantText: clarifyText,
          relatedPrompts: [],
        } satisfies AgentResponse);
      }

      // ── Search engine ─────────────────────────────────────────────────────
      const searchResult = await jobSearchEngine(
        prisma as PrismaClient,
        intentData,
      );
      const searchQuery = intentData.query?.trim() || lastUser.trim();

      const personalizedRanked = hasResumeEmbedding
        ? rankJobsWithResumeMatch(searchResult.topResults as any, {
            resumeEmbedding: userResumeData.resumeEmbedding as number[],
            resumeSkills:
              (userResumeData?.autoApplyKeywords as string[] | undefined) ?? [],
          })
        : searchResult.topResults;

      const cards = mapJobCards(
        personalizedRanked.slice(0, SEARCH_PAGE_SIZE),
        { locale, includeResumeMatch: hasResumeEmbedding },
      );
      const confidenceMode = evaluateConfidenceMode(cards);

      const assistantText = cards.length > 0
        ? await generatePostResultNarrative({
            userMessage: lastUser,
            searchQuery,
            intent: "jobs",
            items: cards,
            locale,
            hasResume: hasResumeEmbedding,
          })
        : aiResult.reply?.trim() ?? "";

      const rawSuggestions = generateDbGroundedSuggestions({
        topResults: cards,
        suggestionPool: searchResult.suggestionPool,
        intentData,
      });

      const localizedLabels = await localizeSuggestionLabels({
        rawSuggestions,
        userQuery: searchQuery,
        intent: "jobs",
      });

      const relatedPrompts = localizedLabels.length > 0
        ? localizedLabels
        : rawSuggestions.map(s => s.query);

      await trackAgentEvent({
        userId,
        sessionId,
        name: "AGENT_SEARCH_RESULTS_RETURNED",
        intent: "search_job",
        data: {
          query: searchQuery,
          resultsCount: cards.length,
          confidenceMode,
          hasResumeEmbedding,
          filtersApplied: searchResult.filtersApplied,
          topIds: cards.map((item) => item.id),
        },
      });

      logChatDebug("job_search_pipeline", {
        extracted_query: searchQuery,
        filters_applied: searchResult.filtersApplied,
        result_count: cards.length,
        top_ids: cards.map((card) => card.id),
        used_resume_matching: hasResumeEmbedding,
        assistant_text: assistantText,
      });

      return NextResponse.json({
        action: "search",
        intent: "jobs",
        searchQuery,
        assistantText,
        results: { type: "jobs", items: cards },
        showResumeUploadCta: shouldShowResumeUploadCta(hasResumeEmbedding),
        relatedPrompts,
        debug: includeDebug
            ? {
              stage: "search_job",
              extracted_intent: aiResult,
              filters_applied: searchResult.filtersApplied,
              bypassed: bypassLlm,
              ranking_top3: personalizedRanked.slice(0, 3).map((item: any) => ({
                id: item.id,
                title: item.title,
                finalScore: item.finalScore,
                blendedScore: item.blendedScore,
              })),
            }
          : undefined,
      } satisfies AgentResponse);
    }

    // ── Service search ────────────────────────────────────────────────────────
    if (aiResult.type === "search_service" && aiResult.intent_data) {
      const intentData = aiResult.intent_data as ServiceIntentData;
      const searchResult = await serviceSearchEngine(
        prisma as PrismaClient,
        intentData,
      );
      const searchQuery = intentData.query?.trim() || lastUser.trim();
      const cards = mapServiceCards(searchResult.topResults);
      const confidenceMode = evaluateConfidenceMode(cards);

      const assistantText = cards.length > 0
        ? await generatePostResultNarrative({
            userMessage: lastUser,
            searchQuery,
            intent: "services",
            items: cards,
            locale,
            hasResume: false,
          })
        : aiResult.reply?.trim() ?? "";

      const relatedPrompts = await generateSmartSuggestions({
        intent: "services",
        query: searchQuery,
        extractedData: intentData,
        items: cards,
      });

      await trackAgentEvent({
        userId,
        sessionId,
        name: "AGENT_SEARCH_RESULTS_RETURNED",
        intent: "search_service",
        data: {
          query: searchQuery,
          resultsCount: cards.length,
          confidenceMode,
          filtersApplied: searchResult.filtersApplied,
          topIds: cards.map((item) => item.id),
        },
      });

      logChatDebug("service_search_pipeline", {
        extracted_query: searchQuery,
        filters_applied: searchResult.filtersApplied,
        result_count: cards.length,
        top_ids: cards.map((card) => card.id),
      });

      return NextResponse.json({
        action: "search",
        intent: "services",
        searchQuery,
        assistantText,
        results: { type: "services", items: cards },
        relatedPrompts,
        debug: includeDebug
          ? {
              stage: "search_service",
              extracted_intent: aiResult,
              filters_applied: searchResult.filtersApplied,
            }
          : undefined,
      } satisfies AgentResponse);
    }

    // ── Task search ───────────────────────────────────────────────────────────
    if (aiResult.type === "search_task" && aiResult.intent_data) {
      const searchQuery =
        (aiResult.intent_data as any).query?.trim() || lastUser.trim();
      const assistantText = aiResult.reply?.trim() ?? "";

      const relatedPrompts = await generateSmartSuggestions({
        intent: "tasks",
        query: searchQuery,
        extractedData: null,
        items: [],
      });

      await trackAgentEvent({
        userId,
        sessionId,
        name: "AGENT_SEARCH_RESULTS_RETURNED",
        intent: "search_task",
        data: { query: searchQuery, resultsCount: 0 },
      });

      return NextResponse.json({
        action: "search",
        intent: "tasks",
        searchQuery,
        assistantText,
        relatedPrompts,
      } satisfies AgentResponse);
    }

    // ── Fallback ──────────────────────────────────────────────────────────────
    return NextResponse.json({
      action: "search",
      intent: "jobs",
      searchQuery: quickQuery || "jobs",
      assistantText: "",
      relatedPrompts: [],
      debug: includeDebug
        ? { stage: "fallback", extracted_intent: aiResult }
        : undefined,
    } satisfies AgentResponse);
  } catch (err: any) {
    console.error("[chat/route] Unhandled error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 },
    );
  }
}
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, SubscriptionStatus, type PrismaClient } from "@workspace/db";
import { PLANS } from "@/lib/plans";
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
} from "./agent/prompt/intent";

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
  results?: { type: AgentIntent; items: any[] };
  resumeUploadCta?: { title: string; description: string; buttonLabel: string };
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
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      input: { messages },
      parameters: { temperature, top_p: 0.9, max_tokens, result_format: "message", enable_thinking: false },
    }),
  });

  if (!response.ok) {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature, top_p: 0.9, max_tokens, enable_thinking: false }),
    });
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`LLM error ${response.status}${details ? `: ${details.slice(0, 300)}` : ""}`);
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

// ─── Heuristic classifier (bypass decision only) ──────────────────────────────

function countPhraseHits(text: string, phrases: string[]): number {
  let score = 0;
  for (const phrase of phrases) {
    if (text.includes(phrase)) score += 1;
  }
  return score;
}

function classifyTurnIntent(text: string): "chat" | "search" {
  const normalized = normalizeForIntent(text);
  if (!normalized) return "chat";
  const tokens = normalized.split(" ").filter(Boolean);

  const greetingPhrases = [
    "hi", "hey", "hello", "yo", "good morning", "good afternoon", "good evening",
    "how are you", "who are you", "what can you do", "thanks", "thank you",
    "salut", "bonjour", "bonsoir", "coucou", "ca va", "qui es tu", "merci",
    "مرحبا", "اهلا", "أهلا", "سلام", "السلام عليكم", "كيف حالك", "شكرا", "شكرًا",
  ];
  const searchActionPhrases = [
    "find", "search", "looking for", "look for", "show me", "i need", "i want", "hire", "apply",
    "cherche", "recherche", "trouve", "montre moi", "jai besoin", "je veux",
    "بغيت", "كنقلب", "ابحث", "أبحث", "اريد", "أريد", "احتاج", "أحتاج", "وريني",
  ];
  const marketplaceNouns = [
    "job", "jobs", "work", "service", "services", "task", "tasks", "freelance",
    "emploi", "emplois", "travail", "mission", "tache", "taches",
    "وظيفة", "وظائف", "خدمة", "خدمات", "مهمة", "مهام", "عمل",
  ];
  const constraintSignals = [
    "remote", "onsite", "hybrid", "casablanca", "rabat", "marrakech", "tangier",
    "budget", "salary", "wage", "prix", "salaire", "price", "عن بعد",
  ];

  let chatScore = 0;
  let searchScore = 0;

  chatScore += countPhraseHits(normalized, greetingPhrases);
  searchScore += countPhraseHits(normalized, searchActionPhrases);
  searchScore += countPhraseHits(normalized, marketplaceNouns) * 2;
  searchScore += countPhraseHits(normalized, constraintSignals);

  if (/\b\d{2,}\b/.test(normalized)) searchScore += 1;
  if (/(dh|mad|usd|eur|\$|€)/.test(text.toLowerCase())) searchScore += 1;

  const hasMarketplaceNoun = marketplaceNouns.some((w) => tokens.includes(w));
  const hasSearchAction = searchActionPhrases.some((p) => normalized.includes(p));
  if (!hasMarketplaceNoun && !hasSearchAction && tokens.length <= 4) chatScore += 2;

  if (
    normalized.includes("who are you") || normalized.includes("what can you do") ||
    normalized.includes("qui es tu") || normalized.includes("شنو تقدر") ||
    normalized.includes("ماذا تستطيع")
  ) chatScore += 3;

  if (searchScore < 2) chatScore += 1;
  return searchScore >= chatScore + 1 ? "search" : "chat";
}

function isGreetingOrSmallTalk(text: string): boolean {
  return classifyTurnIntent(text) === "chat";
}

function isLikelySearchRequest(text: string): boolean {
  return classifyTurnIntent(text) === "search";
}

// ─── Category inference ───────────────────────────────────────────────────────

function inferCategoryFromText(query: string, skills: string[]): string | null {
  const text = `${query} ${skills.join(" ")}`;
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const rules: Array<{ category: string; keywords: string[] }> = [
    { category: "Tech", keywords: ["developer", "developpeur", "dev", "software", "frontend", "backend", "fullstack", "data", "engineer", "it", "tech", "programmer", "مطور", "برمجة", "تقنية"] },
    { category: "Finance", keywords: ["finance", "accountant", "accounting", "comptable", "audit", "bank", "محاسب", "مالية", "بنك"] },
    { category: "Health", keywords: ["doctor", "nurse", "medical", "sante", "health", "pharmac", "طبيب", "ممرض", "صحة", "دكتور"] },
    { category: "Legal", keywords: ["lawyer", "legal", "juridique", "avocat", "notaire", "محامي", "قانون"] },
    { category: "Education", keywords: ["teacher", "prof", "education", "formateur", "instructor", "معلم", "أستاذ", "تعليم"] },
    { category: "Construction", keywords: ["construction", "builder", "mason", "maçon", "plumbing", "electric", "بناء", "مقاول"] },
    { category: "Hospitality", keywords: ["hotel", "restaurant", "hospitality", "serveur", "waiter", "cuisine", "فندق", "استقبال", "مطعم", "نادل", "طباخ"] },
    { category: "CallCenter", keywords: ["call center", "customer support", "teleconseiller", "centre d'appel", "دعم عملاء", "مركز اتصال"] },
    { category: "Auto", keywords: ["mechanic", "mecanicien", "garage", "automotive", "auto", "car repair", "ميكانيكي", "كراج"] },
    { category: "Cleaning", keywords: ["cleaning", "cleaner", "menage", "nettoyage", "نظافة", "تنظيف"] },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((k) => normalized.includes(k))) return rule.category;
  }
  return null;
}

// ─── Search readiness ─────────────────────────────────────────────────────────

/**
 * What "ready" means for a job search:
 *
 * We need at least TWO pieces of information before touching the DB:
 *  1. A detectable domain/category — so the search engine has a domain filter.
 *     Without it, jobSearchEngine pulls 120 random published jobs.
 *  2. A location signal — city, locationRequirement (remote/hybrid/in_office),
 *     or stateAbbreviation. Without it results have no geographic relevance.
 *
 * The LLM prompt already instructs the model to ask for missing fields,
 * but this function is the server-side enforcement that runs on ALL paths
 * including the bypass path where no LLM was called.
 */
type ReadinessResult =
  | { ready: true }
  | { ready: false; missingField: "category" | "location" | "both" };

function checkJobSearchReadiness(intentData: JobIntentData): ReadinessResult {
  const hasCategory = !!(
    intentData.category ||
    inferCategoryFromText(intentData.query ?? "", intentData.skills ?? [])
  );

  const hasLocation = !!(
    intentData.city?.trim() ||
    intentData.locationRequirement?.trim() ||
    intentData.stateAbbreviation?.trim()
  );

  if (!hasCategory && !hasLocation) return { ready: false, missingField: "both" };
  if (!hasCategory) return { ready: false, missingField: "category" };
  if (!hasLocation) return { ready: false, missingField: "location" };
  return { ready: true };
}

// ─── Clarify message ──────────────────────────────────────────────────────────

/**
 * Generates a targeted clarification question based on exactly which field is missing.
 * The LLM detects the user's language from their message and responds in it.
 * Priority: use aiResult.reply if it already contains a clarification → then LLM call → fallback string.
 */
async function buildJobClarifyMessage(
  userMessage: string,
  missingField: "category" | "location" | "both",
  existingReply?: string,
): Promise<string> {
  if (existingReply?.trim()) return existingReply.trim();

  const systemPrompts: Record<"category" | "location" | "both", string> = {
    both: `You are a helpful marketplace assistant.
The user wants a job but hasn't told you their field or their preferred location.
Ask them naturally in their language for both: what domain they work in and where they want to work (city or remote).
Give 3-4 domain examples and mention remote as a location option.
Keep it under 3 sentences. Sound like a helpful friend.
Return only the message text — no JSON, no preamble.`,

    category: `You are a helpful marketplace assistant.
The user wants a job but hasn't told you their field or domain.
Ask them naturally in their language what domain or field they work in.
Give 3-4 short examples (Tech, Finance, Health, Hospitality).
Keep it under 2 sentences. Sound like a helpful friend.
Return only the message text — no JSON, no preamble.`,

    location: `You are a helpful marketplace assistant.
The user wants a job but hasn't told you where they want to work.
Ask them naturally in their language which city they prefer, or if they are open to remote work.
Keep it under 2 sentences. Sound like a helpful friend.
Return only the message text — no JSON, no preamble.`,
  };

  const fallbacks: Record<"category" | "location" | "both", string> = {
    both: "What field are you in and where would you like to work? (city or remote)",
    category: "What field are you looking for? (Tech, Finance, Health, Hospitality...)",
    location: "Which city are you looking in, or are you open to remote work?",
  };

  try {
    return await callLLM(
      [
        { role: "system", content: systemPrompts[missingField] },
        { role: "user", content: userMessage },
      ],
      { temperature: 0.4, maxTokens: 90 },
    );
  } catch {
    return fallbacks[missingField];
  }
}

// ─── Smart suggestions ────────────────────────────────────────────────────────

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
          category: (opts.extractedData as any).category ?? (opts.extractedData as any).serviceCategory ?? null,
          city: (opts.extractedData as any).city ?? null,
          locationRequirement: (opts.extractedData as any).locationRequirement ?? null,
          experienceLevel: (opts.extractedData as any).experienceLevel ?? null,
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
    if (first === -1 || last === -1) throw new Error("No JSON array");
    const parsed = JSON.parse(raw.slice(first, last + 1));
    if (Array.isArray(parsed) && parsed.length >= 1 && parsed.every((s) => typeof s === "string")) {
      return parsed.slice(0, 3).filter(Boolean);
    }
    throw new Error("Invalid format");
  } catch {
    if (opts.intent === "jobs") return ["More job opportunities", "Filter by experience level", "Remote positions only"];
    if (opts.intent === "services") return ["Highest rated providers", "Filter by city", "Compare prices"];
    return ["More tasks available", "Filter by budget", "Urgent tasks only"];
  }
}

async function buildPlanLimitMessage(userMessage: string): Promise<string> {
  try {
    return await callLLM(
      [{ role: "system", content: buildPlanLimitPrompt() }, { role: "user", content: userMessage }],
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
        { role: "user", content: JSON.stringify(opts) },
      ],
      { temperature: 0.3, maxTokens: 100 },
    );
  } catch {
    return `You're currently searching ${opts.currentScope}. Switch to ${opts.suggestedIntent}?`;
  }
}

// ─── Explicit intent switch ───────────────────────────────────────────────────

function isExplicitIntentSwitch(query: string, targetType: string): boolean {
  const q = normalizeForIntent(query);
  const serviceKeywords = ["plumber", "electrician", "cleaner", "mechanic", "painter", "carpenter", "plombier", "électricien", "nettoyage", "mécanicien", "سباك", "كهربائي", "نجار", "ميكانيكي", "service", "services", "خدمة", "خدمات"];
  const taskKeywords = ["task", "tasks", "mission", "gig", "freelance", "tâche", "tâches", "مهمة", "مهام"];
  const jobKeywords = ["job", "jobs", "work", "hire", "recruit", "employ", "emploi", "emplois", "travail", "poste", "وظيفة", "وظائف", "عمل"];
  if (targetType === "search_service") return serviceKeywords.some((k) => q.includes(k));
  if (targetType === "search_task") return taskKeywords.some((k) => q.includes(k));
  if (targetType === "search_job") return jobKeywords.some((k) => q.includes(k));
  return false;
}

// ─── Card mappers ─────────────────────────────────────────────────────────────

function buildJobResumeMatchExplanation(locale: string, input: { matchedSkillsCount: number; requiredSkillsCount: number; matchedSkills: string[] }): string {
  const matched = input.matchedSkillsCount;
  const required = input.requiredSkillsCount;
  const sampleSkills = input.matchedSkills.slice(0, 3).join(", ");
  const lang = normalizeLocale(locale);
  if (lang === "fr") {
    if (required > 0) return `Correspondance compétences : ${matched}/${required}${sampleSkills ? ` (ex: ${sampleSkills})` : ""}.`;
    return "Correspondance sémantique et niveau d'expérience alignés avec votre CV.";
  }
  if (lang === "ar") {
    if (required > 0) return `تطابق المهارات: ${matched}/${required}${sampleSkills ? ` (مثل: ${sampleSkills})` : ""}.`;
    return "التطابق مبني على التشابه الدلالي وملاءمة مستوى الخبرة مع السيرة الذاتية.";
  }
  if (required > 0) return `Skill overlap: ${matched}/${required}${sampleSkills ? ` (e.g. ${sampleSkills})` : ""}.`;
  return "Match based on semantic similarity and experience alignment with your resume.";
}

function mapJobCards(items: any[], opts?: { locale?: string; includeResumeMatch?: boolean }): any[] {
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
      typeof item.matchPercent === "number" ? Math.round(item.matchPercent)
      : typeof item.blendedScore === "number" ? Math.round(Math.max(0, Math.min(1, item.blendedScore)) * 100)
      : typeof item.finalScore === "number" ? Math.round(Math.max(0, Math.min(1, item.finalScore)) * 100)
      : null,
    createdAt: item.createdAt,
    description: item.description ?? "",
    resumeMatch: includeResumeMatch
      ? {
          percent: typeof item.matchPercent === "number" ? item.matchPercent : null,
          matchedSkillsCount: typeof item.matchedSkillsCount === "number" ? item.matchedSkillsCount : 0,
          requiredSkillsCount: typeof item.requiredSkillsCount === "number" ? item.requiredSkillsCount : 0,
          matchedSkills: Array.isArray(item.matchedSkills) ? item.matchedSkills : [],
          explanation: buildJobResumeMatchExplanation(locale, {
            matchedSkillsCount: typeof item.matchedSkillsCount === "number" ? item.matchedSkillsCount : 0,
            requiredSkillsCount: typeof item.requiredSkillsCount === "number" ? item.requiredSkillsCount : 0,
            matchedSkills: Array.isArray(item.matchedSkills) ? item.matchedSkills : [],
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
        ? (() => { try { const p = JSON.parse(item.images); return Array.isArray(p) ? p.filter((x: unknown) => typeof x === "string") : []; } catch { return []; } })()
        : [],
    serviceCategory: item.serviceCategory,
    price: item.price,
    currency: "MAD",
    stateAbbreviation: item.stateAbbreviation ?? null,
    city: item.city ?? null,
    phoneNumber: item.phoneNumber ?? null,
    averageRating: item.averageRating ?? null,
    numberOfReviews: item.numberOfReviews ?? 0,
    matchPercent: typeof item.matchPercent === "number" ? item.matchPercent : null,
    matchScore:
      typeof item.matchPercent === "number" ? Math.round(item.matchPercent)
      : typeof item.finalScore === "number" ? Math.round(Math.max(0, Math.min(1, item.finalScore)) * 100)
      : null,
    selectionReasons: Array.isArray(item.selectionReasons) ? item.selectionReasons.slice(0, 3) : [],
    confidenceSignals: Array.isArray(item.confidenceSignals) ? item.confidenceSignals.slice(0, 3) : [],
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

function evaluateConfidenceMode(items: Array<{ matchScore?: number | null }>): ConfidenceMode {
  const topScore = toNumberOrNull(items[0]?.matchScore) ?? 0;
  const secondScore = toNumberOrNull(items[1]?.matchScore) ?? 0;
  const scoreGap = topScore - secondScore;
  if (topScore >= 75 && scoreGap >= 10) return "strong";
  if (topScore >= 55) return "moderate";
  return "weak";
}

function buildResumeUploadCta(): { title: string; description: string; buttonLabel: string } {
  return { title: "resume_cta_title", description: "resume_cta_description", buttonLabel: "resume_cta_button" };
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

async function getDailyUsageCount(userId: string, dayBucket: Date): Promise<number> {
  const db = prisma as any;
  const row = await db.aiChatUsage.findUnique({
    where: { userId_dayBucket: { userId, dayBucket } },
    select: { requests: true },
  });
  return row?.requests ?? 0;
}

async function incrementDailyUsage(userId: string, dayBucket: Date): Promise<void> {
  const db = prisma as any;
  await db.aiChatUsage.upsert({
    where: { userId_dayBucket: { userId, dayBucket } },
    create: { userId, dayBucket, requests: 1 },
    update: { requests: { increment: 1 } },
  });
}

// ─── Event tracking ───────────────────────────────────────────────────────────

async function trackAgentEvent(args: {
  userId?: string | null;
  sessionId: string;
  name: "AGENT_INTENT_TRIGGERED" | "AGENT_SEARCH_RESULTS_RETURNED";
  intent: "conversation" | "search_job" | "search_service" | "search_task";
  data?: Record<string, unknown>;
}): Promise<void> {
  if (!args.userId) return;
  try {
    const db = prisma as any;
    await db.event.create({
      data: { userId: args.userId, sessionId: args.sessionId, name: args.name, intent: args.intent, source: "agent_chat", data: args.data ?? {} },
    });
  } catch (error) {
    console.error("Failed to track agent event", error);
  }
}

function logChatDebug(step: string, payload: unknown): void {
  console.log(`[chat-debug] ${step}`, payload);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const includeDebug = process.env.CHAT_DEBUG === "true" || process.env.NODE_ENV !== "production";
    const body = (await req.json()) as ChatRequestBody;
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    if (!messages.length) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }

    const lastUser =
      [...messages].reverse().find((m) => m?.role === "user" && typeof m.content === "string")?.content ??
      body.context?.query ??
      "";

    const locale = body.context?.locale || "en";

    // ── Auth & rate limiting ──────────────────────────────────────────────────
    const session = await auth();
    const userId = session?.user?.id;
    const sessionId =
      normalizeSessionId(body.context?.sessionId) ||
      (userId ? `agent-${userId}-${Date.now()}` : `agent-anon-${Date.now()}`);

    if (userId) {
      const eligiblePaid = await isEligiblePaidUser(userId);
      if (!eligiblePaid) {
        const dayBucket = getDayBucketUtc();
        const used = await getDailyUsageCount(userId, dayBucket);
        if (used >= FREE_DAILY_LIMIT) {
          const limitMessage = await buildPlanLimitMessage(lastUser);
          return NextResponse.json({
            action: "chat", intent: "jobs", searchQuery: "",
            assistantText: limitMessage, relatedPrompts: [],
            planLimitReached: true, upgradeUrl: "/subscription",
          } satisfies AgentResponse);
        }
        await incrementDailyUsage(userId, dayBucket);
      }
    }

    // ── Fetch resume data ─────────────────────────────────────────────────────
    const userResumeData = userId
      ? await (prisma as any).user.findUnique({
          where: { id: userId },
          select: { resumeEmbedding: true, autoApplyKeywords: true, resumeUrl: true },
        })
      : null;

    const hasResumeEmbedding =
      Array.isArray(userResumeData?.resumeEmbedding) && userResumeData.resumeEmbedding.length > 0;

    const resumeProfile = hasResumeEmbedding
      ? { job_title: null, skills: (userResumeData?.autoApplyKeywords as string[] | undefined) ?? [], experience_level: null }
      : null;

    // ── Bypass decision ───────────────────────────────────────────────────────
    const scope = body.context?.scope;
    const quickQuery = (lastUser || "").trim();
    const wordCount = quickQuery.split(" ").filter(Boolean).length;

    const shouldBypassIntentLlm =
      Boolean(scope && scope !== "auto") &&
      isLikelySearchRequest(quickQuery) &&
      !isGreetingOrSmallTalk(quickQuery) &&
      wordCount > 3;

    // ── Intent extraction ─────────────────────────────────────────────────────
    const extractorHistory: IntentExtractorMessage[] = messages
      .filter((m): m is IntentExtractorMessage => {
        return (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0;
      })
      .slice(-4);

    const aiResult = shouldBypassIntentLlm
      ? scope === "services"
        ? { type: "search_service" as const, reply: "", intent_data: { query: quickQuery }, clarify_field: null }
        : scope === "tasks"
          ? { type: "search_task" as const, reply: "", intent_data: { query: quickQuery }, clarify_field: null }
          : { type: "search_job" as const, reply: "", intent_data: { query: quickQuery }, clarify_field: null }
      : await extractIntent({
          locale, scope,
          categoryHint: body.context?.categoryHint,
          message: lastUser,
          history: extractorHistory,
          resumeProfile: resumeProfile as any,
        });

    logChatDebug("intent_extracted", {
      message: lastUser, type: aiResult.type, reply: aiResult.reply,
      intent_data: aiResult.intent_data, bypassed: shouldBypassIntentLlm,
    });

    await trackAgentEvent({
      userId, sessionId,
      name: "AGENT_INTENT_TRIGGERED",
      intent: aiResult.type,
      data: {
        locale, scope: body.context?.scope ?? "auto",
        categoryHint: body.context?.categoryHint ?? null,
        query: (lastUser || "").slice(0, 500),
        extractedIntentData: aiResult.intent_data ?? null,
        bypassed: shouldBypassIntentLlm,
      },
    });

    // ── Scope guard ───────────────────────────────────────────────────────────
    const pinnedScope = body.context?.scope;
    if (pinnedScope && pinnedScope !== "auto" && aiResult.type !== "conversation") {
      const scopeToType: Record<string, string> = { jobs: "search_job", services: "search_service", tasks: "search_task" };
      const expectedType = scopeToType[pinnedScope];
      const isExplicit = isExplicitIntentSwitch(quickQuery, aiResult.type);
      if (expectedType && aiResult.type !== expectedType && !isExplicit) {
        const suggestedIntent =
          aiResult.type === "search_service" ? "services" : aiResult.type === "search_task" ? "tasks" : "jobs";
        const mismatchMessage = await buildScopeMismatchMessage({ currentScope: pinnedScope, suggestedIntent, userMessage: lastUser });
        return NextResponse.json({
          action: "chat", intent: pinnedScope as AgentIntent, searchQuery: "",
          assistantText: mismatchMessage,
          relatedPrompts: [`Yes, search ${suggestedIntent}`, `No, keep searching ${pinnedScope}`],
          intentMismatch: { suggestedIntent: suggestedIntent as AgentIntent },
        } satisfies AgentResponse);
      }
    }

    // ── Conversation ──────────────────────────────────────────────────────────
    if (aiResult.type === "conversation") {
      return NextResponse.json({
        action: "chat", intent: "jobs", searchQuery: "",
        assistantText: aiResult.reply || "How can I help you today?",
        relatedPrompts: [],
        debug: includeDebug ? { stage: "conversation", extracted_intent: aiResult } : undefined,
      } satisfies AgentResponse);
    }

    // ── Job search ────────────────────────────────────────────────────────────
    if (aiResult.type === "search_job" && aiResult.intent_data) {
      const intentData = aiResult.intent_data as JobIntentData;

      // ── Readiness gate: requires BOTH category AND location signal ───────────
      // Runs on ALL paths — bypass and LLM — before any DB query.
      // checkJobSearchReadiness tells us exactly which field is missing
      // so the clarify message is targeted, not generic.
      const readiness = checkJobSearchReadiness(intentData);
      if (!readiness.ready) {
        const clarifyText = await buildJobClarifyMessage(lastUser, readiness.missingField, aiResult.reply);
        return NextResponse.json({
          action: "chat", intent: "jobs", searchQuery: "",
          assistantText: clarifyText, relatedPrompts: [],
        } satisfies AgentResponse);
      }

      // ── Search engine ─────────────────────────────────────────────────────
      const searchResult = await jobSearchEngine(prisma as PrismaClient, intentData);
      const searchQuery = intentData.query?.trim() || lastUser.trim();

      const personalizedRanked = hasResumeEmbedding
        ? rankJobsWithResumeMatch(searchResult.topResults as any, {
            resumeEmbedding: userResumeData.resumeEmbedding as number[],
            resumeSkills: (userResumeData?.autoApplyKeywords as string[] | undefined) ?? [],
          })
        : searchResult.topResults;

      const cards = mapJobCards(personalizedRanked.slice(0, SEARCH_PAGE_SIZE), { locale, includeResumeMatch: hasResumeEmbedding });
      const confidenceMode = evaluateConfidenceMode(cards);

      // assistantText — always present, always the LLM's own reply
      const assistantText = aiResult.reply?.trim() ?? "";

      const relatedPrompts = await generateSmartSuggestions({ intent: "jobs", query: searchQuery, extractedData: intentData, items: cards });

      await trackAgentEvent({
        userId, sessionId, name: "AGENT_SEARCH_RESULTS_RETURNED", intent: "search_job",
        data: { query: searchQuery, resultsCount: cards.length, confidenceMode, hasResumeEmbedding, filtersApplied: searchResult.filtersApplied, topIds: cards.map((item) => item.id) },
      });

      logChatDebug("job_search_pipeline", {
        extracted_query: searchQuery, filters_applied: searchResult.filtersApplied,
        result_count: cards.length, top_ids: cards.map((c) => c.id),
        used_resume_matching: hasResumeEmbedding, assistant_text: assistantText,
      });

      return NextResponse.json({
        action: "search", intent: "jobs", searchQuery, assistantText,
        results: { type: "jobs", items: cards },
        resumeUploadCta: hasResumeEmbedding ? undefined : buildResumeUploadCta(),
        relatedPrompts,
        debug: includeDebug
          ? {
              stage: "search_job", extracted_intent: aiResult,
              filters_applied: searchResult.filtersApplied, bypassed: shouldBypassIntentLlm,
              ranking_top3: personalizedRanked.slice(0, 3).map((item: any) => ({
                id: item.id, title: item.title, finalScore: item.finalScore, blendedScore: item.blendedScore,
              })),
            }
          : undefined,
      } satisfies AgentResponse);
    }

    // ── Service search ────────────────────────────────────────────────────────
    if (aiResult.type === "search_service" && aiResult.intent_data) {
      const intentData = aiResult.intent_data as ServiceIntentData;
      const searchResult = await serviceSearchEngine(prisma as PrismaClient, intentData);
      const searchQuery = intentData.query?.trim() || lastUser.trim();
      const cards = mapServiceCards(searchResult.topResults);
      const confidenceMode = evaluateConfidenceMode(cards);
      const assistantText = aiResult.reply?.trim() ?? "";

      const relatedPrompts = await generateSmartSuggestions({ intent: "services", query: searchQuery, extractedData: intentData, items: cards });

      await trackAgentEvent({
        userId, sessionId, name: "AGENT_SEARCH_RESULTS_RETURNED", intent: "search_service",
        data: { query: searchQuery, resultsCount: cards.length, confidenceMode, filtersApplied: searchResult.filtersApplied, topIds: cards.map((item) => item.id) },
      });

      logChatDebug("service_search_pipeline", { extracted_query: searchQuery, filters_applied: searchResult.filtersApplied, result_count: cards.length, top_ids: cards.map((c) => c.id) });

      return NextResponse.json({
        action: "search", intent: "services", searchQuery, assistantText,
        results: { type: "services", items: cards },
        relatedPrompts,
        debug: includeDebug ? { stage: "search_service", extracted_intent: aiResult, filters_applied: searchResult.filtersApplied } : undefined,
      } satisfies AgentResponse);
    }

    // ── Task search ───────────────────────────────────────────────────────────
    if (aiResult.type === "search_task" && aiResult.intent_data) {
      const searchQuery = (aiResult.intent_data as any).query?.trim() || lastUser.trim();
      const assistantText = aiResult.reply?.trim() ?? "";
      const relatedPrompts = await generateSmartSuggestions({ intent: "tasks", query: searchQuery, extractedData: null, items: [] });

      await trackAgentEvent({ userId, sessionId, name: "AGENT_SEARCH_RESULTS_RETURNED", intent: "search_task", data: { query: searchQuery, resultsCount: 0 } });

      return NextResponse.json({ action: "search", intent: "tasks", searchQuery, assistantText, relatedPrompts } satisfies AgentResponse);
    }

    // ── Fallback ──────────────────────────────────────────────────────────────
    return NextResponse.json({
      action: "search", intent: "jobs", searchQuery: quickQuery || "jobs",
      assistantText: "", relatedPrompts: [],
      debug: includeDebug ? { stage: "fallback", extracted_intent: aiResult } : undefined,
    } satisfies AgentResponse);
  } catch (err: any) {
    console.error("[chat/route] Unhandled error:", err);
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
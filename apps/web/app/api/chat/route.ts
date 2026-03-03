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

export const runtime = "nodejs";

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
  resumeUploadCta?: {
    title: string;
    description: string;
    buttonLabel: string;
  };
  debug?: Record<string, unknown>;
  planLimitReached?: boolean;
  upgradeUrl?: string;
};

const FREE_DAILY_LIMIT = 20;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function pickFirstString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return null;
}

function extractAssistantText(json: any): string | null {
  // DashScope generation commonly returns under output.choices[0].message.content
  return pickFirstString(
    json?.output?.choices?.[0]?.message?.content,
    json?.output?.text,
    json?.output?.texts?.[0],
    json?.output?.choices?.[0]?.text,
    // OpenAI-compatible fallbacks
    json?.choices?.[0]?.message?.content,
    json?.choices?.[0]?.text,
  );
}

async function callDashScope(body: {
  model: string;
  messages: ChatMessage[];
}): Promise<string> {
  const url = getRequiredEnv("CHAT_API_URL");
  const apiKey = getRequiredEnv("DASHSCOPE_API_KEY");
  // Use a fixed Qwen 3 model (no env needed).
  const model = "qwen3-32b";

  // Try DashScope native format first: { model, input: { messages }, parameters: {...} }
  const dashscopeBody = {
    model,
    input: { messages: body.messages },
    parameters: {
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 700,
      // If supported, ask for message-shaped output.
      result_format: "message",
      // Qwen3 may default to "thinking" mode; DashScope requires disabling it for non-streaming calls.
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

  // Fallback to OpenAI-compatible shape if the endpoint is configured that way.
  if (!response.ok) {
    const openaiBody = {
      model,
      messages: body.messages,
      temperature: 0.4,
      top_p: 0.9,
      max_tokens: 700,
      // DashScope OpenAI-compatible mode may also enforce this for non-streaming.
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
    throw new Error(
      `DashScope error ${response.status}${details ? `: ${details.slice(0, 300)}` : ""}`,
    );
  }

  const json = (await response.json()) as any;
  const text = extractAssistantText(json);
  if (!text) {
    throw new Error("DashScope returned an unexpected payload shape.");
  }
  return text;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeForIntent(text: string): string {
  const withoutDiacritics = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return text
    ? withoutDiacritics
        .toLowerCase()
        .trim()
        .replace(/[.,!?;:()[\]{}'"`~@#$%^&*_+=<>|\\/.-]/g, " ")
        .replace(/\s+/g, " ")
    : "";
}

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

  const greetingOrSmalltalkPhrases = [
    // English
    "hi",
    "hey",
    "hello",
    "yo",
    "good morning",
    "good afternoon",
    "good evening",
    "how are you",
    "who are you",
    "what can you do",
    "thanks",
    "thank you",
    // French
    "salut",
    "bonjour",
    "bonsoir",
    "coucou",
    "ca va",
    "qui es tu",
    "tu fais quoi",
    "merci",
    // Arabic
    "مرحبا",
    "اهلا",
    "أهلا",
    "سلام",
    "السلام عليكم",
    "كيف حالك",
    "شكرا",
    "شكرًا",
  ];

  const searchActionPhrases = [
    // English
    "find",
    "search",
    "looking for",
    "look for",
    "show me",
    "i need",
    "i want",
    "hire",
    "apply",
    // French
    "cherche",
    "recherche",
    "trouve",
    "montre moi",
    "jai besoin",
    "je veux",
    // Arabic / Darija common
    "بغيت",
    "كنقلب",
    "ابحث",
    "أبحث",
    "اريد",
    "أريد",
    "احتاج",
    "أحتاج",
    "وريني",
  ];

  const marketplaceNouns = [
    // English
    "job",
    "jobs",
    "work",
    "service",
    "services",
    "task",
    "tasks",
    "freelance",
    // French
    "emploi",
    "emplois",
    "travail",
    "service",
    "services",
    "mission",
    "tache",
    "taches",
    // Arabic
    "وظيفة",
    "وظائف",
    "خدمة",
    "خدمات",
    "مهمة",
    "مهام",
    "عمل",
  ];

  const constraintSignals = [
    "remote",
    "onsite",
    "hybrid",
    "distance",
    "casablanca",
    "rabat",
    "marrakech",
    "tangier",
    "agadir",
    "en ligne",
    "a distance",
    "عن بعد",
    "في",
    "بال",
    "budget",
    "salary",
    "wage",
    "prix",
    "salaire",
    "price",
  ];

  let chatScore = 0;
  let searchScore = 0;

  chatScore += countPhraseHits(normalized, greetingOrSmalltalkPhrases);
  searchScore += countPhraseHits(normalized, searchActionPhrases);
  searchScore += countPhraseHits(normalized, marketplaceNouns) * 2;
  searchScore += countPhraseHits(normalized, constraintSignals);

  // Numeric/currency hints usually mean search filters.
  if (/\b\d{2,}\b/.test(normalized)) searchScore += 1;
  if (/(dh|mad|usd|eur|\$|€)/.test(text.toLowerCase())) searchScore += 1;

  const hasMarketplaceNoun = marketplaceNouns.some((w) => tokens.includes(w));
  const hasSearchAction = searchActionPhrases.some((p) => normalized.includes(p));

  // Very short non-domain messages should remain chat.
  if (!hasMarketplaceNoun && !hasSearchAction && tokens.length <= 4) {
    chatScore += 2;
  }

  // Questions about agent identity/capability are chat even if short.
  if (
    normalized.includes("who are you") ||
    normalized.includes("what can you do") ||
    normalized.includes("qui es tu") ||
    normalized.includes("شنو تقدر") ||
    normalized.includes("ماذا تستطيع")
  ) {
    chatScore += 3;
  }

  // If explicit marketplace intent is weak, default to conversational.
  if (searchScore < 2) {
    chatScore += 1;
  }

  return searchScore >= chatScore + 1 ? "search" : "chat";
}

function isGreetingOrSmallTalk(text: string): boolean {
  return classifyTurnIntent(text) === "chat";
}

function isLikelySearchRequest(text: string): boolean {
  return classifyTurnIntent(text) === "search";
}

function normalizeLocale(locale: string): "en" | "fr" | "ar" {
  const lower = locale.toLowerCase();
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("ar")) return "ar";
  return "en";
}

function getDayBucketUtc(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function isEligiblePaidUser(userId: string): Promise<boolean> {
  const db = prisma as any;
  const subscription = await db.subscription.findFirst({
    where: {
      userId,
      status: SubscriptionStatus.ACTIVE,
    },
    select: {
      planId: true,
    },
  });
  if (!subscription?.planId) return false;
  return [PLANS.BASIC.id, PLANS.PREMIUM.id].includes(subscription.planId);
}

async function getDailyUsageCount(userId: string, dayBucket: Date): Promise<number> {
  const db = prisma as any;
  const row = await db.aiChatUsage.findUnique({
    where: {
      userId_dayBucket: {
        userId,
        dayBucket,
      },
    },
    select: {
      requests: true,
    },
  });
  return row?.requests ?? 0;
}

async function incrementDailyUsage(userId: string, dayBucket: Date): Promise<void> {
  const db = prisma as any;
  await db.aiChatUsage.upsert({
    where: {
      userId_dayBucket: {
        userId,
        dayBucket,
      },
    },
    create: {
      userId,
      dayBucket,
      requests: 1,
    },
    update: {
      requests: {
        increment: 1,
      },
    },
  });
}

function buildChatFallbackReply(locale: string, lastUser: string): string {
  const normalizedLocale = normalizeLocale(locale);
  const normalizedInput = normalizeForIntent(lastUser);

  if (normalizedLocale === "fr") {
    if (normalizedInput.includes("comment ca va") || normalizedInput.includes("ca va")) {
      return "Je vais bien, merci. Et toi ? Si tu veux, je peux deja t’aider a cibler un job, un service ou une tache selon ta ville et ton budget.";
    }
    if (normalizedInput.includes("merci")) {
      return "Avec plaisir. Si tu veux, on peut affiner ensemble ta recherche pour trouver des resultats plus precis.";
    }
    return "Super, on avance ensemble. Dis-moi ton besoin exact et je te propose la meilleure recherche.";
  }

  if (normalizedLocale === "ar") {
    if (normalizedInput.includes("كيف حالك")) {
      return "بخير الحمد لله، شكرا. وانت؟ نقدر نعاونك تلقى وظيفة او خدمة او مهمة بطريقة ادق.";
    }
    if (normalizedInput.includes("شكرا")) {
      return "العفو. اذا بغيتي نقدر نعاونك نضبط البحث باش تكون النتائج احسن.";
    }
    return "ممتاز، خلينا نخدموها خطوة بخطوة. قلّي بالضبط اش كتقلب عليه.";
  }

  if (normalizedInput.includes("how are you")) {
    return "I am doing well, thanks. How are you? I can help you find better jobs, services, or tasks with specific filters.";
  }
  if (normalizedInput.includes("thank")) {
    return "You are welcome. I can help refine your search to get sharper results.";
  }
  return "Great, let’s do it step by step. Tell me exactly what you need and I’ll guide you.";
}

function buildCharismaticConversationReply(locale: string, lastUser: string, modelReply?: string): string {
  const normalizedLocale = normalizeLocale(locale);
  const rawReply = (modelReply ?? "").trim();
  const normalizedInput = normalizeForIntent(lastUser);
  const words = rawReply.split(/\s+/).filter(Boolean);
  const shortOrDry = words.length <= 4;

  // Keep model reply when it's already rich enough.
  if (!shortOrDry && rawReply.length >= 24) return rawReply;

  if (normalizedLocale === "fr") {
    if (normalizedInput.includes("salut") || normalizedInput.includes("bonjour") || normalizedInput.includes("bonsoir")) {
      return "Salut 👋 Ravi de te voir ici. Dis-moi ce que tu veux trouver (job, service ou tache) et je te guide rapidement.";
    }
    if (normalizedInput.includes("merci")) {
      return "Avec plaisir 😊 Si tu veux, je peux aussi te proposer une recherche plus precise selon ta ville, budget ou niveau.";
    }
    return rawReply
      ? `${rawReply} 😊 Si tu veux, je peux te proposer une recherche concrete tout de suite.`
      : "Top 👋 Je suis la pour t’aider. Donne-moi ton besoin et je te propose les meilleures options.";
  }

  if (normalizedLocale === "ar") {
    if (
      normalizedInput.includes("سلام") ||
      normalizedInput.includes("مرحبا") ||
      normalizedInput.includes("السلام عليكم")
    ) {
      return "سلام 👋 مرحبا بك! قولي شنو بغيتي (وظيفة، خدمة، أو مهمة) وأنا نعاونك بسرعة.";
    }
    if (normalizedInput.includes("شكرا")) {
      return "العفو 😊 إذا بغيتي نقدر نضبط ليك البحث أكثر حسب المدينة والميزانية.";
    }
    return rawReply
      ? `${rawReply} 😊 إلى بغيتي نقدر نبداو مباشرة ببحث مضبوط.`
      : "ممتاز 👋 أنا هنا باش نعاونك. قولّي شنو محتاج ونخدموه خطوة بخطوة.";
  }

  if (normalizedInput.includes("hi") || normalizedInput.includes("hello") || normalizedInput.includes("hey")) {
    return "Hey 👋 Great to see you. Tell me what you want to find (job, service, or task) and I’ll help you right away.";
  }
  if (normalizedInput.includes("thank")) {
    return "You’re welcome 😊 If you want, I can refine your search by city, budget, or level.";
  }
  return rawReply
    ? `${rawReply} 😊 Want me to turn this into a focused search now?`
    : "Awesome 👋 I’m here to help. Tell me what you need and I’ll guide you step by step.";
}

function buildChatRelatedPrompts(locale: string, query = ""): string[] {
  const normalizedLocale = normalizeLocale(locale);
  const q = normalizeForIntent(query);
  if (normalizedLocale === "fr") {
    if (q.includes("ca va") || q.includes("salut") || q.includes("bonjour")) {
      return [
        "Trouve-moi des jobs remote a Casablanca",
        "Je cherche un service fiable avec budget precis",
        "Montre-moi des taches urgentes cette semaine",
        "Aide-moi a formuler une recherche plus precise",
      ];
    }
    return [
      "Trouve-moi des jobs marketing a Casablanca",
      "Je cherche un service de plomberie a Rabat",
      "Montre-moi des taches freelance a distance",
      "Aide-moi a preciser ma recherche",
    ];
  }
  if (normalizedLocale === "ar") {
    if (q.includes("مرحبا") || q.includes("كيف حالك")) {
      return [
        "بغيت وظائف عن بعد فـ الدار البيضاء",
        "كنقلب على خدمة بثمن محدد وفمدينة قريبة",
        "ورّيني مهام مستعجلة متاحة هاد الأسبوع",
        "عاونّي نصاوب بحث أدق للنتائج",
      ];
    }
    return [
      "بغيت وظائف تسويق فـ الدار البيضاء",
      "كنقلب على خدمة سباك فـ الرباط",
      "ورّيني مهام فريلانس عن بُعد",
      "عاونّي نحدد البحث ديالي",
    ];
  }
  return [
    "Find me marketing jobs in Casablanca",
    "I need a plumbing service in Rabat",
    "Show remote freelance tasks",
    "Help me refine my search",
  ];
}

function dedupePrompts(prompts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of prompts) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    const key = normalizeForIntent(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function normalizeSessionId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().slice(0, 120);
  return cleaned || null;
}

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
      data: {
        userId: args.userId,
        sessionId: args.sessionId,
        name: args.name,
        intent: args.intent,
        source: "agent_chat",
        data: args.data ?? {},
      },
    });
  } catch (error) {
    console.error("Failed to track agent event", error);
  }
}

function buildPlanLimitMessage(locale: string): string {
  const normalizedLocale = normalizeLocale(locale);
  if (normalizedLocale === "fr") {
    return "Tu as atteint la limite gratuite de 20 requetes IA aujourd’hui. Pour continuer, passe a un plan payant depuis la page Plans.";
  }
  if (normalizedLocale === "ar") {
    return "وصلتي للحد المجاني ديال 20 طلب ذكاء اصطناعي اليوم. باش تكمل الاستعمال، خذ خطة مدفوعة من صفحة Plans.";
  }
  return "You reached the free AI limit of 20 requests today. To continue, please upgrade from the Plans page.";
}

function buildPlanLimitPrompts(locale: string): string[] {
  const normalizedLocale = normalizeLocale(locale);
  if (normalizedLocale === "fr") {
    return ["Plans", "Que contient le plan Basic ?", "Puis-je reprendre demain ?"];
  }
  if (normalizedLocale === "ar") {
    return ["Plans", "شنو فيه Plan Basic؟", "واش نقدر نكمل غدا؟"];
  }
  return ["Plans", "What is included in Basic?", "Can I continue tomorrow?"];
}

function tokenizeForRelevance(text: string): string[] {
  const normalized = normalizeForIntent(text);
  const stopwords = new Set([
    "the",
    "a",
    "an",
    "for",
    "to",
    "of",
    "in",
    "on",
    "with",
    "je",
    "tu",
    "le",
    "la",
    "les",
    "des",
    "de",
    "dans",
    "pour",
    "بغيت",
    "في",
    "من",
    "على",
    "and",
    "or",
  ]);
  return normalized
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !stopwords.has(t));
}

function buildSearchRelatedPrompts(intent: AgentIntent, query: string, locale: string): string[] {
  const normalizedLocale = normalizeLocale(locale);
  const q = query.trim();

  if (normalizedLocale === "fr") {
    if (intent === "jobs") {
      return [
        `Montre-moi des postes ${q} en remote`,
        `Trouve des roles ${q} junior`,
        `Jobs ${q} a Casablanca`,
        `Quelles competences sont demandees pour ${q} ?`,
      ];
    }
    if (intent === "services") {
      return [
        `✨ Montre-moi d'autres options de services ${q}`,
        `💸 Affine les services ${q} par prix`,
        `⚡ Affiche les prestataires ${q} disponibles en urgence`,
        `⭐ Garde seulement les services ${q} les mieux notes`,
      ];
    }
    return [
      `Taches ${q} a distance`,
      `Taches ${q} avec budget plus eleve`,
      `Missions similaires a ${q}`,
      `Taches ${q} disponibles cette semaine`,
    ];
  }

  if (normalizedLocale === "ar") {
    if (intent === "jobs") {
      return [
        `ورّيني وظائف ${q} عن بُعد`,
        `لقّى ليا وظائف ${q} للمبتدئين`,
        `وظائف ${q} فالدار البيضاء`,
        `شنو المهارات المطلوبة فـ ${q}؟`,
      ];
    }
    if (intent === "services") {
      return [
        `✨ ورّيني خيارات أخرى لخدمات ${q}`,
        `💸 صفي خدمات ${q} حسب السعر`,
        `⚡ ورّيني مزودين ${q} المتاحين بشكل مستعجل`,
        `⭐ خلي غير خدمات ${q} الأعلى تقييماً`,
      ];
    }
    return [
      `مهام ${q} عن بُعد`,
      `مهام ${q} بميزانية أكبر`,
      `مهام مشابهة لـ ${q}`,
      `مهام ${q} المتاحة هاد الأسبوع`,
    ];
  }

  if (intent === "jobs") {
    return [
      `Show remote ${q} jobs`,
      `Find junior ${q} jobs`,
      `${q} jobs in Casablanca`,
      `What skills are most requested for ${q}?`,
    ];
  }
  if (intent === "services") {
    return [
      `✨ Show different ${q} service options`,
      `💸 Refine ${q} results by price range`,
      `⚡ Show ${q} providers available urgently`,
      `⭐ Keep only top-rated ${q} providers`,
    ];
  }
  return [
    `Show remote ${q} tasks`,
    `Find ${q} tasks with higher budget`,
    `Show tasks similar to ${q}`,
    `What ${q} tasks are available this week?`,
  ];
}

function chooseRelevantPrompts(input: {
  action: AgentAction;
  intent: AgentIntent;
  query: string;
  locale: string;
  prompts: string[];
}): string[] {
  if (input.action === "chat") {
    const base = input.prompts.length > 0 ? input.prompts : buildChatRelatedPrompts(input.locale, input.query);
    const cleaned = dedupePrompts(base);
    return (cleaned.length > 0 ? cleaned : buildChatRelatedPrompts(input.locale, input.query)).slice(0, 6);
  }

  const queryTokens = tokenizeForRelevance(input.query);
  const intentTokens: Record<AgentIntent, string[]> = {
    jobs: ["job", "jobs", "emploi", "travail", "وظيفة", "وظائف"],
    services: ["service", "services", "خدمة", "خدمات"],
    tasks: ["task", "tasks", "mission", "tache", "taches", "مهمة", "مهام"],
  };

  const filtered = input.prompts.filter((prompt) => {
    const p = normalizeForIntent(prompt);
    const overlap = queryTokens.length > 0 && queryTokens.some((token) => p.includes(token));
    const sameDomain = intentTokens[input.intent].some((token) => p.includes(token));
    return overlap || sameDomain;
  });

  if (filtered.length >= 3) return dedupePrompts(filtered).slice(0, 6);
  return dedupePrompts(buildSearchRelatedPrompts(input.intent, input.query, input.locale)).slice(0, 6);
}

function safeParseAgentJson(text: string): AgentResponse | null {
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

  const action = parsed?.action;
  if (action !== "chat" && action !== "search") return null;

  const intent = parsed?.intent;
  if (intent !== "jobs" && intent !== "services" && intent !== "tasks") return null;

  const rawSearchQuery = typeof parsed?.searchQuery === "string" ? parsed.searchQuery : "";
  const searchQuery = rawSearchQuery.trim();
  if (action === "search" && !searchQuery) return null;

  const assistantText = typeof parsed?.assistantText === "string" ? parsed.assistantText.trim() : "";
  const relatedPrompts = asStringArray(parsed?.relatedPrompts).slice(0, 6);

  return {
    action,
    intent,
    searchQuery,
    assistantText,
    relatedPrompts,
  };
}

function formatServiceResultsReply(
  locale: string,
  count: number,
  topTitle?: string,
): string {
  if (count === 0) {
    if (normalizeLocale(locale) === "fr") return "Aucun service pertinent trouve avec ces filtres.";
    if (normalizeLocale(locale) === "ar") return "ملقيناش خدمات مناسبة بهاد المعايير.";
    return "No relevant services found for these filters.";
  }
  if (normalizeLocale(locale) === "fr") {
    return `J'ai trouve ${count} services pertinents${topTitle ? ` (top: ${topTitle})` : ""}.`;
  }
  if (normalizeLocale(locale) === "ar") {
    return `لقيت ${count} خدمات مناسبة${topTitle ? ` (الأول: ${topTitle})` : ""}.`;
  }
  return `I found ${count} relevant services${topTitle ? ` (top: ${topTitle})` : ""}.`;
}

function buildServiceSearchExplanation(
  locale: string,
  params: {
    count: number;
    query: string;
    topTitle?: string;
    filters?: Record<string, unknown>;
    topScores?: {
      semanticScore?: number;
      ratingScore?: number;
      reviewsScore?: number;
      locationScore?: number;
      priceScore?: number;
    };
  },
): string {
  const normalized = normalizeLocale(locale);
  if (params.count === 0) return formatServiceResultsReply(locale, 0);
  const city = typeof params.filters?.city === "string" ? params.filters.city : null;
  const scoreHint =
    params.topScores &&
    typeof params.topScores.ratingScore === "number" &&
    typeof params.topScores.reviewsScore === "number" &&
    typeof params.topScores.locationScore === "number" &&
    typeof params.topScores.priceScore === "number"
      ? ` rating=${params.topScores.ratingScore.toFixed(2)}, reviews=${params.topScores.reviewsScore.toFixed(2)}, location=${params.topScores.locationScore.toFixed(2)}, price=${params.topScores.priceScore.toFixed(2)}`
      : "";
  if (normalized === "fr") {
    return `J'ai trouvé ${params.count} services pertinents pour "${params.query}". Meilleur choix: ${params.topTitle ?? "sans titre"}. Classement basé sur note, avis, proximité et prix${city ? `, avec filtre ville: ${city}` : ""}.${scoreHint}`;
  }
  if (normalized === "ar") {
    return `لقيت ${params.count} خدمات مناسبة لـ "${params.query}". أفضل اختيار: ${params.topTitle ?? "بدون عنوان"}. الترتيب مبني على التقييم والمراجعات والقرب والسعر${city ? ` مع فلتر المدينة: ${city}` : ""}.${scoreHint}`;
  }
  return `I found ${params.count} relevant services for "${params.query}". Top choice: ${params.topTitle ?? "untitled"}. Ranking used rating, reviews, location proximity, and price fit${city ? ` with city filter: ${city}` : ""}.${scoreHint}`;
}

function buildResumeUploadHint(locale: string): string {
  const normalized = normalizeLocale(locale);
  if (normalized === "fr") {
    return "Voici les meilleurs matchs trouvés pour votre recherche. Pour des résultats encore plus pertinents, joignez votre CV via l'icône trombone afin d'activer le matching personnalisé.";
  }
  if (normalized === "ar") {
    return "هذو أفضل النتائج حسب بحثك. إذا بغيتي نتائج أدق، حمّل السيرة الذاتية عبر أيقونة المشبك لتفعيل المطابقة الذكية.";
  }
  return "Here are the best matches for your search. For more relevant results, attach your resume using the paperclip icon to enable personalized matching.";
}

function buildResumeUploadCta(locale: string): { title: string; description: string; buttonLabel: string } {
  const normalized = normalizeLocale(locale);
  if (normalized === "fr") {
    return {
      title: "Action recommandee: ajoutez votre CV",
      description:
        "Nous avons des resultats, mais pour un matching plus precis (competences, experience, priorites), joignez votre CV maintenant.",
      buttonLabel: "Joindre mon CV",
    };
  }
  if (normalized === "ar") {
    return {
      title: "إجراء مهم: أرفق سيرتك الذاتية",
      description:
        "النتائج متوفرة، لكن المطابقة ستكون أدق إذا أرفقت السيرة الذاتية الآن.",
      buttonLabel: "إرفاق السيرة الذاتية",
    };
  }
  return {
    title: "Recommended action: attach your resume",
    description:
      "We found results, but matching becomes much more precise (skills, experience, priorities) once your resume is attached.",
    buttonLabel: "Attach my resume",
  };
}

function buildJobResumeMatchExplanation(locale: string, input: {
  matchedSkillsCount: number;
  requiredSkillsCount: number;
  matchedSkills: string[];
}): string {
  const matched = input.matchedSkillsCount;
  const required = input.requiredSkillsCount;
  const sampleSkills = input.matchedSkills.slice(0, 3).join(", ");
  if (normalizeLocale(locale) === "fr") {
    if (required > 0) {
      return `Correspondance competences: ${matched}/${required}${sampleSkills ? ` (ex: ${sampleSkills})` : ""}.`;
    }
    return "Correspondance semantique et niveau d'experience alignes avec votre CV.";
  }
  if (normalizeLocale(locale) === "ar") {
    if (required > 0) {
      return `تطابق المهارات: ${matched}/${required}${sampleSkills ? ` (مثل: ${sampleSkills})` : ""}.`;
    }
    return "التطابق مبني على التشابه الدلالي وملاءمة مستوى الخبرة مع السيرة الذاتية.";
  }
  if (required > 0) {
    return `Skill overlap: ${matched}/${required}${sampleSkills ? ` (e.g. ${sampleSkills})` : ""}.`;
  }
  return "Match is based on semantic similarity and experience alignment with your resume.";
}

function matchToneIcon(percent: number | null | undefined): string {
  if (typeof percent !== "number") return "⚪";
  if (percent >= 80) return "🟢";
  if (percent >= 60) return "🟡";
  return "🔴";
}

function formatLocationRequirement(locale: string, value: unknown): string {
  const normalizedLocale = normalizeLocale(locale);
  const key = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!key) {
    if (normalizedLocale === "fr") return "mode non precise";
    if (normalizedLocale === "ar") return "نمط العمل غير محدد";
    return "work mode n/a";
  }

  const labels = {
    fr: {
      remote: "a distance",
      hybrid: "hybride",
      in_office: "sur site",
    },
    ar: {
      remote: "عن بُعد",
      hybrid: "هجين",
      in_office: "حضوري",
    },
    en: {
      remote: "remote",
      hybrid: "hybrid",
      in_office: "in office",
    },
  } as const;

  if (normalizedLocale === "fr") return labels.fr[key as keyof typeof labels.fr] ?? key;
  if (normalizedLocale === "ar") return labels.ar[key as keyof typeof labels.ar] ?? key;
  return labels.en[key as keyof typeof labels.en] ?? key;
}

function buildResumeJobMatchMarkdownSummary(locale: string, query: string, cards: any[]): string {
  const normalized = normalizeLocale(locale);
  const top = cards[0];
  if (!top) {
    if (normalized === "fr") return "## Resultats\n- **Aucun match:** aucun job trouve.\n- **Prochaine etape:** elargissez les filtres.";
    if (normalized === "ar") return "## النتائج\n- **لا يوجد تطابق:** لم نجد وظائف حاليا.\n- **الخطوة التالية:** وسّع معايير البحث.";
    return "## Results\n- **No match:** no jobs found.\n- **Next step:** widen your filters.";
  }

  const topPercent = top?.resumeMatch?.percent ?? null;
  const topIcon = matchToneIcon(topPercent);
  const matched = top?.resumeMatch?.matchedSkillsCount ?? 0;
  const required = top?.resumeMatch?.requiredSkillsCount ?? 0;
  const skills = Array.isArray(top?.resumeMatch?.matchedSkills)
    ? top.resumeMatch.matchedSkills.slice(0, 3).join(", ")
    : "";
  const locationRequirement = formatLocationRequirement(locale, top?.locationRequirement);

  if (normalized === "fr") {
    return [
      `## Matchs optimises pour "${query}"`,
      `- **Top score:** ${topIcon} **${topPercent ?? 0}%** sur **${top.title ?? "ce poste"}**.`,
      `- **Pourquoi ce score:** competences alignees **${matched}/${required || 0}**${skills ? ` (${skills})` : ""}.`,
      `- **Contexte poste:** ${top.city ?? "ville non precisee"} · ${locationRequirement} · ${top.wage != null ? `${top.wage} MAD` : "salaire non precise"}.`,
      `- **Prochaine etape:** ouvrez une carte pour verifier les details et postuler vite.`,
    ].join("\n");
  }
  if (normalized === "ar") {
    return [
      `## نتائج مطابقة محسنة لـ "${query}"`,
      `- **أفضل درجة:** ${topIcon} **${topPercent ?? 0}%** في **${top.title ?? "هذه الوظيفة"}**.`,
      `- **سبب النتيجة:** تطابق المهارات **${matched}/${required || 0}**${skills ? ` (${skills})` : ""}.`,
      `- **تفاصيل الوظيفة:** ${top.city ?? "المدينة غير محددة"} · ${locationRequirement} · ${top.wage != null ? `${top.wage} MAD` : "الأجر غير محدد"}.`,
      `- **الخطوة التالية:** افتح البطاقة المناسبة وابدأ التقديم مباشرة.`,
    ].join("\n");
  }
  return [
    `## Optimized Matches for "${query}"`,
    `- **Top score:** ${topIcon} **${topPercent ?? 0}%** on **${top.title ?? "this role"}**.`,
    `- **Why this score:** skill overlap is **${matched}/${required || 0}**${skills ? ` (${skills})` : ""}.`,
    `- **Job context:** ${top.city ?? "city n/a"} · ${locationRequirement} · ${top.wage != null ? `${top.wage} MAD` : "wage n/a"}.`,
    `- **Next step:** open the best-fit card and apply while it is fresh.`,
  ].join("\n");
}

function buildServiceMarkdownSummary(locale: string, query: string, cards: any[]): string {
  const normalized = normalizeLocale(locale);
  const top = cards[0];
  if (!top) {
    if (normalized === "fr") return "## Resultats services\n- **Aucun resultat:** aucun service pertinent trouve.\n- **Prochaine etape:** essayez une autre ville ou categorie.";
    if (normalized === "ar") return "## نتائج الخدمات\n- **لا توجد نتائج:** لم نجد خدمات مناسبة حاليا.\n- **الخطوة التالية:** جرّب مدينة أو فئة أخرى.";
    return "## Service Results\n- **No results:** no relevant services found.\n- **Next step:** try another city or category.";
  }

  const topReasons = Array.isArray(top.selectionReasons) ? top.selectionReasons.slice(0, 2) : [];
  const topSignals = Array.isArray(top.confidenceSignals) ? top.confidenceSignals.slice(0, 2) : [];
  if (normalized === "fr") {
    return [
      `## Services trouves pour "${query}"`,
      `- **Top option:** ${top.title ?? "Service"} (${top.serviceCategory ?? "categorie non precisee"}).`,
      `- **Pourquoi selectionne:** ${topReasons.length ? topReasons.join(" · ") : "bon equilibre note, prix et localisation"}.`,
      `- **Confiance:** ${topSignals.length ? topSignals.join(" · ") : "donnees de note/prix/localisation verifiees"}.`,
      `- **Prochaine etape:** ouvre une carte pour comparer 2-3 options rapidement.`,
    ].join("\n");
  }
  if (normalized === "ar") {
    return [
      `## خدمات مقترحة لـ "${query}"`,
      `- **أفضل خيار:** ${top.title ?? "خدمة"} (${top.serviceCategory ?? "فئة غير محددة"}).`,
      `- **سبب الاختيار:** ${topReasons.length ? topReasons.join(" · ") : "توازن جيد بين التقييم والسعر والموقع"}.`,
      `- **طبقة الثقة:** ${topSignals.length ? topSignals.join(" · ") : "بيانات التقييم/السعر/الموقع متاحة"}.`,
      `- **الخطوة التالية:** افتح البطاقات وقارن أفضل 2 أو 3 خيارات.`,
    ].join("\n");
  }
  return [
    `## Service Matches for "${query}"`,
    `- **Top option:** ${top.title ?? "Service"} (${top.serviceCategory ?? "category n/a"}).`,
    `- **Why selected:** ${topReasons.length ? topReasons.join(" · ") : "balanced rating, price, and location fit"}.`,
    `- **Confidence layer:** ${topSignals.length ? topSignals.join(" · ") : "rating, price, and location signals available"}.`,
    `- **Next step:** open the cards and compare 2-3 providers quickly.`,
  ].join("\n");
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
    createdAt: item.createdAt,
    description: item.description ?? "",
    resumeMatch: includeResumeMatch
      ? {
          percent: typeof item.matchPercent === "number" ? item.matchPercent : null,
          matchedSkillsCount:
            typeof item.matchedSkillsCount === "number" ? item.matchedSkillsCount : 0,
          requiredSkillsCount:
            typeof item.requiredSkillsCount === "number" ? item.requiredSkillsCount : 0,
          matchedSkills: Array.isArray(item.matchedSkills) ? item.matchedSkills : [],
          explanation: buildJobResumeMatchExplanation(locale, {
            matchedSkillsCount:
              typeof item.matchedSkillsCount === "number" ? item.matchedSkillsCount : 0,
            requiredSkillsCount:
              typeof item.requiredSkillsCount === "number" ? item.requiredSkillsCount : 0,
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
    images:
      Array.isArray(item.images)
        ? item.images
        : typeof item.images === "string"
          ? (() => {
              try {
                const parsed = JSON.parse(item.images);
                return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
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
    matchPercent: typeof item.matchPercent === "number" ? item.matchPercent : null,
    selectionReasons: Array.isArray(item.selectionReasons) ? item.selectionReasons.slice(0, 3) : [],
    confidenceSignals: Array.isArray(item.confidenceSignals) ? item.confidenceSignals.slice(0, 3) : [],
  }));
}

function logChatDebug(step: string, payload: unknown): void {
  console.log(`[chat-debug] ${step}`, payload);
}

export async function POST(req: Request) {
  try {
    const includeDebug = process.env.CHAT_DEBUG === "true" || process.env.NODE_ENV !== "production";
    const body = (await req.json()) as ChatRequestBody;
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    if (!messages.length) {
      return NextResponse.json(
        { error: "Missing messages" },
        { status: 400 },
      );
    }

    const lastUser =
      [...messages].reverse().find((m) => m?.role === "user" && typeof m.content === "string")?.content ??
      body.context?.query ??
      "";
    const locale = body.context?.locale || "en";

    // Enforce free-tier AI usage limit (20/day), BASIC/PREMIUM unlimited.
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
          return NextResponse.json({
            action: "chat",
            intent: "jobs",
            searchQuery: "",
            assistantText: buildPlanLimitMessage(locale),
            relatedPrompts: buildPlanLimitPrompts(locale),
            planLimitReached: true,
            upgradeUrl: "/subscription",
          } satisfies AgentResponse);
        }
        await incrementDailyUsage(userId, dayBucket);
      }
    }

    const extractorHistory: IntentExtractorMessage[] = messages
      .filter((m): m is IntentExtractorMessage => {
        return (
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0
        );
      })
      .slice(-4);

    const scope = body.context?.scope;
    const quickQuery = (lastUser || "").trim();
    const shouldBypassIntentLlm =
      Boolean(scope && scope !== "auto" && quickQuery) &&
      isLikelySearchRequest(quickQuery) &&
      !isGreetingOrSmallTalk(quickQuery);

    const aiResult: Awaited<ReturnType<typeof extractIntent>> = shouldBypassIntentLlm
      ? scope === "services"
        ? { type: "search_service", reply: "", intent_data: { query: quickQuery } }
        : scope === "tasks"
          ? { type: "search_task", reply: "", intent_data: { query: quickQuery } }
          : { type: "search_job", reply: "", intent_data: { query: quickQuery } }
      : await extractIntent({
          locale,
          scope,
          categoryHint: body.context?.categoryHint,
          message: lastUser,
          history: extractorHistory,
        });
    logChatDebug("intent_extracted", {
      message: lastUser,
      type: aiResult.type,
      reply: aiResult.reply,
      intent_data: aiResult.intent_data,
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
      },
    });

    if (aiResult.type === "conversation") {
      return NextResponse.json({
        action: "chat",
        intent: "jobs",
        searchQuery: "",
        assistantText: buildCharismaticConversationReply(
          locale,
          lastUser,
          aiResult.reply || buildChatFallbackReply(locale, lastUser),
        ),
        relatedPrompts: buildChatRelatedPrompts(locale, lastUser),
        debug: includeDebug
          ? {
              stage: "conversation",
              extracted_intent: aiResult,
            }
          : undefined,
      } satisfies AgentResponse);
    }

    if (aiResult.type === "search_job" && aiResult.intent_data) {
      const searchResult = await jobSearchEngine(
        prisma as PrismaClient,
        aiResult.intent_data as JobIntentData,
      );
      const searchQuery = aiResult.intent_data.query?.trim() || lastUser.trim();
      const userResumeData =
        userId
          ? await (prisma as any).user.findUnique({
              where: { id: userId },
              select: {
                resumeEmbedding: true,
                autoApplyKeywords: true,
              },
            })
          : null;

      const hasResumeEmbedding =
        Array.isArray(userResumeData?.resumeEmbedding) && userResumeData.resumeEmbedding.length > 0;

      const personalizedRanked = hasResumeEmbedding
        ? rankJobsWithResumeMatch(searchResult.topResults as any, {
            resumeEmbedding: userResumeData.resumeEmbedding as number[],
            resumeSkills: (userResumeData?.autoApplyKeywords as string[] | undefined) ?? [],
          })
        : searchResult.topResults;

      const cards = mapJobCards(personalizedRanked.slice(0, 3), {
        locale,
        includeResumeMatch: hasResumeEmbedding,
      });
      await trackAgentEvent({
        userId,
        sessionId,
        name: "AGENT_SEARCH_RESULTS_RETURNED",
        intent: "search_job",
        data: {
          query: searchQuery,
          resultsCount: cards.length,
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
      });
      const jobDebug =
        includeDebug
          ? {
              stage: "search_job",
              extracted_intent: aiResult,
              extracted_query: searchQuery,
              filters_applied: searchResult.filtersApplied,
              ranking_top3: personalizedRanked.slice(0, 3).map((item: any) => ({
                id: item.id,
                title: item.title,
                finalScore: item.finalScore,
                semanticScore: item.semanticScore,
                overlapScore: item.overlapScore,
                recencyScore: item.recencyScore,
                resumeMatchScore: item.resumeMatchScore,
                blendedScore: item.blendedScore,
              })),
              used_resume_matching: hasResumeEmbedding,
            }
          : undefined;
      return NextResponse.json({
        action: "search",
        intent: "jobs",
        searchQuery,
        assistantText: hasResumeEmbedding
          ? buildResumeJobMatchMarkdownSummary(locale, searchQuery, cards)
          : buildResumeUploadHint(locale),
        results: {
          type: "jobs",
          items: cards,
        },
        resumeUploadCta: hasResumeEmbedding ? undefined : buildResumeUploadCta(locale),
        debug: jobDebug,
        relatedPrompts: buildSearchRelatedPrompts("jobs", searchQuery || "jobs", locale),
      } satisfies AgentResponse);
    }

    if (aiResult.type === "search_service" && aiResult.intent_data) {
      const searchResult = await serviceSearchEngine(
        prisma as PrismaClient,
        aiResult.intent_data as ServiceIntentData,
      );
      const searchQuery = aiResult.intent_data.query?.trim() || lastUser.trim();
      const cards = mapServiceCards(searchResult.topResults);
      await trackAgentEvent({
        userId,
        sessionId,
        name: "AGENT_SEARCH_RESULTS_RETURNED",
        intent: "search_service",
        data: {
          query: searchQuery,
          resultsCount: cards.length,
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
      const serviceDebug =
        includeDebug
          ? {
              stage: "search_service",
              extracted_intent: aiResult,
              extracted_query: searchQuery,
              filters_applied: searchResult.filtersApplied,
              ranking_top3: searchResult.topResults.map((item) => ({
                id: item.id,
                title: item.title,
                finalScore: item.finalScore,
                semanticScore: item.semanticScore,
                ratingScore: item.ratingScore,
                reviewsScore: item.reviewsScore,
                locationScore: item.locationScore,
                priceScore: item.priceScore,
              })),
            }
          : undefined;
      return NextResponse.json({
        action: "search",
        intent: "services",
        searchQuery,
        assistantText: buildServiceMarkdownSummary(locale, searchQuery, cards),
        results: {
          type: "services",
          items: cards,
        },
        debug: serviceDebug,
        relatedPrompts: buildSearchRelatedPrompts("services", searchQuery || "services", locale),
      } satisfies AgentResponse);
    }

    if (aiResult.type === "search_task" && aiResult.intent_data) {
      const searchQuery = aiResult.intent_data.query?.trim() || lastUser.trim();
      await trackAgentEvent({
        userId,
        sessionId,
        name: "AGENT_SEARCH_RESULTS_RETURNED",
        intent: "search_task",
        data: {
          query: searchQuery,
          resultsCount: 0,
          note: "task search cards are currently not returned from /api/chat route",
        },
      });
      return NextResponse.json({
        action: "search",
        intent: "tasks",
        searchQuery,
        assistantText: "",
        relatedPrompts: buildSearchRelatedPrompts("tasks", searchQuery || "tasks", locale),
      } satisfies AgentResponse);
    }

    const fallbackQuery = (lastUser || "").trim();
    return NextResponse.json({
      action: "search",
      intent: "jobs",
      searchQuery: fallbackQuery || "jobs",
      assistantText: "",
      debug: includeDebug
        ? {
            stage: "fallback",
            extracted_intent: aiResult,
          }
        : undefined,
      relatedPrompts: buildSearchRelatedPrompts("jobs", fallbackQuery || "jobs", locale),
    } satisfies AgentResponse);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 },
    );
  }
}


import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, SubscriptionStatus } from "@workspace/db";
import { PLANS } from "@/lib/plans";

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

function buildSystemPrompt(context?: ChatContext): string {
  const locale = context?.locale || "en";
  const scope = context?.scope || "auto";

  return `
You are Serrbi's Search Agent.

Your job is to decide whether the user is chatting (greetings, smalltalk, vague intent) or searching (they want marketplace results),
then route to the correct marketplace search intent and generate follow-up prompts.

You MUST output ONLY valid JSON (no markdown, no code fences, no extra text) with this exact schema:
{
  "action": "chat" | "search",
  "intent": "jobs" | "services" | "tasks",
  "searchQuery": string,
  "assistantText": string,
  "relatedPrompts": string[]
}

Rules:
- action:
  - Use "chat" for greetings ("hello"), smalltalk, or when the user intent is unclear. In this case, do NOT force a marketplace search.
  - Use "search" only when the user is actually looking for jobs/services/tasks in the marketplace.
- intent:
  - If scope is "jobs" / "services" / "tasks", set intent to that value.
  - If scope is "auto", infer intent from the user's message.
- searchQuery:
  - If action is "chat", return an empty string "".
  - If action is "search", rewrite the user's message into a compact semantic search query.
  - Keep concrete signals (role, service type, task, city, seniority, budget, timeframe).
  - Remove filler words and greetings.
- assistantText:
  - If action is "chat": respond naturally (e.g. greet as Serrbi and ask what they need today).
  - If action is "search": keep assistantText empty "" unless you must ask 1-2 clarifying questions.
  - Never describe or list result cards (the UI will render cards).
- relatedPrompts:
  - Provide 4 to 6 short, high-quality next-step prompts based on the user's exact goal.
  - They must be tightly grounded in the user's request topic (role/service/task, location, budget, seniority).
  - Avoid generic prompts that could fit any request.
  - Make them actionable and diverse (filters, alternatives, adjacent needs).

Language:
- Write in the user's language: ${locale}.

Current scope override: ${scope}.
`.trim();
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
      temperature: 0.3,
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
      temperature: 0.3,
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

function buildChatGreeting(locale: string): string {
  const normalizedLocale = normalizeLocale(locale);
  if (normalizedLocale === "fr") {
    return "Salut, je suis Serrbi. Je peux t’aider a trouver un job, un service, ou une tache. Dis-moi ce que tu cherches.";
  }
  if (normalizedLocale === "ar") {
    return "مرحبا، أنا Serrbi. أقدر أساعدك تلقى وظيفة أو خدمة أو مهمة. قلّي شنو كاتقلب عليه.";
  }
  return "Hey, I am Serrbi. I can help you find a job, a service, or a task. Tell me what you need.";
}

function buildChatRelatedPrompts(locale: string): string[] {
  const normalizedLocale = normalizeLocale(locale);
  if (normalizedLocale === "fr") {
    return [
      "Trouve-moi des jobs marketing a Casablanca",
      "Je cherche un service de plomberie a Rabat",
      "Montre-moi des taches freelance a distance",
      "Aide-moi a preciser ma recherche",
    ];
  }
  if (normalizedLocale === "ar") {
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
        `Services ${q} avec budget abordable`,
        `Prestataires ${q} a Rabat`,
        `Services similaires a ${q}`,
        `Filtre les services ${q} les mieux notes`,
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
        `خدمات ${q} بثمن مناسب`,
        `مزودين ${q} فالرباط`,
        `خدمات مشابهة لـ ${q}`,
        `فلتر خدمات ${q} الأعلى تقييماً`,
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
      `Show ${q} services with lower budget`,
      `Find ${q} services in Rabat`,
      `Show services similar to ${q}`,
      `Filter top-rated ${q} providers`,
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
    return input.prompts.length > 0 ? input.prompts.slice(0, 6) : buildChatRelatedPrompts(input.locale);
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

  if (filtered.length >= 3) return filtered.slice(0, 6);
  return buildSearchRelatedPrompts(input.intent, input.query, input.locale).slice(0, 6);
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

export async function POST(req: Request) {
  try {
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

    // Guardrail: keep greetings/smalltalk conversational, never run search for them.
    if (isGreetingOrSmallTalk(lastUser)) {
      return NextResponse.json({
        action: "chat",
        intent: "jobs",
        searchQuery: "",
        assistantText: buildChatGreeting(locale),
        relatedPrompts: buildChatRelatedPrompts(locale),
      } satisfies AgentResponse);
    }

    const systemPrompt = buildSystemPrompt(body.context);

    const finalMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const text = await callDashScope({
      // model is fixed inside callDashScope
      model: "qwen3-32b",
      messages: finalMessages,
    });

    const parsed = safeParseAgentJson(text);
    if (parsed) {
      // Safety net: if model still classifies greeting-like text as search, coerce to chat.
      if (parsed.action === "search" && isGreetingOrSmallTalk(lastUser)) {
        return NextResponse.json({
          action: "chat",
          intent: parsed.intent,
          searchQuery: "",
          assistantText: buildChatGreeting(locale),
          relatedPrompts: buildChatRelatedPrompts(locale),
        } satisfies AgentResponse);
      }
      return NextResponse.json({
        ...parsed,
        relatedPrompts: chooseRelevantPrompts({
          action: parsed.action,
          intent: parsed.intent,
          query: parsed.searchQuery || lastUser,
          locale,
          prompts: parsed.relatedPrompts,
        }),
      } satisfies AgentResponse);
    }

    // Fallback: if the LLM didn't follow instructions, degrade gracefully.
    const scope = body.context?.scope;
    const fallbackIntent: AgentIntent =
      scope === "jobs" || scope === "services" || scope === "tasks" ? scope : "jobs";
    const fallbackQuery = (lastUser || "").trim();
    const fallbackAction: AgentAction = isLikelySearchRequest(lastUser) ? "search" : "chat";

    return NextResponse.json({
      action: fallbackAction,
      intent: fallbackIntent,
      searchQuery: fallbackAction === "search" ? fallbackQuery || "jobs" : "",
      assistantText: fallbackAction === "chat" ? buildChatGreeting(locale) : "",
      relatedPrompts:
        fallbackAction === "chat"
          ? buildChatRelatedPrompts(locale)
          : buildSearchRelatedPrompts(fallbackIntent, fallbackQuery || "jobs", locale),
    } satisfies AgentResponse);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 },
    );
  }
}


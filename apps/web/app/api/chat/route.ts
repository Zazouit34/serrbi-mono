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
  resumeUploadCta?: {
    title: string;
    description: string;
    buttonLabel: string;
  };
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
      return "Je vais bien, merci. Et toi ? Si tu veux, je peux deja t'aider a cibler un job, un service ou une tache selon ta ville et ton budget.";
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
  return "Great, let's do it step by step. Tell me exactly what you need and I'll guide you.";
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
      : "Top 👋 Je suis la pour t'aider. Donne-moi ton besoin et je te propose les meilleures options.";
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
    return "Hey 👋 Great to see you. Tell me what you want to find (job, service, or task) and I'll help you right away.";
  }
  if (normalizedInput.includes("thank")) {
    return "You're welcome 😊 If you want, I can refine your search by city, budget, or level.";
  }
  return rawReply
    ? `${rawReply} 😊 Want me to turn this into a focused search now?`
    : "Awesome 👋 I'm here to help. Tell me what you need and I'll guide you step by step.";
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
    return "Tu as atteint la limite gratuite de 20 requetes IA aujourd'hui. Pour continuer, passe a un plan payant depuis la page Plans.";
  }
  if (normalizedLocale === "ar") {
    return "وصلتي للحد المجاني ديال 20 طلب ذكاء اصطناعي اليوم. باش تكمل الاستعمال، خذ خطة مدفوعة من صفحة Plans.";
  }
  return "You reached the free AI limit of 20 requests today. To continue, please upgrade from the Plans page.";
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

function buildSmartRelatedPrompts(
  locale: string,
  intent: AgentIntent,
  query: string,
  items: Array<{ title?: string; city?: string; serviceCategory?: string; category?: string; type?: string; matchScore?: number | null }>,
  confidenceMode: ConfidenceMode,
): string[] {
  const lang = normalizeLocale(locale);
  const topItem = items[0];
  const city = topItem?.city;
  const category = topItem?.serviceCategory || topItem?.category || "";
  const type = topItem?.type || "";

  if (intent === "services") {
    if (lang === "fr") {
      const prompts = [
        city ? `Meilleur ${type || "service"} à ${city}` : `Meilleur ${type || "service"} près de moi`,
        confidenceMode === "weak" ? "Montre-moi d'autres catégories de services" : `Comparer les prix ${type ? "de " + type : ""}`,
        "Quel service a les meilleurs avis ?",
      ];
      return prompts.slice(0, 3);
    }
    if (lang === "ar") {
      const prompts = [
        city ? `أفضل ${type || "خدمة"} في ${city}` : `أفضل ${type || "خدمة"} بالقرب مني`,
        confidenceMode === "weak" ? "اعرض لي فئات خدمات أخرى" : `قارن الأسعار ${type ? "لـ " + type : ""}`,
        "أي خدمة لديها أفضل تقييمات؟",
      ];
      return prompts.slice(0, 3);
    }
    const prompts = [
      city ? `Best ${type || "service"} in ${city}` : `Best ${type || "service"} near me`,
      confidenceMode === "weak" ? "Show me other service categories" : `Compare ${type || "service"} prices`,
      "Which one has the best reviews?",
    ];
    return prompts.slice(0, 3);
  }

  if (intent === "jobs") {
    if (lang === "fr") {
      return [
        city ? `Plus d'offres à ${city}` : "Plus d'offres d'emploi",
        "Offres pour débutants",
        "Emplois à temps partiel",
      ];
    }
    if (lang === "ar") {
      return [
        city ? `المزيد من الوظائف في ${city}` : "المزيد من فرص العمل",
        "وظائف للمبتدئين",
        "وظائف بدوام جزئي",
      ];
    }
    return [
      city ? `More jobs in ${city}` : "More job opportunities",
      "Entry-level positions",
      "Part-time jobs",
    ];
  }

  if (lang === "fr") return ["Plus de missions disponibles", "Missions urgentes", "Missions à petit budget"];
  if (lang === "ar") return ["المزيد من المهام المتاحة", "مهام عاجلة", "مهام بميزانية صغيرة"];
  return ["More available tasks", "Urgent tasks", "Budget-friendly tasks"];
}

function isComparisonQuery(query: string): boolean {
  const q = normalizeForIntent(query);
  const hints = [
    "compare",
    "comparison",
    "which one",
    "better",
    "best",
    "vs",
    "comparer",
    "comparatif",
    "meilleur",
    "plus",
    "قارن",
    "مقارنة",
    "الأفضل",
    "احسن",
  ];
  return hints.some((h) => q.includes(h));
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
    matchScore:
      typeof item.matchPercent === "number"
        ? Math.round(item.matchPercent)
        : typeof item.finalScore === "number"
          ? Math.round(Math.max(0, Math.min(1, item.finalScore)) * 100)
          : null,
    selectionReasons: Array.isArray(item.selectionReasons) ? item.selectionReasons.slice(0, 3) : [],
    confidenceSignals: Array.isArray(item.confidenceSignals) ? item.confidenceSignals.slice(0, 3) : [],
  }));
}

function logChatDebug(step: string, payload: unknown): void {
  console.log(`[chat-debug] ${step}`, payload);
}

function buildScopeMismatchMessage(
  locale: string,
  currentScope: string,
  suggestedIntent: string,
): string {
  const intentLabel: Record<string, Record<string, string>> = {
    services: { fr: "les services", ar: "الخدمات", en: "services" },
    tasks: { fr: "les tâches", ar: "المهام", en: "tasks" },
    jobs: { fr: "les emplois", ar: "الوظائف", en: "jobs" },
  };
  const currentLabel: Record<string, Record<string, string>> = {
    jobs: { fr: "emplois", ar: "وظائف", en: "jobs" },
    services: { fr: "services", ar: "خدمات", en: "services" },
    tasks: { fr: "tâches", ar: "مهام", en: "tasks" },
  };
  const lang = ["fr", "ar"].includes(locale) ? locale : "en";
  const suggested = intentLabel[suggestedIntent]?.[lang] ?? suggestedIntent;
  const current = currentLabel[currentScope]?.[lang] ?? currentScope;

  if (lang === "fr") {
    return `Vous êtes actuellement en mode **${current}**. Voulez-vous basculer vers **${suggested}** pour cette recherche ?`;
  }
  if (lang === "ar") {
    return `أنت حاليًا في وضع **${current}**. هل تريد التبديل إلى **${suggested}** لهذا البحث؟`;
  }
  return `You're currently in **${current}** mode. Would you like to switch to **${suggested}** for this search?`;
}

function buildSwitchConfirmPrompt(locale: string, suggestedIntent: string): string {
  const labels: Record<string, Record<string, string>> = {
    services: { fr: "Oui, passer aux services", ar: "نعم، التبديل إلى الخدمات", en: "Yes, switch to services" },
    tasks: { fr: "Oui, passer aux tâches", ar: "نعم، التبديل إلى المهام", en: "Yes, switch to tasks" },
    jobs: { fr: "Oui, passer aux emplois", ar: "نعم، التبديل إلى الوظائف", en: "Yes, switch to jobs" },
  };
  const lang = ["fr", "ar"].includes(locale) ? locale : "en";
  return labels[suggestedIntent]?.[lang] ?? `Yes, switch to ${suggestedIntent}`;
}

function buildStayPrompt(locale: string, currentScope: string): string {
  const labels: Record<string, Record<string, string>> = {
    jobs: { fr: "Non, continuer avec les emplois", ar: "لا، الاستمرار مع الوظائف", en: "No, keep searching jobs" },
    services: { fr: "Non, continuer avec les services", ar: "لا، الاستمرار مع الخدمات", en: "No, keep searching services" },
    tasks: { fr: "Non, continuer avec les tâches", ar: "لا، الاستمرار مع المهام", en: "No, keep searching tasks" },
  };
  const lang = ["fr", "ar"].includes(locale) ? locale : "en";
  return labels[currentScope]?.[lang] ?? `No, keep searching ${currentScope}`;
}

function isExplicitIntentSwitch(query: string, targetIntent: string): boolean {
  const q = normalizeForIntent(query);
  const serviceKeywords = ["plumber", "electrician", "cleaner", "mechanic", "painter",
    "plombier", "électricien", "نجار", "سباك", "كهربائي", "خدمة", "service", "services"];
  const taskKeywords = ["task", "mission", "gig", "tâche", "مهمة", "مهام"];
  const jobKeywords = ["job", "emploi", "وظيفة", "travail", "عمل", "hire", "recruit", "jobs", "emplois"];
  
  if (targetIntent === "services") return serviceKeywords.some(k => q.includes(k));
  if (targetIntent === "tasks") return taskKeywords.some(k => q.includes(k));
  if (targetIntent === "jobs") return jobKeywords.some(k => q.includes(k));
  return false;
}

function buildSearchIntroText(locale: string, intent: AgentIntent, query: string): string {
  const lang = normalizeLocale(locale);
  const q = query.trim();

  if (intent === "jobs") {
    if (lang === "fr") return `Voici les meilleures offres d'emploi pour "${q}" que j'ai trouvées pour toi.`;
    if (lang === "ar") return `إليك أفضل فرص العمل المتعلقة بـ "${q}" التي وجدتها لك.`;
    return `Here are the best job matches I found for "${q}".`;
  }
  if (intent === "services") {
    if (lang === "fr") return `Voici les meilleurs services disponibles pour "${q}".`;
    if (lang === "ar") return `إليك أفضل الخدمات المتاحة لـ "${q}".`;
    return `Here are the top services available for "${q}".`;
  }
  if (lang === "fr") return `Voici les meilleures missions disponibles pour "${q}".`;
  if (lang === "ar") return `إليك أفضل المهام المتاحة لـ "${q}".`;
  return `Here are the best tasks available for "${q}".`;
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
            relatedPrompts: [],
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

    // Fetch user resume data if available
    const userResumeData =
      userId
        ? await (prisma as any).user.findUnique({
            where: { id: userId },
            select: {
              resumeEmbedding: true,
              autoApplyKeywords: true,
              resumeUrl: true,
            },
          })
        : null;

    const hasResumeEmbedding =
      Array.isArray(userResumeData?.resumeEmbedding) && userResumeData.resumeEmbedding.length > 0;

    // Build resume profile for intent extractor
    const resumeProfile = hasResumeEmbedding
      ? {
          job_title: null, // We don't store this separately, but skills will help
          skills: (userResumeData?.autoApplyKeywords as string[] | undefined) ?? [],
          experience_level: null,
        }
      : null;

    const scope = body.context?.scope;
    const quickQuery = (lastUser || "").trim();
    // RULE: Only bypass the LLM when ALL four conditions are true
    const shouldBypassIntentLlm =
      Boolean(scope && scope !== "auto") &&                    // scope is pinned
      isLikelySearchRequest(quickQuery) &&                     // message is clearly a search
      !isGreetingOrSmallTalk(quickQuery) &&                    // not a greeting
      quickQuery.split(" ").filter(Boolean).length > 3;        // at least 4 words

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
      resumeProfile: resumeProfile as any,
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

    // Scope guard: if user has pinned an intent and asks for a different type, check if explicit
    const pinnedScope = body.context?.scope;
    if (pinnedScope && pinnedScope !== "auto" && aiResult.type !== "conversation") {
      const scopeToType: Record<string, string> = {
        jobs: "search_job",
        services: "search_service",
        tasks: "search_task",
      };
      const expectedType = scopeToType[pinnedScope];
      if (expectedType && aiResult.type !== expectedType) {
        const suggestedIntent = aiResult.type === "search_service" ? "services" : 
                                 aiResult.type === "search_task" ? "tasks" : "jobs";
        
        // Check if this is an explicit switch (e.g., "find me a plumber")
        const isExplicit = isExplicitIntentSwitch(lastUser, suggestedIntent);
        
        if (isExplicit) {
          // Explicit switch: proceed directly without confirmation
          logChatDebug("explicit_intent_switch", {
            from: pinnedScope,
            to: suggestedIntent,
            query: lastUser,
          });
          // Continue to search with the new intent (don't return here)
        } else {
          // Ambiguous switch: ask for confirmation
          return NextResponse.json({
            action: "chat",
            intent: pinnedScope as AgentIntent,
            searchQuery: "",
            assistantText: buildScopeMismatchMessage(locale, pinnedScope, suggestedIntent),
            relatedPrompts: [
              buildSwitchConfirmPrompt(locale, suggestedIntent),
              buildStayPrompt(locale, pinnedScope),
            ],
            intentMismatch: { suggestedIntent: suggestedIntent as AgentIntent },
          } satisfies AgentResponse);
        }
      }
    }

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
        relatedPrompts: [],
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

      // Use already-fetched resume data
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
      const confidenceMode = evaluateConfidenceMode(cards);
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
        assistantText: aiResult.reply?.trim() || buildSearchIntroText(locale, "jobs", searchQuery),
        results: {
          type: "jobs",
          items: cards,
        },
        resumeUploadCta: hasResumeEmbedding ? undefined : buildResumeUploadCta(locale),
        debug: jobDebug,
        relatedPrompts: buildSmartRelatedPrompts(locale, "jobs", searchQuery, cards, confidenceMode),
      } satisfies AgentResponse);
    }

    if (aiResult.type === "search_service" && aiResult.intent_data) {
      const searchResult = await serviceSearchEngine(
        prisma as PrismaClient,
        aiResult.intent_data as ServiceIntentData,
      );
      const searchQuery = aiResult.intent_data.query?.trim() || lastUser.trim();
      const cards = mapServiceCards(searchResult.topResults);
      const confidenceMode = evaluateConfidenceMode(cards);
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
        assistantText: aiResult.reply?.trim() || buildSearchIntroText(locale, "services", searchQuery),
        results: {
          type: "services",
          items: cards,
        },
        debug: serviceDebug,
        relatedPrompts: buildSmartRelatedPrompts(locale, "services", searchQuery, cards, confidenceMode),
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
        assistantText: aiResult.reply?.trim() || buildSearchIntroText(locale, "tasks", searchQuery),
        relatedPrompts: buildSmartRelatedPrompts(locale, "tasks", searchQuery, [], "weak"),
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
      relatedPrompts: [],
    } satisfies AgentResponse);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 },
    );
  }
}

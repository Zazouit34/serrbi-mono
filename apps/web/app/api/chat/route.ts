import { NextRequest, NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type AgentIntent = "jobs" | "services" | "tasks";
type ScopeOverride = AgentIntent | "auto";
type ConfidenceMode = "strong" | "weak";

type AgentResponse = {
  action: "search" | "chat";
  intent: AgentIntent;
  searchQuery: string;
  assistantText?: string;
  relatedPrompts?: string[];
  intentMismatch?: { suggestedIntent: AgentIntent };
};

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
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

  // NOTE: These classification arrays still contain hardcoded fr/ar/en terms
  // They are necessary for low-level language processing for the LLM intent detection
  const greetingOrSmalltalkPhrases = [
    // English
    "hi", "hey", "hello", "yo", "good morning", "good afternoon", "good evening",
    "how are you", "who are you", "what can you do", "thanks", "thank you",
    // French
    "salut", "bonjour", "bonsoir", "coucou", "ca va", "qui es tu", "tu fais quoi", "merci",
    // Arabic
    "مرحبا", "اهلا", "أهلا", "سلام", "السلام عليكم", "كيف حالك", "شكرا", "شكرًا",
  ];

  const searchActionPhrases = [
    // English
    "find", "search", "looking for", "look for", "show me", "i need", "i want", "hire", "apply",
    // French
    "cherche", "recherche", "trouve", "montre moi", "jai besoin", "je veux",
    // Arabic / Darija common
    "بغيت", "كنقلب", "ابحث", "أبحث", "اريد", "أريد", "احتاج", "أحتاج", "وريني",
  ];

  const marketplaceNouns = [
    // English
    "job", "jobs", "work", "service", "services", "task", "tasks", "freelance",
    // French
    "emploi", "emplois", "travail", "service", "services", "mission", "tache", "taches",
    // Arabic
    "وظيفة", "وظائف", "خدمة", "خدمات", "مهمة", "مهام", "عمل",
  ];

  const constraintSignals = [
    "remote", "onsite", "hybrid", "distance", "casablanca", "rabat", "marrakech", "tangier", "agadir",
    "en ligne", "a distance", "عن بعد", "في", "بال", "budget", "salary", "wage", "prix", "salaire", "price",
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

function isComparisonQuery(query: string): boolean {
  const q = normalizeForIntent(query);
  return (
    q.includes("compare") ||
    q.includes("vs") ||
    q.includes("versus") ||
    q.includes("difference") ||
    q.includes("better") ||
    q.includes("comparer") ||
    q.includes("difference") ||
    q.includes("mieux") ||
    q.includes("مقارنة") ||
    q.includes("أفضل")
  );
}

// Simplified helper functions - no more hardcoded locale strings
// Relying on Qwen3's intelligent multi-language capabilities

function buildScopeMismatchMessage(locale: string, pinnedScope: string, suggestedIntent: string): string {
  return `I notice you're asking about ${suggestedIntent}, but you're currently in ${pinnedScope} mode. Would you like to switch?`;
}

function buildSwitchConfirmPrompt(locale: string, suggestedIntent: string): string {
  return `Yes, switch to ${suggestedIntent}`;
}

function buildStayPrompt(locale: string, pinnedScope: string): string {
  return `No, stay in ${pinnedScope} mode`;
}

function buildSmartRelatedPrompts(locale: string, intent: AgentIntent): string[] {
  // Simplified to generic English suggestions - Qwen3 will translate as needed
  if (intent === "jobs") {
    return [
      "Remote jobs in tech",
      "Entry level positions", 
      "Jobs with good benefits"
    ];
  }
  if (intent === "services") {
    return [
      "Top rated providers",
      "Affordable services",
      "Local professionals"
    ];
  }
  return [
    "Quick tasks",
    "Freelance projects", 
    "Short-term gigs"
  ];
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
    city: item.city ?? null,
    type: item.type ?? null,
    ...(includeResumeMatch && item.resumeMatch ? { resumeMatch: item.resumeMatch } : {}),
  }));
}

function mapServiceCards(items: any[]): any[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    price: item.price ?? null,
    city: item.city ?? null,
    averageRating: item.averageRating ?? null,
    numberOfReviews: item.numberOfReviews ?? 0,
  }));
}

async function callSearchAgent({
  query,
  locale,
  scope,
  categoryHint,
}: {
  query: string;
  locale: string;
  scope: ScopeOverride;
  categoryHint?: string;
}): Promise<AgentResponse> {
  // Mock implementation - replace with actual agent call
  const isSearch = isLikelySearchRequest(query);
  
  if (!isSearch) {
    return {
      action: "chat",
      intent: "jobs",
      searchQuery: "",
      assistantText: "I'm here to help you find jobs, services, or tasks. What are you looking for?",
      relatedPrompts: buildSmartRelatedPrompts(locale, "jobs"),
    };
  }

  // Determine intent from query
  const normalized = normalizeForIntent(query);
  let detectedIntent: AgentIntent = "jobs";
  
  if (normalized.includes("service") || normalized.includes("خدمة") || normalized.includes("prestataire")) {
    detectedIntent = "services";
  } else if (normalized.includes("task") || normalized.includes("mission") || normalized.includes("مهمة")) {
    detectedIntent = "tasks";
  }

  return {
    action: "search",
    intent: detectedIntent,
    searchQuery: query,
    relatedPrompts: buildSmartRelatedPrompts(locale, detectedIntent),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, locale = "en", context } = body;

    if (!query?.trim()) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Call the search agent
    const agent = await callSearchAgent({
      query: query.trim(),
      locale,
      scope: context?.scope || "auto",
      categoryHint: context?.categoryHint,
    });

    // Scope enforcement: if intent is pinned and agent returns wrong type, ask to switch
    const pinnedScope = body.context?.scope;
    if (pinnedScope && pinnedScope !== "auto" && agent.action === "search") {
      const scopeToType: Record<string, string> = {
        jobs: "jobs",
        services: "services", 
        tasks: "tasks",
      };
      const expectedIntent = scopeToType[pinnedScope];
      if (expectedIntent && agent.intent !== expectedIntent) {
        const suggestedIntent = agent.intent;
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

    if (agent.action === "chat") {
      return NextResponse.json(agent);
    }

    // For search actions, mock some results
    const mockCards = [
      { id: 1, title: "Software Developer", city: "Casablanca", wage: 15000 },
      { id: 2, title: "Product Manager", city: "Rabat", wage: 20000 },
      { id: 3, title: "UI Designer", city: "Marrakech", wage: 12000 },
    ];

    return NextResponse.json({
      ...agent,
      cards: agent.intent === "jobs" ? mapJobCards(mockCards) : mapServiceCards(mockCards),
      summary: `Found ${mockCards.length} results for "${query}"`,
    });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
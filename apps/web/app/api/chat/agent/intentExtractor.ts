import { buildIntentExtractorPrompt } from "./prompt";

type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type IntentType =
  | "conversation"
  | "search_job"
  | "search_service"
  | "search_task";

export type JobIntentData = {
  query: string;
  category?: string | null;
  locationRequirement?: string | null;
  experienceLevel?: string | null;
  type?: string | null;
  city?: string | null;
  stateAbbreviation?: string | null;
  countryIso2?: string | null;
  minWage?: number | null;
  maxWage?: number | null;
  skills?: string[];
};

export type ServiceIntentData = {
  query: string;
  serviceCategory?: string | null;
  type?: string | null;
  city?: string | null;
  stateAbbreviation?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  minAverageRating?: number | null;
  minNumberOfReviews?: number | null;
};

export type TaskIntentData = {
  query: string;
  category?: string | null;
  city?: string | null;
  stateAbbreviation?: string | null;
  minBudget?: number | null;
  maxBudget?: number | null;
};

export type IntentData = JobIntentData | ServiceIntentData | TaskIntentData;

export type AgentResponse = {
  type: IntentType;
  reply: string;
  intent_data: IntentData | null;
};

type ExtractIntentInput = {
  locale?: string;
  scope?: "auto" | "jobs" | "services" | "tasks";
  categoryHint?: string;
  message: string;
  history?: ChatMessage[];
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function pickFirstString(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

function extractAssistantText(payload: unknown): string | null {
  const json = payload as Record<string, any>;
  return pickFirstString(
    json?.output?.choices?.[0]?.message?.content,
    json?.output?.text,
    json?.output?.texts?.[0],
    json?.output?.choices?.[0]?.text,
    json?.choices?.[0]?.message?.content,
    json?.choices?.[0]?.text,
  );
}

async function callIntentLlm(messages: ChatMessage[]): Promise<string> {
  const url = getRequiredEnv("CHAT_API_URL");
  const apiKey = getRequiredEnv("DASHSCOPE_API_KEY");
  const model = "qwen3-32b";

  const dashscopeBody = {
    model,
    input: { messages },
    parameters: {
      temperature: 0.1,
      top_p: 0.9,
      max_tokens: 450,
      result_format: "message",
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

  if (!response.ok) {
    const openAiBody = {
      model,
      messages,
      temperature: 0.1,
      top_p: 0.9,
      max_tokens: 450,
      enable_thinking: false,
    };
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(openAiBody),
    });
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Intent LLM error ${response.status}${details ? `: ${details.slice(0, 300)}` : ""}`);
  }

  const json = (await response.json()) as unknown;
  const text = extractAssistantText(json);
  if (!text) throw new Error("Intent LLM returned an unexpected payload shape");
  return text;
}

function normalizeIntentType(value: unknown): IntentType | null {
  if (value === "conversation") return "conversation";
  if (value === "search_job") return "search_job";
  if (value === "search_service") return "search_service";
  if (value === "search_task") return "search_task";
  return null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function safeParseResponse(text: string): AgentResponse | null {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  const jsonSlice =
    firstBrace !== -1 && lastBrace !== -1 ? text.slice(firstBrace, lastBrace + 1) : text;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonSlice);
  } catch {
    return null;
  }

  const obj = parsed as Record<string, unknown>;
  const type = normalizeIntentType(obj.type);
  if (!type) return null;

  const reply = parseString(obj.reply) ?? "";
  const rawIntentData =
    obj.intent_data && typeof obj.intent_data === "object"
      ? (obj.intent_data as Record<string, unknown>)
      : null;

  if (type === "conversation") {
    return {
      type,
      reply: reply || "How can I help you today?",
      intent_data: null,
    };
  }

  const query = parseString(rawIntentData?.query) ?? "";
  if (!query) return null;

  if (type === "search_job") {
    const intentData: JobIntentData = {
      query,
      category: parseString(rawIntentData?.category),
      locationRequirement: parseString(rawIntentData?.locationRequirement),
      experienceLevel: parseString(rawIntentData?.experienceLevel),
      type: parseString(rawIntentData?.type),
      city: parseString(rawIntentData?.city),
      stateAbbreviation: parseString(rawIntentData?.stateAbbreviation),
      countryIso2: parseString(rawIntentData?.countryIso2),
      minWage: parseNumber(rawIntentData?.minWage),
      maxWage: parseNumber(rawIntentData?.maxWage),
      skills: parseStringArray(rawIntentData?.skills),
    };
    return { type, reply, intent_data: intentData };
  }

  if (type === "search_service") {
    const intentData: ServiceIntentData = {
      query,
      serviceCategory: parseString(rawIntentData?.serviceCategory),
      type: parseString(rawIntentData?.type),
      city: parseString(rawIntentData?.city),
      stateAbbreviation: parseString(rawIntentData?.stateAbbreviation),
      minPrice: parseNumber(rawIntentData?.minPrice),
      maxPrice: parseNumber(rawIntentData?.maxPrice),
      minAverageRating: parseNumber(rawIntentData?.minAverageRating),
      minNumberOfReviews: parseNumber(rawIntentData?.minNumberOfReviews),
    };
    return { type, reply, intent_data: intentData };
  }

  const intentData: TaskIntentData = {
    query,
    category: parseString(rawIntentData?.category),
    city: parseString(rawIntentData?.city),
    stateAbbreviation: parseString(rawIntentData?.stateAbbreviation),
    minBudget: parseNumber(rawIntentData?.minBudget),
    maxBudget: parseNumber(rawIntentData?.maxBudget),
  };
  return { type, reply, intent_data: intentData };
}

function fallbackExtractor(input: ExtractIntentInput): AgentResponse {
  const q = input.message.trim();
  const lowered = q.toLowerCase();
  if (!q) {
    return {
      type: "conversation",
      reply: "How can I help you today?",
      intent_data: null,
    };
  }

  const greetingLike =
    /^(hi|hello|hey|thanks|thank you|bonjour|salut|merci|مرحبا|شكرا|السلام عليكم)\b/i.test(q);
  if (greetingLike && q.split(/\s+/).length <= 5) {
    return {
      type: "conversation",
      reply: "How can I help you today?",
      intent_data: null,
    };
  }

  const scoped = input.scope;
  if (scoped === "jobs") {
    return { type: "search_job", reply: "", intent_data: { query: q } };
  }
  if (scoped === "services") {
    return { type: "search_service", reply: "", intent_data: { query: q } };
  }
  if (scoped === "tasks") {
    return { type: "search_task", reply: "", intent_data: { query: q } };
  }

  if (/(service|services|plumber|lawyer|doctor|electrician|خدمة|خدمات)/i.test(lowered)) {
    return { type: "search_service", reply: "", intent_data: { query: q } };
  }
  if (/(task|tasks|mission|مهمة|مهام)/i.test(lowered)) {
    return { type: "search_task", reply: "", intent_data: { query: q } };
  }
  return { type: "search_job", reply: "", intent_data: { query: q } };
}

export async function extractIntent(input: ExtractIntentInput): Promise<AgentResponse> {
  const systemPrompt = buildIntentExtractorPrompt({
    locale: input.locale,
    scope: input.scope,
    categoryHint: input.categoryHint,
  });
  const compactHistory = (input.history ?? []).slice(-6);
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...compactHistory,
    { role: "user", content: input.message },
  ];

  try {
    const raw = await callIntentLlm(messages);
    const parsed = safeParseResponse(raw);
    if (parsed) return parsed;
  } catch (error) {
    console.error("Intent extraction failed; falling back to heuristic parser", error);
  }

  return fallbackExtractor(input);
}

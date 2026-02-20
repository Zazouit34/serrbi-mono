import { NextResponse } from "next/server";

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
};

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
  - Provide 4 to 6 short, high-quality next-step prompts based on the user's goal.
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
      return NextResponse.json(parsed);
    }

    // Fallback: if the LLM didn't follow instructions, degrade gracefully.
    const scope = body.context?.scope;
    const fallbackIntent: AgentIntent =
      scope === "jobs" || scope === "services" || scope === "tasks" ? scope : "jobs";
    const lastUser =
      [...messages].reverse().find((m) => m?.role === "user" && typeof m.content === "string")?.content ??
      body.context?.query ??
      "";
    const fallbackQuery = (lastUser || "").trim();

    return NextResponse.json({
      action: "search",
      intent: fallbackIntent,
      searchQuery: fallbackQuery || "jobs",
      assistantText: "",
      relatedPrompts: [],
    } satisfies AgentResponse);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 },
    );
  }
}


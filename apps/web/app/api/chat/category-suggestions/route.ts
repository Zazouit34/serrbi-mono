import { NextResponse } from "next/server";
import { buildCategorySuggestionsPrompt } from "../agent/prompt/category-suggestions";

export const runtime = "nodejs";

type Intent = "jobs" | "services" | "tasks";
type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type SuggestionsRequest = {
  locale?: string;
  intent?: Intent;
  category?: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function extractText(json: any): string | null {
  return (
    json?.output?.choices?.[0]?.message?.content ??
    json?.output?.text ??
    json?.choices?.[0]?.message?.content ??
    json?.choices?.[0]?.text ??
    null
  );
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function safeParseSuggestions(text: string): string[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const raw = start !== -1 && end !== -1 ? text.slice(start, end + 1) : text;
  try {
    const json = JSON.parse(raw) as { suggestions?: unknown };
    return asStringArray(json?.suggestions).slice(0, 3);
  } catch {
    return [];
  }
}

async function callModel(messages: ChatMessage[]): Promise<string> {
  const url = getRequiredEnv("CHAT_API_URL");
  const apiKey = getRequiredEnv("DASHSCOPE_API_KEY");

  const baseBody = {
    model: "qwen3-32b",
    temperature: 0.5,
    top_p: 0.9,
    max_tokens: 220,
    enable_thinking: false,
  };

  let response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: baseBody.model,
      input: { messages },
      parameters: {
        temperature: baseBody.temperature,
        top_p: baseBody.top_p,
        max_tokens: baseBody.max_tokens,
        result_format: "message",
        enable_thinking: baseBody.enable_thinking,
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
        ...baseBody,
        messages,
      }),
    });
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Category suggestions failed (${response.status})${details ? `: ${details.slice(0, 240)}` : ""}`);
  }

  const json = await response.json();
  const text = extractText(json);
  if (!text) throw new Error("Invalid model response.");
  return text;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SuggestionsRequest;
    const intent = body.intent;
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const locale = typeof body.locale === "string" ? body.locale : "en";

    if (!intent || !["jobs", "services", "tasks"].includes(intent)) {
      return NextResponse.json({ error: "Invalid intent." }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "Missing category." }, { status: 400 });
    }

    const prompt = buildCategorySuggestionsPrompt({ locale, intent, category });
    const userPayload = JSON.stringify({ intent, category, locale });
    const text = await callModel([
      { role: "system", content: prompt },
      { role: "user", content: userPayload },
    ]);

    const suggestions = safeParseSuggestions(text);
    return NextResponse.json({ suggestions });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}

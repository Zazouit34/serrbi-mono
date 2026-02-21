import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildResultsSummaryPrompt } from "../agent/prompt/results";

export const runtime = "nodejs";

type Intent = "jobs" | "services" | "tasks";

type ResultsSummaryRequest = {
  locale?: string;
  intent?: Intent;
  query?: string;
  items?: unknown[];
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
  return pickFirstString(
    json?.output?.choices?.[0]?.message?.content,
    json?.output?.text,
    json?.output?.texts?.[0],
    json?.output?.choices?.[0]?.text,
    json?.choices?.[0]?.message?.content,
    json?.choices?.[0]?.text,
  );
}

async function callDashScope(messages: { role: "system" | "user"; content: string }[]): Promise<string> {
  const url = getRequiredEnv("CHAT_API_URL");
  const apiKey = getRequiredEnv("DASHSCOPE_API_KEY");
  const model = "qwen3-32b";

  const dashscopeBody = {
    model,
    input: { messages },
    parameters: {
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 500,
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
    const openaiBody = {
      model,
      messages,
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 500,
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
    throw new Error(`Results summary model call failed (${response.status})${details ? `: ${details.slice(0, 250)}` : ""}`);
  }

  const json = await response.json();
  const text = extractAssistantText(json);
  if (!text) throw new Error("Results summary model returned empty output.");
  return text.trim();
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as ResultsSummaryRequest;
    const intent = body.intent;
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const locale = typeof body.locale === "string" ? body.locale : "en";
    const items = Array.isArray(body.items) ? body.items.slice(0, 3) : [];

    if (!intent || !["jobs", "services", "tasks"].includes(intent)) {
      return NextResponse.json({ error: "Invalid intent" }, { status: 400 });
    }
    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }
    if (items.length === 0) {
      return NextResponse.json({ summary: "" });
    }

    const prompt = buildResultsSummaryPrompt({ locale, intent });
    const payload = JSON.stringify({ query, intent, items });
    const summary = await callDashScope([
      { role: "system", content: prompt },
      { role: "user", content: payload },
    ]);

    return NextResponse.json({ summary });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}

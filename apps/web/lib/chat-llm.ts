type ChatRole = "system" | "user" | "assistant";

export type ChatLlmMessage = {
  role: ChatRole;
  content: string;
};

type CallChatLlmOptions = {
  temperature?: number;
  maxTokens?: number;
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toAnthropicMessages(messages: ChatLlmMessage[]) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join("\n\n");

  const conversation = messages.filter((message) => message.role !== "system");
  const anthropicMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const message of conversation) {
    const role = message.role === "assistant" ? "assistant" : "user";
    const content = message.content.trim();
    if (!content) continue;

    const last = anthropicMessages.at(-1);
    if (last?.role === role) {
      last.content = `${last.content}\n\n${content}`;
      continue;
    }

    anthropicMessages.push({ role, content });
  }

  if (anthropicMessages.length === 0 || anthropicMessages[0]?.role !== "user") {
    anthropicMessages.unshift({ role: "user", content: "Continue." });
  }

  return { system: system || undefined, messages: anthropicMessages };
}

export async function callChatLlm(
  messages: ChatLlmMessage[],
  opts?: CallChatLlmOptions,
): Promise<string> {
  const apiKey = getRequiredEnv("ANTHROPIC_API_KEY");
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  const temperature = opts?.temperature ?? 0.4;
  const max_tokens = opts?.maxTokens ?? 700;
  const { system, messages: anthropicMessages } = toAnthropicMessages(messages);

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens,
      temperature,
      ...(system ? { system } : {}),
      messages: anthropicMessages,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `Chat LLM error ${response.status}${details ? `: ${details.slice(0, 300)}` : ""}`,
    );
  }

  const json = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const text = (json.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Chat LLM returned an unexpected payload shape");
  }

  return text;
}

export function parseJsonFromLlmText(text: string): unknown {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  const jsonSlice =
    firstBrace !== -1 && lastBrace !== -1
      ? text.slice(firstBrace, lastBrace + 1)
      : text;
  return JSON.parse(jsonSlice);
}

export async function callChatLlmJson(
  messages: ChatLlmMessage[],
  opts?: CallChatLlmOptions,
): Promise<unknown> {
  const text = await callChatLlm(messages, opts);
  return parseJsonFromLlmText(text);
}

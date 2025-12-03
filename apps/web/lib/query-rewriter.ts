const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `
You are an assistant that rewrites hiring-related search queries.
- Understand short, noisy phrases in French or English.
- Rewrite them into a concise, professional query that mixes both languages if helpful.
- Keep it under 40 words, no bullet points, no markdown, no explanations.
`.trim();

function sanitize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export async function rewriteSearchQuery(rawQuery: string): Promise<string> {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return "";
  }

  const apiKey =
    process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) {
    return trimmed;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.OPENROUTER_REFERRER || "http://localhost",
        "X-Title": "SerrbiQueryRewrite",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: "tngtech/deepseek-r1t2-chimera:free",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Réécris cette requête pour une recherche d'emploi: """${trimmed}"""`,
          },
        ],
        max_tokens: 120,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenRouter rewrite failed: ${response.status}`);
    }

    const json = (await response.json()) as any;
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("OpenRouter rewrite returned invalid payload");
    }

    const sanitized = sanitize(content).slice(0, 240);
    return sanitized || trimmed;
  } catch {
    return trimmed;
  } finally {
    clearTimeout(timeout);
  }
}


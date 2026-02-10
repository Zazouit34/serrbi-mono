/**
 * Required environment variables:
 * - EMBEDDING_API_URL  (e.g. your OpenAI-compatible or custom embedding server URL.
 *   For DashScope text-embedding-v4, you can either set this to the full endpoint:
 *     "https://dashscope-intl.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding"
 *   or just the base API URL:
 *     "https://dashscope-intl.aliyuncs.com/api/v1"
 *   (in which case the DashScope embedding path will be appended automatically).
 * - DASHSCOPE_API_KEY  (API key or shared secret for that server, if required.
 *   For DashScope, set this to your DashScope API key, e.g. "sk-...".)
 *
 * This module encapsulates all calls to the embedding provider (DashScope text-embedding-v4).
 */

const EMBEDDING_MODEL = "text-embedding-v4" as const;

interface EmbeddingApiRequest {
  model: string;
  input: string | string[];
}

interface EmbeddingApiVector {
  embedding: number[];
}

interface EmbeddingApiResponse {
  data: EmbeddingApiVector[];
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function callEmbeddingApi(
  body: EmbeddingApiRequest,
): Promise<EmbeddingApiResponse> {
  const baseUrl = getRequiredEnv("EMBEDDING_API_URL");
  const apiKey = getRequiredEnv("DASHSCOPE_API_KEY");

  // If the user provided only the DashScope base URL, append the embedding path.
  const url = baseUrl.includes("/services/embeddings/")
    ? baseUrl
    : `${baseUrl.replace(/\/$/, "")}/services/embeddings/text-embedding/text-embedding`;

  // Adapt our internal request shape to DashScope's HTTP API.
  const dashscopeBody = {
    model: body.model,
    input: {
      texts: Array.isArray(body.input) ? body.input : [body.input],
    },
    parameters: {
      output_type: "dense",
      // dimension: 1024, // Optional: set a custom embedding dimension if desired.
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(dashscopeBody),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Embedding API error (${response.status}): ${
        text || response.statusText
      }`,
    );
  }

  const json: unknown = await response.json();

  if (
    typeof json !== "object" ||
    json === null ||
    !("output" in json) ||
    typeof (json as { output: unknown }).output !== "object" ||
    (json as { output: { embeddings?: unknown } }).output.embeddings ===
      undefined ||
    !Array.isArray(
      (json as { output: { embeddings: unknown[] } }).output.embeddings,
    )
  ) {
    throw new Error("Unexpected embedding API response shape");
  }

  const embeddingsRaw = (json as {
    output: { embeddings: { embedding: unknown }[] };
  }).output.embeddings;

  const vectors: EmbeddingApiVector[] = embeddingsRaw.map((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("embedding" in item) ||
      !Array.isArray((item as { embedding: unknown }).embedding)
    ) {
      throw new Error("Invalid embedding vector in response");
    }
    const embedding = (item as { embedding: unknown[] }).embedding;
    if (!embedding.every((v) => typeof v === "number")) {
      throw new Error("Embedding vector must contain only numbers");
    }
    return { embedding: embedding as number[] };
  });

  return { data: vectors };
}

export async function embedText(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Cannot embed empty text");
  }

  const body: EmbeddingApiRequest = {
    model: EMBEDDING_MODEL,
    input: trimmed,
  };

  const result = await callEmbeddingApi(body);
  const [first] = result.data;
  if (!first) {
    throw new Error("Embedding API returned no vectors");
  }

  return first.embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const cleaned = texts.map((t) => t.trim());
  if (cleaned.length === 0) {
    return [];
  }
  if (cleaned.some((t) => !t)) {
    throw new Error("Cannot embed empty text in batch");
  }

  const body: EmbeddingApiRequest = {
    model: EMBEDDING_MODEL,
    input: cleaned,
  };

  const result = await callEmbeddingApi(body);
  if (result.data.length !== cleaned.length) {
    throw new Error(
      `Embedding API returned ${result.data.length} vectors for ${cleaned.length} inputs`,
    );
  }

  return result.data.map((v) => v.embedding);
}

 

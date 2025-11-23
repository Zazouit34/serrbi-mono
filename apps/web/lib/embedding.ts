/**
 * Required environment variables:
 * - EMBEDDING_API_URL
 * - EMBEDDING_API_KEY
 *
 * This module encapsulates all calls to the embedding provider (BAAI/bge-m3).
 */

const EMBEDDING_MODEL = "BAAI/bge-m3" as const;

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
  const url = getRequiredEnv("EMBEDDING_API_URL");
  const apiKey = getRequiredEnv("EMBEDDING_API_KEY");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
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
    !("data" in json) ||
    !Array.isArray((json as { data: unknown }).data)
  ) {
    throw new Error("Unexpected embedding API response shape");
  }

  const data = (json as { data: unknown[] }).data;

  const vectors: EmbeddingApiVector[] = data.map((item) => {
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

 

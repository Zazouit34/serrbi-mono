/**
 * Required environment variables:
 * - RERANKER_API_URL
 * - RERANKER_API_KEY
 *
 * This module encapsulates all calls to the reranker provider (BAAI/bge-reranker-v2-m3).
 */

const RERANKER_MODEL = "BAAI/bge-reranker-v2-m3" as const;

interface RerankerApiRequest {
  model: string;
  query: string;
  documents: string[];
}

interface RerankerApiResponse {
  scores: number[];
}

/**
 * Returns the value of a required environment variable or throws an error with a clear message.
 */
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Calls the reranker API and parses a well-typed response.
 */
async function callRerankerApi(
  body: RerankerApiRequest,
): Promise<RerankerApiResponse> {
  const url = getRequiredEnv("RERANKER_API_URL");
  const apiKey = getRequiredEnv("RERANKER_API_KEY");

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
      `Reranker API error (${response.status}): ${
        text || response.statusText
      }`,
    );
  }

  const json: unknown = await response.json();

  if (
    typeof json !== "object" ||
    json === null ||
    !("scores" in json) ||
    !Array.isArray((json as { scores: unknown }).scores)
  ) {
    throw new Error("Unexpected reranker API response shape");
  }

  const scoresRaw = (json as { scores: unknown[] }).scores;
  if (!scoresRaw.every((s) => typeof s === "number")) {
    throw new Error("Reranker scores must be numeric");
  }

  return { scores: scoresRaw as number[] };
}

/**
 * Rerank a list of documents for a given query using BAAI/bge-reranker-v2-m3.
 *
 * Returns an array of scores aligned with the input documents.
 */
export async function rerankPairs(
  query: string,
  docs: string[],
): Promise<number[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error("Cannot rerank with an empty query");
  }
  if (docs.length === 0) {
    return [];
  }

  const body: RerankerApiRequest = {
    model: RERANKER_MODEL,
    query: trimmedQuery,
    documents: docs,
  };

  const result = await callRerankerApi(body);
  if (result.scores.length !== docs.length) {
    throw new Error(
      `Reranker API returned ${result.scores.length} scores for ${docs.length} documents`,
    );
  }

  return result.scores;
}



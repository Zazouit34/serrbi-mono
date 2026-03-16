type ScorableWithDate = {
  createdAt: Date;
};

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function tokenize(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length) return 0;
  const size = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < size; i += 1) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function computeOverlapScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const aSet = new Set(a);
  const bSet = new Set(b);
  let overlap = 0;
  for (const token of aSet) {
    if (bSet.has(token)) overlap += 1;
  }
  return clamp01(overlap / Math.max(1, Math.min(aSet.size, bSet.size)));
}

export function computeRecencyScore(createdAt: Date): number {
  const ageMs = Date.now() - createdAt.getTime();
  const ageDays = Math.max(0, ageMs / (1000 * 60 * 60 * 24));
  // Exponential decay with ~14-day half-life.
  return clamp01(Math.exp((-Math.log(2) * ageDays) / 14));
}

type JobRankable = ScorableWithDate & {
  embedding: number[];
  title: string;
  description: string;
  tags: string[];
};

type ServiceRankable = ScorableWithDate & {
  embedding: number[];
  title: string;
  description: string;
  serviceCategory: string;
  type: string | null;
  city: string | null;
  price: number;
  averageRating: number | null;
  numberOfReviews: number;
};

function normalizeByMax(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return clamp01(value / max);
}

function computeLocationMatchScore(preferredCity: string | null | undefined, city: string | null): number {
  if (!preferredCity) return 0.6;
  if (!city) return 0;
  const wanted = preferredCity.trim().toLowerCase();
  const got = city.trim().toLowerCase();
  if (!wanted || !got) return 0;
  if (wanted === got) return 1;
  return got.includes(wanted) || wanted.includes(got) ? 0.8 : 0;
}

function computePriceFitScore(
  price: number,
  minPrice: number | null | undefined,
  maxPrice: number | null | undefined,
): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  const min = minPrice ?? null;
  const max = maxPrice ?? null;

  if (min == null && max == null) return 0.6;

  if (min != null && max != null) {
    if (price >= min && price <= max) return 1;
    const span = Math.max(1, max - min);
    if (price < min) return clamp01(1 - (min - price) / span);
    return clamp01(1 - (price - max) / span);
  }

  if (min != null) {
    if (price >= min) return 1;
    return clamp01(price / Math.max(1, min));
  }

  if (max != null) {
    if (price <= max) return 1;
    return clamp01(max / price);
  }

  return 0.6;
}

export function rankJobs<T extends JobRankable>(args: {
  items: T[];
  queryEmbedding: number[] | null;
  overlapTokens: string[];
}): Array<T & { finalScore: number; semanticScore: number; overlapScore: number; recencyScore: number }> {
  const { items, queryEmbedding, overlapTokens } = args;
  const scored = items.map((item) => {
    const semanticScore =
      queryEmbedding && item.embedding.length > 0
        ? clamp01((cosineSimilarity(queryEmbedding, item.embedding) + 1) / 2)
        : 0;
    const jobTextTokens = tokenize(`${item.title} ${item.description}`);
    const jobTagTokens = item.tags.flatMap((tag) => tokenize(tag));
    const overlapScore = clamp01(computeOverlapScore(overlapTokens, [...jobTextTokens, ...jobTagTokens]));
    const recencyScore = computeRecencyScore(item.createdAt);
    const finalScore = 0.5 * semanticScore + 0.3 * overlapScore + 0.2 * recencyScore;

    return { ...item, semanticScore, overlapScore, recencyScore, finalScore };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);
  return scored;
}

export function rankServices<T extends ServiceRankable>(args: {
  items: T[];
  queryEmbedding: number[] | null;
  queryTokens: string[];
  preferredCity?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
}): Array<
  T & {
    finalScore: number;
    matchPercent: number;
    semanticScore: number;
    ratingScore: number;
    reviewsScore: number;
    locationScore: number;
    priceScore: number;
    selectionReasons: string[];
    confidenceSignals: string[];
  }
> {
  const { items, queryEmbedding, queryTokens, preferredCity, minPrice, maxPrice } = args;
  const maxReviews = items.reduce((acc, item) => Math.max(acc, item.numberOfReviews || 0), 0);

  const scored = items.map((item) => {
    const semanticScore =
      queryEmbedding && item.embedding.length > 0
        ? clamp01((cosineSimilarity(queryEmbedding, item.embedding) + 1) / 2)
        : clamp01(
            computeOverlapScore(
              queryTokens,
              tokenize(`${item.title} ${item.description} ${item.serviceCategory} ${item.type ?? ""}`),
            ),
          );

    const ratingScore = clamp01((item.averageRating ?? 0) / 5);
    const reviewsScore = normalizeByMax(item.numberOfReviews ?? 0, maxReviews);
    const locationScore = computeLocationMatchScore(preferredCity, item.city);
    const priceScore = computePriceFitScore(item.price, minPrice, maxPrice);

    const finalScore =
      0.25 * semanticScore +
      0.28 * ratingScore +
      0.17 * reviewsScore +
      0.15 * locationScore +
      0.15 * priceScore;

    const selectionReasons: string[] = [];
    if (ratingScore >= 0.8) selectionReasons.push("Top-rated provider");
    if (reviewsScore >= 0.55) selectionReasons.push("Strong customer review volume");
    if (locationScore >= 0.8) selectionReasons.push("Close to your preferred location");
    if (priceScore >= 0.8) selectionReasons.push("Price aligns with your budget");
    if (semanticScore >= 0.65) selectionReasons.push("Strong relevance to your request");

    const confidenceSignals: string[] = [];
    if (typeof item.averageRating === "number" && item.numberOfReviews > 0) {
      confidenceSignals.push(`Rated ${item.averageRating.toFixed(1)}/5 (${item.numberOfReviews} reviews)`);
    }
    if (item.price > 0) confidenceSignals.push(`Price: ${Math.round(item.price)} MAD`);
    if (item.city) confidenceSignals.push(`Location: ${item.city}`);
    if (item.numberOfReviews >= 25) confidenceSignals.push("Frequently booked");

    return {
      ...item,
      matchPercent: Math.round(clamp01(finalScore) * 100),
      semanticScore,
      ratingScore,
      reviewsScore,
      locationScore,
      priceScore,
      finalScore,
      selectionReasons: selectionReasons.slice(0, 3),
      confidenceSignals: confidenceSignals.slice(0, 3),
    };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);
  return scored;
}

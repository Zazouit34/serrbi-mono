export type AutoApplyReasonCode =
  | "resume-semantic"
  | "keyword-hit"
  | "role-hit"
  | "fresh-post"
  | "location-context"
  | "worktype-context";

export type AutoApplyReason = {
  code: AutoApplyReasonCode;
  value?: string;
};

export type AutoApplyRankableJob = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  city: string | null;
  type: string | null;
  createdAt: Date;
  embedding: number[];
};

export type AutoApplyScoredJob<T extends AutoApplyRankableJob> = T & {
  finalScore: number;
  matchPercent: number;
  semanticScore: number;
  keywordScore: number;
  roleScore: number;
  recencyScore: number;
  keywordHits: string[];
  roleHits: string[];
  reasons: AutoApplyReason[];
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function tokenize(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff+.#\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function cosineSimilarity(a: number[], b: number[]): number {
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

function computeRecencyScore(createdAt: Date): number {
  const ageMs = Date.now() - createdAt.getTime();
  const ageDays = Math.max(0, ageMs / (1000 * 60 * 60 * 24));
  return clamp01(Math.exp((-Math.log(2) * ageDays) / 14));
}

export function scoreAutoApplyJob<T extends AutoApplyRankableJob>(args: {
  job: T;
  keywords: string[];
  roles: string[];
  resumeEmbedding?: number[] | null;
  maxReasons?: number;
  /** When true, resume embedding is ignored regardless of availability (Smart Outreach off) */
  disableEmbedding?: boolean;
}): AutoApplyScoredJob<T> {
  const { job } = args;
  const keywords = args.keywords ?? [];
  const roles = args.roles ?? [];
  const maxReasons = args.maxReasons ?? 3;
  const resumeEmbedding = args.disableEmbedding ? null : (args.resumeEmbedding ?? null);

  const textTokens = new Set(tokenize(`${job.title ?? ""} ${job.description ?? ""}`));
  const titleTokens = new Set(tokenize(`${job.title ?? ""}`));
  const tagTokens = new Set((job.tags ?? []).flatMap((tag) => tokenize(tag)));
  const jobTokens = new Set<string>([...textTokens, ...tagTokens]);

  const keywordHits = (keywords || []).filter((kw) => {
    const normalized = tokenize(kw);
    return normalized.some((token) => jobTokens.has(token));
  });
  const roleHits = (roles || []).filter((role) => {
    const normalized = tokenize(role);
    return normalized.some((token) => titleTokens.has(token));
  });

  const keywordScore = clamp01(
    keywordHits.length /
      Math.max(1, Math.min((keywords || []).length || 1, 5)),
  );
  const roleScore = clamp01(
    roleHits.length /
      Math.max(1, Math.min((roles || []).length || 1, 4)),
  );
  const recencyScore = computeRecencyScore(job.createdAt);

  const hasResumeEmbedding =
    Array.isArray(resumeEmbedding) &&
    resumeEmbedding.length > 0 &&
    Array.isArray(job.embedding) &&
    job.embedding.length > 0;

  const semanticScore = hasResumeEmbedding
    ? clamp01((cosineSimilarity(resumeEmbedding as number[], job.embedding) + 1) / 2)
    : 0;

  const finalScore = hasResumeEmbedding
    ? 0.55 * semanticScore + 0.2 * keywordScore + 0.15 * roleScore + 0.1 * recencyScore
    : 0.45 * keywordScore + 0.35 * roleScore + 0.2 * recencyScore;

  const reasons: AutoApplyReason[] = [];
  if (hasResumeEmbedding) reasons.push({ code: "resume-semantic" });
  if (keywordHits.length > 0) reasons.push({ code: "keyword-hit", value: keywordHits[0] });
  if (roleHits.length > 0) reasons.push({ code: "role-hit", value: roleHits[0] });

  const ageHours = Math.max(0, (Date.now() - job.createdAt.getTime()) / (1000 * 60 * 60));
  if (ageHours <= 72) reasons.push({ code: "fresh-post" });
  if (job.city) reasons.push({ code: "location-context", value: job.city });
  else if (job.type) reasons.push({ code: "worktype-context", value: job.type });

  return {
    ...job,
    finalScore,
    matchPercent: Math.round(clamp01(finalScore) * 100),
    semanticScore,
    keywordScore,
    roleScore,
    recencyScore,
    keywordHits: keywordHits.slice(0, 5),
    roleHits: roleHits.slice(0, 5),
    reasons: reasons.slice(0, maxReasons),
  };
}


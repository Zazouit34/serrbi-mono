import {
  GREETING_PHRASES,
  SEARCH_ACTION_PHRASES,
  MARKETPLACE_NOUNS,
  CONSTRAINT_SIGNALS,
  JOB_CATEGORY_KEYWORDS,
  SERVICE_CATEGORY_KEYWORDS,
  EXPLICIT_SERVICE_KEYWORDS,
  EXPLICIT_TASK_KEYWORDS,
  EXPLICIT_JOB_KEYWORDS,
} from "./keywords";

function normalizeForIntent(text: string): string {
  return text
    ? text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[.,!?;:()[\]{}'"`~@#$%^&*_+=<>|\\/.-]/g, " ")
        .replace(/\s+/g, " ")
    : "";
}

function countPhraseHits(text: string, phrases: readonly string[]): number {
  let score = 0;
  for (const phrase of phrases) {
    if (text.includes(phrase)) score += 1;
  }
  return score;
}

export function classifyTurnIntent(text: string): "chat" | "search" {
  const normalized = normalizeForIntent(text);
  if (!normalized) return "chat";
  const tokens = normalized.split(" ").filter(Boolean);

  let chatScore = 0;
  let searchScore = 0;

  chatScore += countPhraseHits(normalized, GREETING_PHRASES);
  searchScore += countPhraseHits(normalized, SEARCH_ACTION_PHRASES);
  searchScore += countPhraseHits(normalized, MARKETPLACE_NOUNS) * 2;
  searchScore += countPhraseHits(normalized, CONSTRAINT_SIGNALS);

  if (/\b\d{2,}\b/.test(normalized)) searchScore += 1;
  if (/(dh|mad|usd|eur|\$|€)/.test(text.toLowerCase())) searchScore += 1;

  const hasMarketplaceNoun = MARKETPLACE_NOUNS.some((w) => tokens.includes(w));
  const hasSearchAction = SEARCH_ACTION_PHRASES.some((p) => normalized.includes(p));

  if (!hasMarketplaceNoun && !hasSearchAction && tokens.length <= 3) chatScore += 2;

  if (
    normalized.includes("who are you") ||
    normalized.includes("what can you do") ||
    normalized.includes("qui es tu") ||
    normalized.includes("شنو تقدر") ||
    normalized.includes("ماذا تستطيع")
  ) {
    chatScore += 3;
  }

  if (searchScore < 2) chatScore += 1;

  return searchScore >= chatScore + 1 ? "search" : "chat";
}

export function inferJobCategoryFromText(query: string, skills?: string[]): string | null {
  const text = `${query} ${(skills ?? []).join(" ")}`;
  const normalized = normalizeForIntent(text);

  for (const [category, keywords] of Object.entries(JOB_CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => normalized.includes(k.toLowerCase()))) {
      return category;
    }
  }
  return null;
}

export function inferServiceCategoryFromText(query: string): string | null {
  const normalized = normalizeForIntent(query);

  for (const [category, keywords] of Object.entries(SERVICE_CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => normalized.includes(k.toLowerCase()))) {
      return category;
    }
  }
  return null;
}

export function isExplicitIntentSwitch(query: string, targetType: string): boolean {
  const q = normalizeForIntent(query);
  if (targetType === "search_service")
    return EXPLICIT_SERVICE_KEYWORDS.some((k) => q.includes(k));
  if (targetType === "search_task")
    return EXPLICIT_TASK_KEYWORDS.some((k) => q.includes(k));
  if (targetType === "search_job")
    return EXPLICIT_JOB_KEYWORDS.some((k) => q.includes(k));
  return false;
}

export function isGreetingOrSmallTalk(text: string): boolean {
  return classifyTurnIntent(text) === "chat";
}

export function isLikelySearchRequest(text: string): boolean {
  return classifyTurnIntent(text) === "search";
}

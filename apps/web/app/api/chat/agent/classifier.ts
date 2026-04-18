import {
  GREETING_PHRASES,
  SEARCH_ACTION_PHRASES,
  MARKETPLACE_NOUNS,
  CONSTRAINT_SIGNALS,
  JOB_LABEL_INDEX,
  SERVICE_LABEL_INDEX,
  EXPLICIT_SERVICE_KEYWORDS,
  EXPLICIT_TASK_KEYWORDS,
  EXPLICIT_JOB_KEYWORDS,
  normalizeIntentText,
  type LabelIndexMatch,
} from "./keywords";

function normalizeForIntent(text: string): string {
  return normalizeIntentText(text);
}

function classifyFromLabelIndex(
  text: string,
  labelIndex: Map<string, LabelIndexMatch>,
): { category: string; typeKey: string } | null {
  const normalized = normalizeForIntent(text);
  if (!normalized) return null;

  const words = normalized.split(" ").filter(Boolean);
  const maxPhraseLength = Math.min(words.length, 5);

  for (let len = maxPhraseLength; len >= 1; len -= 1) {
    for (let i = 0; i <= words.length - len; i += 1) {
      const phrase = words.slice(i, i + len).join(" ");
      const match = labelIndex.get(phrase);
      if (match) {
        return {
          category: match.category,
          typeKey: match.key,
        };
      }
    }
  }

  return null;
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

  // Check if the query contains a job or service category keyword
  // Single professional terms ("ميكانيكي", "graphic designer", "plumber") are searches
  const isJobCategoryKeyword = classifyJobQuery(normalized) !== null;
  const isServiceCategoryKeyword = classifyServiceQuery(normalized) !== null;

  if (isJobCategoryKeyword || isServiceCategoryKeyword) {
    searchScore += 3; // strong signal — professional keyword always means search
  }

  return searchScore >= chatScore + 1 ? "search" : "chat";
}

export function classifyJobQuery(query: string, skills?: string[]): {
  category: string;
  typeKey: string;
} | null {
  const text = `${query} ${(skills ?? []).join(" ")}`;
  return classifyFromLabelIndex(text, JOB_LABEL_INDEX);
}

export function inferJobCategoryFromText(query: string, skills?: string[]): string | null {
  return classifyJobQuery(query, skills)?.category ?? null;
}

export function classifyServiceQuery(query: string): {
  category: string;
  typeKey: string;
} | null {
  return classifyFromLabelIndex(query, SERVICE_LABEL_INDEX);
}

export function inferServiceCategoryFromText(query: string): string | null {
  return classifyServiceQuery(query)?.category ?? null;
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

import type { JobIntentData } from "./intentExtractor";
import {
  inferJobCategoryFromText,
  isLikelySearchRequest,
  isGreetingOrSmallTalk,
  isExplicitIntentSwitch,
} from "./classifier";

type ReadinessResult =
  | { ready: true }
  | { ready: false; missingField: "category" | "location" | "both" };

export function checkJobSearchReadiness(intentData: JobIntentData): ReadinessResult {
  if (!intentData.query?.trim()) {
    return { ready: false, missingField: "category" };
  }

  const hasCategory =
    Boolean(intentData.category) ||
    inferJobCategoryFromText(intentData.query, intentData.skills ?? []) !== null;

  if (!hasCategory) {
    return { ready: false, missingField: "category" };
  }

  return { ready: true };
}

export function shouldBypassIntentLlm(opts: {
  scope: string | undefined;
  query: string;
}): boolean {
  const { scope, query } = opts;

  if (!scope || scope === "auto") return false;

  const wordCount = query.split(" ").filter(Boolean).length;
  if (wordCount <= 3) return false;

  if (!isLikelySearchRequest(query)) return false;
  if (isGreetingOrSmallTalk(query)) return false;

  return true;
}

export function checkScopeGuard(opts: {
  pinnedScope: string;
  extractedType: string;
  query: string;
}):
  | { mismatch: false }
  | { mismatch: true; suggestedIntent: string; isExplicit: boolean } {
  const { pinnedScope, extractedType, query } = opts;

  const scopeToType: Record<string, string> = {
    jobs: "search_job",
    services: "search_service",
    tasks: "search_task",
  };

  const expectedType = scopeToType[pinnedScope];
  if (!expectedType || extractedType === expectedType) {
    return { mismatch: false };
  }

  const isExplicit = isExplicitIntentSwitch(query, extractedType);

  const suggestedIntent =
    extractedType === "search_service"
      ? "services"
      : extractedType === "search_task"
        ? "tasks"
        : "jobs";

  return {
    mismatch: true,
    suggestedIntent,
    isExplicit,
  };
}

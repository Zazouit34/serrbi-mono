import type { JobIntentData, ServiceIntentData } from "./intentExtractor";
import {
  classifyServiceQuery,
  inferJobCategoryFromText,
  inferServiceCategoryFromText,
  isExplicitIntentSwitch,
} from "./classifier";

export type SuggestionPrompt = {
  label: string;
  query: string;
};

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

  // Location is intentionally NOT required: searching immediately across all
  // locations and letting the user refine afterwards feels smarter than
  // interrogating them turn after turn.
  if (!hasCategory) {
    return { ready: false, missingField: "category" };
  }

  return { ready: true };
}

export function checkServiceSearchReadiness(intentData: ServiceIntentData): 
  | { ready: true }
  | { ready: false; reason: "too_vague" } {
  
  const query = intentData.query?.trim() ?? "";
  
  // If serviceCategory was extracted → always ready
  if (intentData.serviceCategory || intentData.typeKey) return { ready: true };
  
  // If query is very short and generic with no category keyword → ask for type
  const inferredCategory = inferServiceCategoryFromText(query);
  const inferredClassification = classifyServiceQuery(query);
  if (inferredCategory || inferredClassification) return { ready: true };
  
  // Query is too vague — "أفضل خدمة", "best service", "un service"
  const isTooVague = query.split(" ").filter(Boolean).length <= 3 && !inferredCategory;
  if (isTooVague) return { ready: false, reason: "too_vague" };
  
  // Default: proceed — longer queries have enough semantic content for embedding search
  return { ready: true };
}

export function detectExplicitIntentOverride(
  query: string,
  currentScope: string,
): "search_service" | "search_task" | "search_job" | null {
  if (currentScope === "jobs") {
    if (isExplicitIntentSwitch(query, "search_service")) return "search_service";
    if (isExplicitIntentSwitch(query, "search_task")) return "search_task";
  }
  if (currentScope === "services") {
    if (isExplicitIntentSwitch(query, "search_job")) return "search_job";
    if (isExplicitIntentSwitch(query, "search_task")) return "search_task";
  }
  if (currentScope === "tasks") {
    if (isExplicitIntentSwitch(query, "search_job")) return "search_job";
    if (isExplicitIntentSwitch(query, "search_service")) return "search_service";
  }
  return null;
}

// ─── DB-grounded suggestion generation ─────────────────────────────────────

type RankedJobLike = {
  city?: string | null;
  locationRequirement?: string | null;
  experienceLevel?: string | null;
  category?: string | null;
};

export function generateDbGroundedSuggestions(opts: {
  topResults: RankedJobLike[];
  suggestionPool: RankedJobLike[];
  intentData: JobIntentData;
}): SuggestionPrompt[] {
  const { topResults, suggestionPool, intentData } = opts;
  const suggestions: SuggestionPrompt[] = [];

  const topCities = new Set(topResults.map(j => j.city?.toLowerCase()).filter(Boolean));
  const topLocReqs = new Set(topResults.map(j => j.locationRequirement?.toLowerCase()).filter(Boolean));
  const topLevels = new Set(topResults.map(j => j.experienceLevel?.toLowerCase()).filter(Boolean));

  const remoteJobs = suggestionPool.filter(j => j.locationRequirement === "remote");
  const hybridJobs = suggestionPool.filter(j => j.locationRequirement === "hybrid");
  const allTopRemote = topLocReqs.size > 0 && [...topLocReqs].every(r => r === "remote");
  const allTopOnsite = topLocReqs.size > 0 && [...topLocReqs].every(r => r === "in_office");
  const category = intentData.category ?? topResults[0]?.category ?? "";

  if (!allTopRemote && remoteJobs.length >= 2) {
    suggestions.push({
      label: `remote:${category}`,
      query: `${intentData.query?.trim() ?? ""} remote`.trim(),
    });
  } else if (!allTopOnsite && hybridJobs.length >= 2) {
    suggestions.push({
      label: `hybrid:${category}`,
      query: `${intentData.query?.trim() ?? ""} hybrid`.trim(),
    });
  }

  const citiesInPool = suggestionPool
    .map(j => j.city)
    .filter((c): c is string => !!c && !topCities.has(c.toLowerCase()));
  const uniqueAlternateCities = [...new Set(citiesInPool)].slice(0, 1);

  for (const city of uniqueAlternateCities) {
    if (suggestions.length >= 2) break;
    const jobsInCity = suggestionPool.filter(
      j => j.city?.toLowerCase() === city.toLowerCase()
    );
    if (jobsInCity.length >= 1) {
      suggestions.push({
        label: `city:${city}:${category}`,
        query: `${intentData.query?.trim() ?? ""} ${city}`.trim(),
      });
    }
  }

  const levelsInPool = suggestionPool
    .map(j => j.experienceLevel)
    .filter((l): l is string => !!l && !topLevels.has(l.toLowerCase()));
  const alternateLevel = [...new Set(levelsInPool)][0];

  if (alternateLevel && suggestions.length < 3) {
    suggestions.push({
      label: `level:${alternateLevel}:${category}`,
      query: `${intentData.query?.trim() ?? ""} ${alternateLevel}`.trim(),
    });
  }

  return suggestions.slice(0, 3);
}

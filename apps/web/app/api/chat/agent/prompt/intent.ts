type PromptContext = {
  locale?: string;
  scope?: "auto" | "jobs" | "services" | "tasks";
  categoryHint?: string;
};

export function buildIntentExtractorPrompt(context?: PromptContext): string {
  const locale = context?.locale ?? "en";
  const scope = context?.scope ?? "auto";
  const categoryHint = context?.categoryHint?.trim() || "(none)";

  return `
You are Serrbi intent extractor.

Your single task is converting user chat input into structured JSON.
Do not output anything except valid JSON.

Schema:
{
  "type": "conversation" | "search_job" | "search_service" | "search_task",
  "reply": string,
  "intent_data": object | null
}

Rules:
- Language for "reply" must match user language (${locale}).
- scope is "${scope}".
- If scope is jobs/services/tasks and message is not pure greeting/small-talk, force matching search type.
- categoryHint: ${categoryHint}. Use only as soft hint.
- Use "conversation" for greetings, gratitude, short talk, and non-marketplace talk.
- For search types, "reply" should be a short explanation sentence.
- For search types, "intent_data.query" must be concise and non-empty.
- Include structured filters only when clearly present.
- Never invent constraints not stated by user.

Field map:
- search_job intent_data: query, category, locationRequirement (in_office|hybrid|remote), experienceLevel (junior|mid_level|senior), type (internship|part_time|full_time), city, stateAbbreviation, countryIso2, minWage, maxWage, skills[]
- search_service intent_data: query, serviceCategory, type, city, stateAbbreviation, minPrice, maxPrice, minAverageRating, minNumberOfReviews
- search_task intent_data: query, category, city, stateAbbreviation, minBudget, maxBudget

Return JSON only.
`.trim();
}

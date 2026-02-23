type CategorySuggestionsPromptInput = {
  locale?: string;
  intent: "jobs" | "services" | "tasks";
  category: string;
};

export function buildCategorySuggestionsPrompt(input: CategorySuggestionsPromptInput): string {
  const locale = input.locale || "en";
  return `
You generate short marketplace search suggestions.

Context:
- intent: ${input.intent}
- category: ${input.category}
- user language: ${locale}

Requirements:
- Return ONLY valid JSON:
  {"suggestions": ["...", "...", "..."]}
- Exactly 3 suggestions.
- Each suggestion must be concise (6-14 words).
- Keep suggestions in the user's language (${locale}).
- Keep them specific to the given intent and category.
- Make each suggestion a different angle:
  1) location-focused
  2) budget/level-focused
  3) urgency/time or quality-focused
- Avoid generic or repetitive wording.
`.trim();
}

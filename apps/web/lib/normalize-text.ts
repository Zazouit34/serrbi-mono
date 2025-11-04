/**
 * Normalizes text for fuzzy search by:
 * - Converting to lowercase
 * - Decomposing accented characters
 * - Removing diacritical marks
 * - Trimming whitespace
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
    .trim();
}


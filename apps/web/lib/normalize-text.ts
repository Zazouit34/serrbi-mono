// src/lib/normalize-text.ts
export function normalizeText(str: string): string {
    if (!str) return "";
    return str
      .normalize("NFD") // Split letters and accents
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .toLowerCase()
      .trim();
  }
  
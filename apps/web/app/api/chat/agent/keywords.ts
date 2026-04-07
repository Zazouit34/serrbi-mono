import jobTypesData from "./jobTypes.json";
import serviceTypesData from "./serviceTypes.json";

type LabelsByLanguage = Record<string, string[]>;

export type ServiceTypeEntry = {
  key: string;
  category: string;
  dbTypeValues: string[];
  labels: LabelsByLanguage;
};

export type JobTypeEntry = {
  key: string;
  category: string;
  labels: LabelsByLanguage;
};

export type LabelIndexMatch = {
  key: string;
  category: string;
};

export function normalizeIntentText(text: string): string {
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

function buildTypeIndex<TType extends { key: string }>(types: readonly TType[]): Map<string, TType> {
  const index = new Map<string, TType>();
  for (const type of types) {
    index.set(normalizeIntentText(type.key), type);
  }
  return index;
}

function buildLabelIndex<TType extends { key: string; category: string }>(
  types: readonly TType[],
  getLabels: (type: TType) => string[],
): Map<string, LabelIndexMatch> {
  const index = new Map<string, LabelIndexMatch>();

  for (const type of types) {
    for (const rawLabel of getLabels(type)) {
      const normalized = normalizeIntentText(rawLabel);
      if (!normalized || index.has(normalized)) continue;
      index.set(normalized, { key: type.key, category: type.category });
    }
  }

  return index;
}

export const SERVICE_TYPES = serviceTypesData as ServiceTypeEntry[];
export const JOB_TYPES = jobTypesData as JobTypeEntry[];

export const SERVICE_TYPE_INDEX = buildTypeIndex(SERVICE_TYPES);
export const JOB_TYPE_INDEX = buildTypeIndex(JOB_TYPES);

export const SERVICE_LABEL_INDEX = buildLabelIndex(SERVICE_TYPES, (type) => [
  type.key.replace(/_/g, " "),
  ...type.dbTypeValues,
  ...Object.values(type.labels).flat(),
]);

export const JOB_LABEL_INDEX = buildLabelIndex(JOB_TYPES, (type) => [
  type.key.replace(/_/g, " "),
  ...Object.values(type.labels).flat(),
]);

export function getServiceTypeEntry(typeKey: string): ServiceTypeEntry | null {
  return SERVICE_TYPE_INDEX.get(normalizeIntentText(typeKey)) ?? null;
}

export function getServiceDbTypeValues(typeKey: string): string[] {
  return getServiceTypeEntry(typeKey)?.dbTypeValues ?? [];
}

// Greeting signals — any message matching these is conversation, never search
export const GREETING_PHRASES = [
  // English
  "hi", "hey", "hello", "yo", "good morning", "good afternoon", "good evening",
  "how are you", "who are you", "what can you do", "thanks", "thank you",
  // French
  "salut", "bonjour", "bonsoir", "coucou", "ca va", "qui es tu",
  "tu fais quoi", "merci",
  // Arabic / Darija
  "مرحبا", "اهلا", "أهلا", "سلام", "السلام عليكم", "كيف حالك",
  "شكرا", "شكرًا", "واش لاباس", "لاباس",
] as const;

// Search action signals
export const SEARCH_ACTION_PHRASES = [
  // English
  "find", "search", "looking for", "look for", "show me",
  "i need", "i want", "hire", "apply",
  // French
  "cherche", "recherche", "trouve", "montre moi", "jai besoin", "je veux",
  // Arabic / Darija
  "بغيت", "كنقلب", "ابحث", "أبحث", "اريد", "أريد",
  "احتاج", "أحتاج", "وريني",
] as const;

// Marketplace nouns — strong search signal
export const MARKETPLACE_NOUNS = [
  "job", "jobs", "work", "service", "services", "task", "tasks", "freelance",
  "emploi", "emplois", "travail", "mission", "tache", "taches",
  "وظيفة", "وظائف", "خدمة", "خدمات", "مهمة", "مهام", "عمل",
] as const;

// Location / constraint signals
export const CONSTRAINT_SIGNALS = [
  "remote", "onsite", "hybrid", "à distance", "en ligne", "présentiel",
  "casablanca", "rabat", "marrakech", "tangier", "agadir", "fes", "meknes",
  "tanger", "kenitra", "salé", "الدار البيضاء", "الرباط", "مراكش", "أكادير",
  "budget", "salary", "wage", "prix", "salaire", "price", "راتب",
  "عن بعد", "حضوري",
  "temps plein", "temps partiel", "full-time", "part-time",
  "full time", "part time", "دوام كامل", "دوام جزئي",
  "cdi", "cdd", "contrat", "stage", "internship",
] as const;

// Explicit intent switch keywords — used to detect clear scope change
export const EXPLICIT_SERVICE_KEYWORDS = [
  "plumber", "electrician", "cleaner", "mechanic", "painter", "carpenter",
  "plombier", "électricien", "nettoyage", "mécanicien", "peintre",
  "سباك", "كهربائي", "نجار", "ميكانيكي", "دهان",
  "service", "services", "خدمة", "خدمات",
  "dentist", "dentiste", "طبيب أسنان",
  "gynecologist", "gynécologue",
  "dermatologist", "dermatologue",
  "doctor", "docteur", "médecin", "طبيب",
  "veterinarian", "vétérinaire", "بيطري",
  "rendez-vous", "rendez vous", "appointment", "موعد",
] as const;

export const EXPLICIT_TASK_KEYWORDS = [
  "task", "tasks", "mission", "gig", "freelance",
  "tâche", "tâches", "مهمة", "مهام",
] as const;

export const EXPLICIT_JOB_KEYWORDS = [
  "job", "jobs", "work", "hire", "recruit", "employ",
  "emploi", "emplois", "travail", "poste",
  "وظيفة", "وظائف", "عمل",
] as const;

export const PROXIMITY_SIGNALS = [
  "near me", "nearby", "close to me", "around me",
  "في موقعي", "قريب مني", "بالقرب مني", "حولي",
  "près de moi", "à proximité", "autour de moi", "proche",
] as const;

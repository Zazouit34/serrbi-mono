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

// Job category keyword map — maps to your JobCategory enum values
export const JOB_CATEGORY_KEYWORDS: Record<string, string[]> = {
  Tech: [
    "developer", "developpeur", "dev", "software", "frontend", "backend",
    "fullstack", "full stack", "data", "engineer", "ingénieur", "it",
    "tech", "programmer", "programmeur", "informatique", "devops",
    "mobile", "android", "ios", "react", "node", "python", "java",
    "مطور", "برمجة", "تقنية", "مهندس", "حاسوب",
    "graphic designer", "graphiste", "graphic design", "مصمم جرافيك",
    "designer", "design graphique", "creative director", "directeur créatif",
    "ui designer", "ux designer", "ui/ux", "product designer",
    "motion designer", "illustrateur", "illustrator",
  ],
  Finance: [
    "finance", "accountant", "accounting", "comptable", "audit", "auditor",
    "bank", "banque", "contrôleur", "trésorier", "analyste financier",
    "محاسب", "مالية", "بنك", "محاسبة",
  ],
  Health: [
    "doctor", "médecin", "docteur", "nurse", "infirmier", "infirmière", "medical",
    "médical", "sante", "santé", "health", "pharmac", "pharmacie",
    "clinique", "hôpital", "urgences",
    "طبيب", "ممرض", "صحة", "دكتور", "صيدلية",
    "dentist", "dentiste", "طبيب أسنان",
    "gynecologist", "gynécologue",
    "dermatologist", "dermatologue",
    "ophthalmologist", "ophtalmologue",
    "cardiologist", "cardiologue",
    "pediatrician", "pédiatre",
    "psychiatrist", "psychiatre",
    "veterinarian", "vétérinaire",
    "general practitioner", "généraliste", "médecin généraliste",
  ],
  Legal: [
    "lawyer", "avocat", "legal", "juridique", "notaire", "juriste",
    "droit", "law", "محامي", "قانون", "قضاء",
  ],
  Education: [
    "teacher", "professeur", "prof", "enseignant", "education", "éducation",
    "formateur", "instructor", "tuteur", "pédagogue",
    "معلم", "أستاذ", "تعليم", "مدرس",
  ],
  Construction: [
    "construction", "builder", "bâtiment", "mason", "maçon", "plumbing",
    "plomberie", "electric", "électricité", "chantier", "génie civil",
    "بناء", "مقاول", "بنّاء",
  ],
  Hospitality: [
    "hotel", "hôtel", "restaurant", "hospitality", "hôtellerie",
    "serveur", "serveuse", "waiter", "cuisine", "cuisinier", "chef",
    "réception", "réceptionniste", "accueil", "tourisme",
    "فندق", "استقبال", "مطعم", "نادل", "طباخ", "سياحة",
  ],
  CallCenter: [
    "call center", "centre d'appel", "customer support", "service client",
    "téléconseiller", "téléopérateur", "hotline",
    "دعم عملاء", "مركز اتصال", "خدمة عملاء",
  ],
  Auto: [
    "mechanic", "mécanicien", "garage", "automotive", "automobile",
    "auto", "car repair", "carrossier",
    "ميكانيكي", "كراج", "سيارات",
  ],
  Cleaning: [
    "cleaning", "cleaner", "nettoyage", "ménage", "entretien",
    "agent d'entretien",
    "نظافة", "تنظيف",
  ],
};

// Service category keyword map — maps to your ServiceCategory enum values
export const SERVICE_CATEGORY_KEYWORDS: Record<string, string[]> = {
  HomeMaintenance: [
    "plumber", "plombier", "سباك", "سباكة",
    "electrician", "électricien", "كهربائي", "كهرباء",
    "painter", "peintre", "دهان",
    "carpenter", "menuisier", "نجار",
    "locksmith", "serrurier",
    "cleaning", "nettoyage", "نظافة", "تنظيف",
    "maintenance", "entretien", "صيانة",
    "repair", "réparation", "تصليح", "إصلاح",
  ],
  ConstructionInstallation: [
    "construction", "بناء", "architect", "architecture", "هندسة",
    "renovation", "ترميم", "maçonnerie",
  ],
  HealthWellness: [
    "doctor", "médecin", "طبيب", "docteur",
    "nurse", "infirmier", "ممرض",
    "therapist", "thérapeute", "معالج",
    "nutrition", "تغذية", "fitness", "لياقة",
    "clinic", "clinique", "عيادة",
    "dentist", "dentiste", "طبيب أسنان",
    "gynecologist", "gynécologue", "طبيب نساء",
    "dermatologist", "dermatologue",
    "ophthalmologist", "ophtalmologue", "طبيب عيون",
    "cardiologist", "cardiologue",
    "pediatrician", "pédiatre", "طبيب أطفال",
    "psychiatrist", "psychiatre",
    "physiotherapist", "kinésithérapeute",
    "general practitioner", "médecin généraliste", "généraliste",
    "orthopedist", "orthopédiste",
    "radiologist", "radiologue",
    "pharmacist", "pharmacien", "صيدلي",
    "veterinarian", "vétérinaire", "بيطري",
    "rendez-vous", "rendez vous", "appointment", "موعد",
    "consultation", "examen", "checkup", "check-up",
  ],
  BeautyPersonalCare: [
    "beauty", "beauté", "جمال", "تجميل",
    "hairstylist", "coiffeur", "حلاق",
    "makeup", "maquillage", "مكياج",
    "spa", "سبا", "barber", "barbier",
  ],
  EventsMedia: [
    "event", "événement", "فعالية",
    "wedding", "mariage", "زفاف", "عرس",
    "photographer", "photographe", "مصور",
    "dj", "music", "musique",
  ],
  FoodCatering: [
    "catering", "traiteur", "تموين",
    "chef", "طباخ", "cuisinier",
    "bakery", "boulangerie", "مخبزة",
  ],
  DigitalCreative: [
    "design", "تصميم", "graphic", "graphique",
    "developer", "développeur", "مطور",
    "marketing", "تسويق", "seo", "web",
    "social media", "réseaux sociaux", "content",
  ],
  LegalFinance: [
    "lawyer", "avocat", "محامي",
    "accountant", "comptable", "محاسب",
    "tax", "fiscalité", "ضرائب",
  ],
  EducationCoaching: [
    "teacher", "professeur", "أستاذ", "معلم",
    "tutor", "tuteur", "مدرس",
    "coach", "coaching", "تدريب",
  ],
  AutomotiveTransport: [
    "mechanic", "mécanicien", "ميكانيكي",
    "garage", "كراج", "ورشة",
    "driver", "chauffeur", "سائق",
    "transport", "نقل",
    "غسيل سيارة", "غسيل السيارة", "غسيل", "غسيل السيارات",
    "تغيير زيت", "تغيير الزيت",
    "إطارات", "بنشر",
  ],
};

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

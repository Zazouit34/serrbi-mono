import type { PrismaClient } from "@workspace/db";
import { ServiceCategory, ServiceStatus } from "@workspace/db";
import { embedText } from "@/lib/embedding";
import type { ServiceIntentData } from "./intentExtractor";
import { rankServices, tokenize } from "./rankingEngine";

type ServiceCandidate = {
  id: string;
  title: string;
  description: string;
  displayImage: string | null;
  images: string;
  phoneNumber: string | null;
  serviceCategory: string;
  type: string | null;
  city: string | null;
  stateAbbreviation: string | null;
  price: number;
  averageRating: number | null;
  numberOfReviews: number;
  createdAt: Date;
  embedding: number[];
};

type RankedService = ServiceCandidate & {
  finalScore: number;
  matchPercent: number;
  semanticScore: number;
  ratingScore: number;
  reviewsScore: number;
  locationScore: number;
  priceScore: number;
  selectionReasons: string[];
  confidenceSignals: string[];
};

export type ServiceSearchResult = {
  query: string;
  filtersApplied: Record<string, unknown>;
  topResults: RankedService[];
};

function parseEnumValue<TEnum extends Record<string, string>>(
  value: string | null | undefined,
  enumObj: TEnum,
): TEnum[keyof TEnum] | null {
  if (!value) return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[_\-\s]/g, "");
  for (const item of Object.values(enumObj)) {
    const enumNormalized = item.toLowerCase().replace(/[_\-\s]/g, "");
    if (enumNormalized === normalized) return item as TEnum[keyof TEnum];
  }
  return null;
}

function inferServiceCategoryFromText(text: string): ServiceCategory | null {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const rules: Array<{ category: ServiceCategory; keywords: string[] }> = [
    {
      category: ServiceCategory.HomeMaintenance,
      keywords: [
        "plumber", "plombier", "سباك",
        "electrician", "electricien", "كهربائي",
        "painter", "peintre", "دهان",
        "carpenter", "menuisier", "نجار",
        "locksmith", "serrurier",
        "cleaning", "nettoyage", "نظافة", "تنظيف",
        "maintenance", "entretien", "صيانة",
        "reparation", "repair",
      ],
    },
    {
      category: ServiceCategory.ConstructionInstallation,
      keywords: [
        "construction", "بناء", "architect", "architecture", "هندسة",
        "pool", "piscine", "مسبح",
        "elevator", "ascenseur", "مصعد",
        "security system", "securite", "أمن",
        "renovation", "ترميم", "maconnerie",
      ],
    },
    {
      category: ServiceCategory.HealthWellness,
      keywords: [
        "doctor", "medecin", "طبيب",
        "medical", "health", "sante", "صحة",
        "nurse", "infirmier", "ممرض",
        "therapist", "therapeute", "معالج",
        "nutrition", "تغذية",
        "fitness", "لياقة",
        "clinic", "clinique", "عيادة",
      ],
    },
    {
      category: ServiceCategory.BeautyPersonalCare,
      keywords: [
        "beauty", "beaute", "جمال", "تجميل",
        "hairstylist", "coiffeur", "coiffure", "حلاق",
        "makeup", "maquillage", "مكياج",
        "esthetician", "estheticienne",
        "spa", "سبا",
        "barber", "barbier",
      ],
    },
    {
      category: ServiceCategory.EventsMedia,
      keywords: [
        "event", "evenement", "فعالية",
        "wedding", "mariage", "زفاف", "عرس",
        "decoration", "ديكور",
        "photographer", "photographe", "مصور",
        "videographer", "videast", "فيديو",
        "dj", "music", "musique",
      ],
    },
    {
      category: ServiceCategory.FoodCatering,
      keywords: [
        "food", "alimentation", "طعام",
        "catering", "traiteur", "تموين",
        "chef", "طباخ", "cuisinier",
        "bakery", "boulangerie", "مخبزة",
        "restaurant", "مطعم",
        "patisserie",
      ],
    },
    {
      category: ServiceCategory.DigitalCreative,
      keywords: [
        "design", "تصميم",
        "graphic", "graphique", "جرافيك",
        "digital", "numerique", "رقمي",
        "developer", "developpeur", "مطور",
        "marketing", "تسويق",
        "social media", "reseaux sociaux",
        "content creator", "contenu", "محتوى",
        "seo", "web",
      ],
    },
    {
      category: ServiceCategory.LegalFinance,
      keywords: [
        "lawyer", "avocat", "محامي",
        "legal", "juridique", "قانوني",
        "accountant", "comptable", "محاسب",
        "finance", "مالي",
        "tax", "fiscalite", "ضرائب",
        "notaire", "conseil",
      ],
    },
    {
      category: ServiceCategory.EducationCoaching,
      keywords: [
        "teacher", "prof", "professeur", "أستاذ", "معلم",
        "education", "تعليم",
        "cours", "دروس",
        "tutor", "tuteur", "مدرس",
        "coach", "coaching", "تدريب",
        "training", "formateur", "formation",
      ],
    },
    {
      category: ServiceCategory.AutomotiveTransport,
      keywords: [
        "mechanic", "mecanicien", "ميكانيكي",
        "garage", "كراج",
        "auto", "automobile", "car", "voiture", "سيارة",
        "transport", "نقل",
        "driver", "chauffeur", "سائق",
      ],
    },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.category;
    }
  }

  return null;
}

function parseRange(minValue: number | null | undefined, maxValue: number | null | undefined) {
  const min = typeof minValue === "number" && Number.isFinite(minValue) ? minValue : null;
  const max = typeof maxValue === "number" && Number.isFinite(maxValue) ? maxValue : null;
  if (min == null && max == null) return null;
  return { min, max };
}

export async function serviceSearchEngine(
  db: PrismaClient,
  intentData: ServiceIntentData,
): Promise<ServiceSearchResult> {
  const normalizedIntent = intentData as ServiceIntentData & {
    minAverageRating?: number | null;
    minNumberOfReviews?: number | null;
  };
  const parsedServiceCategory = parseEnumValue(intentData.serviceCategory, ServiceCategory);
  const inferredServiceCategory = inferServiceCategoryFromText(
    `${intentData.query} ${intentData.type ?? ""}`,
  );
  const serviceCategory = parsedServiceCategory ?? inferredServiceCategory;
  const priceRange = parseRange(intentData.minPrice, intentData.maxPrice);
  const minAverageRating =
    typeof normalizedIntent.minAverageRating === "number" &&
    Number.isFinite(normalizedIntent.minAverageRating)
      ? normalizedIntent.minAverageRating
      : null;
  const minNumberOfReviews =
    typeof normalizedIntent.minNumberOfReviews === "number" &&
    Number.isFinite(normalizedIntent.minNumberOfReviews)
      ? normalizedIntent.minNumberOfReviews
      : null;

  const where: Record<string, unknown> = {
    status: ServiceStatus.published,
  };

  if (serviceCategory) where.serviceCategory = serviceCategory;
  if (intentData.type) where.type = { contains: intentData.type.trim(), mode: "insensitive" };
  if (intentData.city) where.city = { contains: intentData.city.trim(), mode: "insensitive" };
  if (intentData.stateAbbreviation) where.stateAbbreviation = intentData.stateAbbreviation.trim();
  if (minAverageRating != null) where.averageRating = { gte: minAverageRating };
  if (minNumberOfReviews != null) where.numberOfReviews = { gte: minNumberOfReviews };
  if (priceRange) {
    const priceFilter: Record<string, number> = {};
    if (priceRange.min != null) priceFilter.gte = priceRange.min;
    if (priceRange.max != null) priceFilter.lte = priceRange.max;
    where.price = priceFilter;
  }

  const shouldEmbedQuery = intentData.query.trim().length >= 4;
  const queryEmbeddingPromise = shouldEmbedQuery
    ? embedText(intentData.query).catch((error) => {
        console.error("serviceSearchEngine: failed to embed query, using lexical fallback", error);
        return null;
      })
    : Promise.resolve(null);

  const selectFields = {
    id: true,
    title: true,
    description: true,
    displayImage: true,
    images: true,
    phoneNumber: true,
    serviceCategory: true,
    type: true,
    city: true,
    stateAbbreviation: true,
    price: true,
    averageRating: true,
    numberOfReviews: true,
    createdAt: true,
    embedding: true,
  } as const;

  const SAFETY_CAP = 1000;
  let pool = (await db.service.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: selectFields,
  })) as ServiceCandidate[];

  if (pool.length > SAFETY_CAP) {
    pool = pool.slice(0, SAFETY_CAP);
  }

  if (pool.length === 0) {
    const relaxSteps: Array<() => void> = [
      () => { delete where.type; },
      () => { delete where.city; },
      () => { delete where.stateAbbreviation; },
      () => { delete where.price; },
      () => { delete where.averageRating; },
      () => { delete where.numberOfReviews; },
      () => { delete where.serviceCategory; },
    ];
    for (const relax of relaxSteps) {
      relax();
      pool = (await db.service.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: selectFields,
      })) as ServiceCandidate[];
      if (pool.length > 0) break;
    }
    if (pool.length > SAFETY_CAP) {
      pool = pool.slice(0, SAFETY_CAP);
    }
  }

  const shouldRunSemantic = pool.some(
    (service) => Array.isArray(service.embedding) && service.embedding.length > 0,
  );
  const queryEmbedding = shouldRunSemantic ? await queryEmbeddingPromise : null;
  const queryTokens = tokenize(intentData.query);

  const ranked = rankServices({
    items: pool,
    queryEmbedding,
    queryTokens,
    preferredCity: intentData.city ?? null,
    minPrice: priceRange?.min ?? null,
    maxPrice: priceRange?.max ?? null,
  });

  return {
    query: intentData.query,
    filtersApplied: {
      serviceCategory,
      type: intentData.type ?? null,
      city: intentData.city ?? null,
      stateAbbreviation: intentData.stateAbbreviation ?? null,
      minPrice: priceRange?.min ?? null,
      maxPrice: priceRange?.max ?? null,
      minAverageRating,
      minNumberOfReviews,
    },
    topResults: ranked.slice(0, 3),
  };
}

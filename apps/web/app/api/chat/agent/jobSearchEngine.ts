import type { PrismaClient } from "@workspace/db";
import {
  ExperienceLevel,
  JobCategory,
  JobListingStatus,
  JobListingType,
  LocationRequirement,
} from "@workspace/db";
import { embedText } from "@/lib/embedding";
import type { JobIntentData } from "./intentExtractor";
import { rankJobs, tokenize } from "./rankingEngine";

type JobCandidate = {
  id: string;
  title: string;
  companyName: string | null;
  companyImage: string | null;
  description: string;
  tags: string[];
  city: string | null;
  stateAbbreviation: string | null;
  countryIso2: string | null;
  category: string;
  type: string;
  locationRequirement: string;
  experienceLevel: string;
  wage: number | null;
  createdAt: Date;
  embedding: number[];
};

type RankedJob = JobCandidate & {
  finalScore: number;
  semanticScore: number;
  overlapScore: number;
  recencyScore: number;
};

export type JobSearchResult = {
  query: string;
  filtersApplied: Record<string, unknown>;
  topResults: RankedJob[];
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

function inferJobCategoryFromText(text: string): JobCategory | null {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const rules: Array<{ category: JobCategory; keywords: string[] }> = [
    {
      category: JobCategory.Tech,
      keywords: [
        "developer",
        "developpeur",
        "dev",
        "software",
        "frontend",
        "backend",
        "fullstack",
        "data",
        "engineer",
        "it",
        "tech",
      ],
    },
    {
      category: JobCategory.Finance,
      keywords: ["finance", "accountant", "accounting", "comptable", "audit", "bank"],
    },
    {
      category: JobCategory.Health,
      keywords: ["doctor", "nurse", "medical", "sante", "health", "pharmac"],
    },
    {
      category: JobCategory.Legal,
      keywords: ["lawyer", "legal", "juridique", "avocat"],
    },
    {
      category: JobCategory.Education,
      keywords: ["teacher", "prof", "education", "educat", "formateur", "instructor"],
    },
    {
      category: JobCategory.Construction,
      keywords: ["construction", "chantier", "builder", "maçon", "mason", "plumbing", "electric"],
    },
    {
      category: JobCategory.Hospitality,
      keywords: ["hotel", "restaurant", "hospitality", "serveur", "waiter", "cuisine"],
    },
    {
      category: JobCategory.CallCenter,
      keywords: ["call center", "customer support", "teleconseiller", "televendeur", "centre d'appel"],
    },
    {
      category: JobCategory.Auto,
      keywords: ["mechanic", "garage", "automotive", "auto", "car repair"],
    },
    {
      category: JobCategory.Cleaning,
      keywords: ["cleaning", "cleaner", "menage", "nettoyage"],
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

export async function jobSearchEngine(db: PrismaClient, intentData: JobIntentData): Promise<JobSearchResult> {
  const parsedCategory = parseEnumValue(intentData.category, JobCategory);
  const inferredCategory = inferJobCategoryFromText(
    `${intentData.query} ${(intentData.skills ?? []).join(" ")}`,
  );
  const category = parsedCategory ?? inferredCategory;
  const experienceLevel = parseEnumValue(intentData.experienceLevel, ExperienceLevel);
  const locationRequirement = parseEnumValue(intentData.locationRequirement, LocationRequirement);
  const type = parseEnumValue(intentData.type, JobListingType);
  const wageRange = parseRange(intentData.minWage, intentData.maxWage);

  const strictWhere: Record<string, unknown> = {
    status: JobListingStatus.published,
  };

  if (category) strictWhere.category = category;
  if (experienceLevel) strictWhere.experienceLevel = experienceLevel;
  if (locationRequirement) strictWhere.locationRequirement = locationRequirement;
  if (type) strictWhere.type = type;
  if (intentData.city) strictWhere.city = { contains: intentData.city.trim(), mode: "insensitive" };
  if (intentData.stateAbbreviation) strictWhere.stateAbbreviation = intentData.stateAbbreviation.trim();
  if (intentData.countryIso2) strictWhere.countryIso2 = intentData.countryIso2.trim().toUpperCase();
  if (wageRange) {
    const wageFilter: Record<string, number> = {};
    if (wageRange.min != null) wageFilter.gte = wageRange.min;
    if (wageRange.max != null) wageFilter.lte = wageRange.max;
    strictWhere.wage = wageFilter;
  }

  let pool = (await db.job.findMany({
    where: strictWhere,
    take: 120,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      companyName: true,
      companyImage: true,
      description: true,
      tags: true,
      city: true,
      stateAbbreviation: true,
      countryIso2: true,
      category: true,
      type: true,
      locationRequirement: true,
      experienceLevel: true,
      wage: true,
      createdAt: true,
      embedding: true,
    },
  })) as JobCandidate[];

  let fallbackApplied = false;
  if (pool.length === 0) {
    // Graceful fallback: if strict filters produce 0 rows, widen criteria while
    // preserving semantic + overlap ranking so we still return relevant jobs.
    const relaxedWhere: Record<string, unknown> = {
      status: JobListingStatus.published,
    };
    if (category) {
      // Keep category when inferred/provided to avoid totally off-domain results.
      relaxedWhere.category = category;
    }

    pool = (await db.job.findMany({
      where: relaxedWhere,
      take: 120,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        companyName: true,
        companyImage: true,
        description: true,
        tags: true,
        city: true,
        stateAbbreviation: true,
        countryIso2: true,
        category: true,
        type: true,
        locationRequirement: true,
        experienceLevel: true,
        wage: true,
        createdAt: true,
        embedding: true,
      },
    })) as JobCandidate[];
    fallbackApplied = true;
  }

  if (pool.length === 0) {
    return {
      query: intentData.query,
      filtersApplied: {
        category,
        experienceLevel,
        locationRequirement,
        type,
        city: intentData.city ?? null,
      },
      topResults: [], // No published jobs available in DB.
    };
  }

  const shouldRunSemantic = pool.some((job) => Array.isArray(job.embedding) && job.embedding.length > 0);
  let queryEmbedding: number[] | null = null;
  if (shouldRunSemantic) {
    try {
      queryEmbedding = await embedText(intentData.query);
    } catch (error) {
      console.error("jobSearchEngine: failed to embed query, using lexical ranking fallback", error);
      queryEmbedding = null;
    }
  }

  const queryTokens = tokenize(intentData.query);
  const skillTokens = (intentData.skills ?? []).flatMap((skill) => tokenize(skill));
  const overlapTokens = Array.from(new Set([...queryTokens, ...skillTokens]));

  const ranked = rankJobs({
    items: pool,
    queryEmbedding,
    overlapTokens,
  });

  return {
    query: intentData.query,
    filtersApplied: {
      category,
      experienceLevel,
      locationRequirement,
      type,
      city: intentData.city ?? null,
      stateAbbreviation: intentData.stateAbbreviation ?? null,
      countryIso2: intentData.countryIso2 ?? null,
      minWage: wageRange?.min ?? null,
      maxWage: wageRange?.max ?? null,
      fallbackApplied,
    },
    topResults: ranked.slice(0, 30),
  };
}

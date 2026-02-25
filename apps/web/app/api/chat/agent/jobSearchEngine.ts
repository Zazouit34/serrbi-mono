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
  const normalized = value.trim().toLowerCase();
  for (const item of Object.values(enumObj)) {
    if (item.toLowerCase() === normalized) return item as TEnum[keyof TEnum];
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
  const category = parseEnumValue(intentData.category, JobCategory);
  const experienceLevel = parseEnumValue(intentData.experienceLevel, ExperienceLevel);
  const locationRequirement = parseEnumValue(intentData.locationRequirement, LocationRequirement);
  const type = parseEnumValue(intentData.type, JobListingType);
  const wageRange = parseRange(intentData.minWage, intentData.maxWage);

  const where: Record<string, unknown> = {
    status: JobListingStatus.published,
  };

  if (category) where.category = category;
  if (experienceLevel) where.experienceLevel = experienceLevel;
  if (locationRequirement) where.locationRequirement = locationRequirement;
  if (type) where.type = type;
  if (intentData.city) where.city = { contains: intentData.city.trim(), mode: "insensitive" };
  if (intentData.stateAbbreviation) where.stateAbbreviation = intentData.stateAbbreviation.trim();
  if (intentData.countryIso2) where.countryIso2 = intentData.countryIso2.trim().toUpperCase();
  if (wageRange) {
    const wageFilter: Record<string, number> = {};
    if (wageRange.min != null) wageFilter.gte = wageRange.min;
    if (wageRange.max != null) wageFilter.lte = wageRange.max;
    where.wage = wageFilter;
  }

  const pool = (await db.job.findMany({
    where,
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
      topResults: [],
    };
  }

  const shouldRunSemantic = pool.some((job) => Array.isArray(job.embedding) && job.embedding.length > 0);
  const queryEmbedding = shouldRunSemantic ? await embedText(intentData.query) : null;

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
    },
    topResults: ranked.slice(0, 3),
  };
}

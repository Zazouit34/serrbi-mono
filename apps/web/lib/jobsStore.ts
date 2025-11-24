import { headers } from "next/headers";
import { embedBatch } from "./embedding";
import type { SerrbiJob, ScoredJob } from "../types/job";
import { prisma, type Prisma } from "@workspace/db";
import { getTenantFromHost } from "@/lib/domain";
import maStates from "@workspace/ui/lib/states.json" assert { type: "json" };

interface JobEmbedding {
  job: SerrbiJob;
  embedding: number[];
}

function buildJobText(job: SerrbiJob): string {
  const parts: string[] = [
    job.title,
    job.company,
    job.location ?? "",
    job.description,
    ...(job.tags ?? []),
  ];
  return parts.filter((p) => p && p.trim().length > 0).join(" | ");
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must be the same length for cosine similarity");
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const va = a[i];
    const vb = b[i];
    if (va === undefined || vb === undefined) {
      throw new Error("Vector element is undefined while computing similarity");
    }
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function minMaxNormalize(values: number[]): number[] {
  if (values.length === 0) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max === min) {
    return values.map(() => 0.5);
  }

  return values.map((v) => (v - min) / (max - min));
}

export interface HybridSearchOptions {
  topKDense?: number;
  topKFinal?: number;
}

async function buildWhereForHybridSearch(
  search: string,
): Promise<Prisma.JobWhereInput> {
  const where: Prisma.JobWhereInput = {};

  const trimmed = search.trim();
  if (trimmed) {
    where.OR = [
      { title: { contains: trimmed, mode: "insensitive" } },
      { description: { contains: trimmed, mode: "insensitive" } },
      { companyName: { contains: trimmed, mode: "insensitive" } },
      { city: { contains: trimmed, mode: "insensitive" } },
    ];
  }

  try {
    const hdrs = await headers();
    const host = hdrs.get("host") || "";
    const tenant = getTenantFromHost(host);
    if (tenant === "secondary") {
      const maCodes = Object.keys(maStates as Record<string, string>);
      where.NOT = {
        OR: [
          { countryIso2: "MA" },
          { stateAbbreviation: { in: maCodes } },
        ],
      };
    }
  } catch {
    // ignore header/tenant errors and fall back to global search
  }

  return where;
}

async function fetchJobsForHybridSearch(
  query: string,
  maxCandidates: number,
): Promise<SerrbiJob[]> {
  const where = await buildWhereForHybridSearch(query);

  const items = await prisma.job.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: maxCandidates,
    select: {
      id: true,
      title: true,
      companyName: true,
      companyImage: true,
      description: true,
      tags: true,
      city: true,
    },
  });

  return items.map((job) => ({
    id: job.id,
    title: job.title ?? "",
    company: job.companyName ?? "",
    companyImage: job.companyImage ?? null,
    location: job.city ?? undefined,
    description: job.description ?? "",
    tags: job.tags ?? undefined,
  }));
}

// Semantic search over jobs using dense embeddings and cosine similarity only.
export async function hybridSearchJobs(
  query: string,
  queryEmbedding: number[],
  options?: HybridSearchOptions,
): Promise<ScoredJob[]> {
  const topKDense = options?.topKDense ?? 50;
  const topKFinal = options?.topKFinal ?? 20;

  const candidateCount = Math.max(topKDense, topKFinal, 50);
  const jobs = await fetchJobsForHybridSearch(query, candidateCount);
  if (jobs.length === 0) {
    return [];
  }

  const texts = jobs.map((job) => buildJobText(job));
  const embeddings = await embedBatch(texts);

  if (embeddings.length !== jobs.length) {
    throw new Error(
      `Expected ${jobs.length} embeddings but got ${embeddings.length}`,
    );
  }

  const jobsWithEmbeddings: JobEmbedding[] = jobs.map((job, idx) => {
    const embedding = embeddings[idx];
    if (!embedding) {
      throw new Error("Missing embedding for job index");
    }
    return {
      job,
      embedding,
    };
  });

  const denseScored = jobsWithEmbeddings.map((je) => ({
    jobEmbedding: je,
    denseScore: cosineSimilarity(queryEmbedding, je.embedding),
  }));

  denseScored.sort((a, b) => b.denseScore - a.denseScore);

  const topDense = denseScored.slice(0, Math.min(topKDense, denseScored.length));

  const denseScores = topDense.map((item) => item.denseScore);
  const denseNorm = minMaxNormalize(denseScores);

  const scoredJobs: ScoredJob[] = topDense.map((item, idx) => {
    const { job } = item.jobEmbedding;
    const denseScore = denseScores[idx] ?? 0;
    const denseNormScore = denseNorm[idx] ?? 0;
    // In pure semantic search, the final score is just the normalized dense score.
    const finalScore = denseNormScore;

    return {
      ...job,
      denseScore,
      finalScore,
    };
  });

  scoredJobs.sort((a, b) => b.finalScore - a.finalScore);

  return scoredJobs.slice(0, Math.min(topKFinal, scoredJobs.length));
}



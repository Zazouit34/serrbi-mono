import { protectedProcedure, router, publicProcedure, adminProcedure } from "../trpc";
import {
  jobListingFormSchema,
  jobListQuerySchema,
  jobGetByIdSchema,
  jobApplicationCreateSchema,
  jobImportSchema,
  autoApplyJobListQuerySchema,
  jobApplyForAutoJobSchema,
} from "@workspace/ui/lib/validation-schemas";

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { PrismaClient } from "@workspace/db";
import { applyAndNotify } from "@/server/services/job-application";
import { headers } from "next/headers";
import { getTenantFromHost } from "@/lib/domain";
import maStates from "@workspace/ui/lib/states.json" assert { type: "json" };
import { embedText, embedBatch } from "@/lib/embedding";
import { buildJobEmbeddingText } from "@/lib/embedding-text";
import { scoreAutoApplyJob } from "@/lib/auto-apply-ranking";

type ExperienceLevelFilter = "junior" | "mid_level" | "senior";

function normalizeIntentText(text: string): string {
  const withoutDiacritics = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return withoutDiacritics.toLowerCase();
}

function inferExperienceLevelFromText(text: string): ExperienceLevelFilter | null {
  const normalized = normalizeIntentText(text);
  if (!normalized.trim()) return null;

  const hasMid =
    normalized.includes("mid level") ||
    normalized.includes("middle") ||
    normalized.includes("intermediaire") ||
    normalized.includes("intermediate") ||
    normalized.includes("confirm") ||
    normalized.includes("متوسط") ||
    normalized.includes("متوسطة");
  if (hasMid) return "mid_level";

  const hasJunior =
    normalized.includes("junior") ||
    normalized.includes("entry level") ||
    normalized.includes("debutant") ||
    normalized.includes("fresh") ||
    normalized.includes("intern") ||
    normalized.includes("مبتدئ") ||
    normalized.includes("junior");
  if (hasJunior) return "junior";

  const hasSenior =
    normalized.includes("senior") ||
    normalized.includes("lead") ||
    normalized.includes("expert") ||
    normalized.includes("avance") ||
    normalized.includes("متقدم") ||
    normalized.includes("خبير");
  if (hasSenior) return "senior";

  return null;
}

export const jobRouter = router({
  createJob: protectedProcedure
    .input(jobListingFormSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = (ctx as any).user;

      try {
        // Compute an embedding for this job so it participates in semantic auto-apply ranking.
        let jobEmbedding: number[] = [];
        try {
          jobEmbedding = await embedText(
            buildJobEmbeddingText({
              title: input.title,
              description: input.description,
              tags: input.tags || [],
              city: input.city || null,
              locationRequirement: input.locationRequirement,
              experienceLevel: input.experienceLevel,
              type: input.type,
              wage: input.wage || null,
              companyName: input.companyName || null,
              category: input.category,
            }),
          );
        } catch (err) {
          console.error("Failed to compute job embedding", err);
        }

        const job = await db.job.create({
          data: {
            userId: user.id,
            title: input.title,
            companyName: input.companyName,
            companyImage: input.companyImage,
            description: input.description,
            category: input.category,
            locationRequirement: input.locationRequirement,
            experienceLevel: input.experienceLevel,
            type: input.type,
            tags: input.tags || [],
            wage: input.wage || null,
            countryIso2: (input as any).countryIso2 || null,
            stateAbbreviation: input.stateAbbreviation || null,
            city: input.city || null,
            applicationEmail: input.applicationEmail || "",
            applicationUrl: input.applicationUrl || null,
            status: "draft", // Default status
            embedding: jobEmbedding,
          },
          select: {
            id: true,
            title: true,
            companyName: true,
            companyImage: true,
            description: true,
            tags: true,
            category: true,
            locationRequirement: true,
            experienceLevel: true,
            type: true,
            wage: true,
            stateAbbreviation: true,
            city: true,
            applicationEmail: true,
            applicationUrl: true,
            status: true,
            createdAt: true,
          },
        });

        // Sync pgvector column used for semantic search (Prisma only writes "embedding" Float[]).
        if (jobEmbedding.length === 1024) {
          try {
            await (db as any).$executeRawUnsafe(
              `UPDATE "Job" SET embedding_vector = embedding::vector WHERE id = $1`,
              job.id,
            );
          } catch (err) {
            console.error("Failed to sync embedding_vector for new job", err);
          }
        }

        return {
          success: true,
          message: "Job listing created successfully",
          job,
        };
      } catch (error) {
        console.error("Error creating job:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create job listing",
        });
      }
    }),

  getJob: publicProcedure
    .input(jobListQuerySchema.optional())
    .query(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 12;
      const locationRequirement = input?.locationRequirement;
      const category = input?.category;
      const experienceLevel = input?.experienceLevel;
      const type = input?.type;
      const search = input?.search?.trim() || "";
      const city = input?.city;
      const countryIso2 = (input as any)?.countryIso2 as string | undefined;
      const inferredExperienceLevel: ExperienceLevelFilter | null =
        (experienceLevel as ExperienceLevelFilter | undefined) ?? inferExperienceLevelFromText(search);

      // When a search term is provided, prefer semantic search (pgvector) if we can
      // embed the query; otherwise fall back to accent-insensitive keyword search.
      if (search) {
        let queryEmbedding: number[] | null = null;
        try {
          queryEmbedding = await embedText(search);
        } catch (err) {
          console.error("Failed to embed search query, falling back to text search", err);
        }

        // Determine tenant for Morocco filtering
        let tenant: string | null = null;
        try {
          const hdrs = await headers();
          const host = hdrs.get("host") || "";
          tenant = getTenantFromHost(host);
        } catch {
          tenant = null;
        }

        let whereSql = `WHERE 1=1`;
        const params: any[] = [];
        let idx = 1;

        if (locationRequirement) {
          whereSql += ` AND "locationRequirement" = $${idx}`;
          params.push(locationRequirement);
          idx += 1;
        }
        if (category) {
          whereSql += ` AND "category" = $${idx}`;
          params.push(category);
          idx += 1;
        }
        if (inferredExperienceLevel) {
          whereSql += ` AND "experienceLevel" = $${idx}`;
          params.push(inferredExperienceLevel);
          idx += 1;
        }
        if (type) {
          whereSql += ` AND "type" = $${idx}`;
          params.push(type);
          idx += 1;
        }
        if (city) {
          whereSql += ` AND "city" ILIKE $${idx}`;
          params.push(`%${city}%`);
          idx += 1;
        }
        if (countryIso2) {
          whereSql += ` AND "countryIso2" = $${idx}`;
          params.push(countryIso2);
          idx += 1;
        }

        // Exclude Morocco for secondary domain (mirror previous behavior)
        if (tenant === "secondary") {
          const maCodes = Object.keys(maStates as Record<string, string>);
          whereSql += ` AND NOT ("countryIso2" = 'MA' OR "stateAbbreviation" = ANY($${idx}))`;
          params.push(maCodes);
          idx += 1;
        }

        // Prefer vector similarity if we successfully embedded the query and have 1024 dims.
        const hasVectorQuery = Array.isArray(queryEmbedding) && queryEmbedding.length === 1024;

        if (hasVectorQuery) {
          // Only consider rows that have an embedding vector.
          whereSql += ` AND "embedding_vector" IS NOT NULL`;

          const embeddingParamIdx = idx;
          const limitIdx = idx + 1;
          const offsetIdx = idx + 2;

          const embeddingLiteral = `[${queryEmbedding!.join(",")}]`;

          const baseSelect = `
          SELECT
            "id",
            "title",
            "companyName",
            "companyImage",
            "description",
            "category",
            "applicationUrl",
            "applicationEmail",
            "wage",
            "countryIso2",
            "stateAbbreviation",
            "tags",
            "city",
            "type",
            "experienceLevel",
            "locationRequirement",
            "status",
            "createdAt"
          FROM "Job"
        `;

          const itemsSql = `
          ${baseSelect}
          ${whereSql}
          ORDER BY "embedding_vector" <-> $${embeddingParamIdx}::vector ASC
          LIMIT $${limitIdx} OFFSET $${offsetIdx}
        `;

          const countSql = `
          SELECT COUNT(*)::int AS "count"
          FROM "Job"
          ${whereSql}
        `;

          const limit = pageSize;
          const offset = (page - 1) * pageSize;

          const [items, countRowsRaw] = await Promise.all([
            (db as any).$queryRawUnsafe(itemsSql, ...params, embeddingLiteral, limit, offset),
            (db as any).$queryRawUnsafe(countSql, ...params, embeddingLiteral),
          ]);

          const countRows = countRowsRaw as { count: number }[];
          const total = countRows[0]?.count ?? 0;
          return { items, total, page, pageSize };
        }

        // Fallback: accent-insensitive keyword search.
        // If embeddings are unavailable (e.g. missing EMBEDDING_API_*), we still want multi-word queries
        // like "vendeuse a casablanca" to match "vendeuse" (title/description) + "casablanca" (city)
        // instead of requiring the full phrase to exist verbatim.
        const normalizedSearch = search
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9\u0600-\u06ff\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        const stopwords = new Set(["a", "au", "aux", "de", "des", "du", "la", "le", "les", "the", "and"]);
        const tokens = normalizedSearch
          .split(" ")
          .map((t) => t.trim())
          .filter(Boolean)
          .filter((t) => t.length >= 2)
          .filter((t) => !stopwords.has(t));

        const effectiveTokens = tokens.length ? tokens : [normalizedSearch || search.toLowerCase()];
        const tokenClauses: string[] = [];
        for (const token of effectiveTokens) {
          tokenClauses.push(`(
            unaccent(lower("title")) LIKE unaccent(lower($${idx}))
            OR unaccent(lower("description")) LIKE unaccent(lower($${idx}))
            OR unaccent(lower("companyName")) LIKE unaccent(lower($${idx}))
            OR unaccent(lower("city")) LIKE unaccent(lower($${idx}))
          )`);
          params.push(`%${token}%`);
          idx += 1;
        }
        whereSql += ` AND (${tokenClauses.join(" OR ")})`;

        const limitIdx = idx;
        const offsetIdx = idx + 1;

        const baseSelect = `
          SELECT
            "id",
            "title",
            "companyName",
            "companyImage",
            "description",
            "category",
            "applicationUrl",
            "applicationEmail",
            "wage",
            "countryIso2",
            "stateAbbreviation",
            "tags",
            "city",
            "type",
            "experienceLevel",
            "locationRequirement",
            "status",
            "createdAt"
          FROM "Job"
        `;

        const itemsSql = `
          ${baseSelect}
          ${whereSql}
          ORDER BY "createdAt" DESC, "id" DESC
          LIMIT $${limitIdx} OFFSET $${offsetIdx}
        `;

        const countSql = `
          SELECT COUNT(*)::int AS "count"
          FROM "Job"
          ${whereSql}
        `;

        const limit = pageSize;
        const offset = (page - 1) * pageSize;

        const [items, countRowsRaw] = await Promise.all([
          (db as any).$queryRawUnsafe(itemsSql, ...params, limit, offset),
          (db as any).$queryRawUnsafe(countSql, ...params),
        ]);

        const countRows = countRowsRaw as { count: number }[];

        const total = countRows[0]?.count ?? 0;
        return { items, total, page, pageSize };
      }

      // Default path (no search term): keep existing Prisma query builder.
      const where: any = {};

      if (locationRequirement) {
        where.locationRequirement = locationRequirement;
      }
      if (category) {
        where.category = category;
      }
      if (experienceLevel) {
        where.experienceLevel = experienceLevel;
      }
      if (type) {
        where.type = type;
      }
      if (city) {
        // Case-insensitive city match, similar to services
        where.city = { equals: city, mode: "insensitive" };
      }
      if (countryIso2) {
        where.countryIso2 = countryIso2;
      }

      // Exclude Morocco for secondary domain (mirror previous behavior)
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
      } catch {}

      const [items, total] = await Promise.all([
        db.job.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            title: true,
            companyName: true,
            companyImage: true,
            description: true,
            category: true,
            applicationUrl: true,
            applicationEmail: true,
            wage: true,
            countryIso2: true,
            stateAbbreviation: true,
            tags: true,
            city: true,
            type: true,
            experienceLevel: true,
            locationRequirement: true,
            status: true,
            createdAt: true,
          },
        }),
        db.job.count({ where }),
      ]);

      return { items, total, page, pageSize };
    }),

  // Jobs suggested for the auto-apply feature, based on user prefs and live overrides
  getAutoApplyJobs: protectedProcedure
    .input(autoApplyJobListQuerySchema.optional())
    .query(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = ctx.user as {
        id: string;
        email: string;
      };

      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 10;
      const enabled = input?.enabled ?? true;

      if (!enabled) {
        return { items: [], total: 0, page, pageSize };
      }

      // Load persisted auto-apply prefs and resume embedding
      const fullUser = await (db.user.findUnique as any)({
        where: { id: user.id },
        select: {
          autoApplyEnabled: true,
          autoApplyCategory: true,
          autoApplyKeywords: true,
          autoApplyRoles: true,
          resumeEmbedding: true,
        },
      });

      const effectiveEnabled = input?.enabled ?? !!fullUser?.autoApplyEnabled;
      if (!effectiveEnabled) {
        return { items: [], total: 0, page, pageSize };
      }

      const effectiveCategory =
        input?.category ?? (fullUser?.autoApplyCategory ?? null);
      const effectiveKeywords =
        input?.keywords ?? (fullUser?.autoApplyKeywords ?? []);
      const effectiveRoles =
        input?.roles ?? (fullUser?.autoApplyRoles ?? []);

      if (!effectiveCategory) {
        return { items: [], total: 0, page, pageSize };
      }

      const MAX_ITEMS = 20;
      const skip = (page - 1) * pageSize;

      // Always fetch the freshest jobs in the selected category (up to MAX_ITEMS)
      // and rank them in memory using embeddings + keywords/roles.
      const jobs = await db.job.findMany({
        where: {
          category: effectiveCategory as any,
        },
        orderBy: { createdAt: "desc" },
        take: MAX_ITEMS,
        select: {
          id: true,
          title: true,
          companyName: true,
          companyImage: true,
          description: true,
          category: true,
          applicationUrl: true,
          applicationEmail: true,
          wage: true,
          countryIso2: true,
          stateAbbreviation: true,
          tags: true,
          city: true,
          type: true,
          experienceLevel: true,
          locationRequirement: true,
          status: true,
          createdAt: true,
          embedding: true,
        },
      });

      const total = Math.min(jobs.length, MAX_ITEMS);

      // Pre-fetch existing applications for this user to mark alreadyApplied
      const jobIds = jobs.map((j) => j.id);
      const existingApps =
        jobIds.length === 0
          ? []
          : await db.jobApplication.findMany({
              where: {
                jobId: { in: jobIds },
                email: user.email,
              },
              select: { jobId: true },
            });
      const appliedSet = new Set(existingApps.map((a) => a.jobId));

      const userEmbedding: number[] | null =
        (fullUser as any)?.resumeEmbedding && Array.isArray((fullUser as any).resumeEmbedding)
          ? ((fullUser as any).resumeEmbedding as number[])
          : null;

      const usedResumeEmbedding = !!(
        userEmbedding &&
        Array.isArray(userEmbedding) &&
        userEmbedding.length > 0
      );

      const scoredItems = jobs.map((job: any) => {
        const scored = scoreAutoApplyJob({
          job,
          keywords: effectiveKeywords || [],
          roles: effectiveRoles || [],
          resumeEmbedding: userEmbedding,
          maxReasons: 3,
        });
        return {
          ...job,
          alreadyApplied: appliedSet.has(job.id),
          matchPercent: scored.matchPercent,
          matchReasons: scored.reasons,
          matchDebug: {
            semanticScore: scored.semanticScore,
            keywordScore: scored.keywordScore,
            roleScore: scored.roleScore,
            recencyScore: scored.recencyScore,
          },
          _score: scored.finalScore,
        };
      });

      // Sort primarily by combined score (semantic + filters), then by recency.
      let ordered: typeof scoredItems;
      ordered = [...scoredItems].sort((a, b) => {
        // Higher score first
        const scoreDiff = (b._score ?? 0) - (a._score ?? 0);
        if (Math.abs(scoreDiff) > 1e-6) return scoreDiff;
        // Tie-breaker: newer jobs first
        const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
        if (timeDiff !== 0) return timeDiff;
        return 0;
      });

      // Apply pagination after optional reordering.
      const start = skip;
      const end = start + pageSize;
      const paged = ordered.slice(start, end);

      const resultItems = paged.map(({ _score, ...rest }) => rest);

      return { items: resultItems, total, page, pageSize, usedResumeEmbedding };
    }),

  getById: publicProcedure
    .input(jobGetByIdSchema)
    .query(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const job = await db.job.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          title: true,
          companyName: true,
          companyImage: true,
          description: true,
          applicationUrl: true,
          applicationEmail: true,
          category: true,
          city: true,
          tags: true,
          stateAbbreviation: true,
          type: true,
          experienceLevel: true,
          locationRequirement: true,
          wage: true,
          createdAt: true,
          status: true,
        },
      });
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      return job;
    }),

  submitApplication: publicProcedure
    .input(jobApplicationCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      // Reuse centralized service to ensure identical behavior across manual & auto flows
      const result = await applyAndNotify({
        db,
        jobId: input.jobId,
        name: input.name,
        email: input.email,
        cvData: input.cvData,
        cvFilename: input.cvFilename,
        resumeUrl: input.resumeUrl,
      });
      return result;
    }),
  applyForAutoJob: protectedProcedure
    .input(jobApplyForAutoJobSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = ctx.user as { id: string };

      const result = await applyAndNotify({
        db,
        jobId: input.jobId,
        userId: user.id,
        // Count this as auto-apply usage so it is reflected
        // in subscription.getUsageStats (autoAppliedUsed) together
        // with background auto-apply triggered by Inngest.
        source: "auto",
      });

      return result;
    }),

  applyForAutoJobs: protectedProcedure
    .input(
      z.object({
        jobIds: z.array(z.string().min(1)).min(1).max(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = ctx.user as { id: string; email: string };

      const uniqueJobIds = Array.from(new Set(input.jobIds));
      if (uniqueJobIds.length === 0) {
        return { applied: [], skipped: [] as { id: string; reason: string }[] };
      }

      // Fetch existing applications to avoid duplicates
      const existingApps =
        uniqueJobIds.length === 0
          ? []
          : await db.jobApplication.findMany({
              where: {
                jobId: { in: uniqueJobIds },
                email: user.email,
              },
              select: { jobId: true },
            });
      const alreadyAppliedSet = new Set(existingApps.map((a) => a.jobId));

      const applied: string[] = [];
      const skipped: { id: string; reason: string }[] = [];

      for (const jobId of uniqueJobIds) {
        if (alreadyAppliedSet.has(jobId)) {
          skipped.push({ id: jobId, reason: "already-applied" });
          continue;
        }

        try {
          const result = await applyAndNotify({
            db,
            jobId,
            userId: user.id,
            source: "auto",
          });
          if ((result as any)?.success !== false) {
            applied.push(jobId);
          } else {
            skipped.push({ id: jobId, reason: "failed" });
          }
        } catch (err) {
          console.error("Bulk auto-apply failed for job", jobId, err);
          skipped.push({ id: jobId, reason: "error" });
        }
      }

      return { applied, skipped };
    }),

    //Bulk Import Jobs
bulkCreate: adminProcedure
.input(jobImportSchema)
.mutation(async ({ ctx, input }) => {
  const db = ctx.prisma as PrismaClient;
  const admin = (ctx as any).user as { id?: string };

  let ownerId = admin?.id;
  if (!ownerId || ownerId === "admin-service") {
    const byId = process.env.ADMIN_DEFAULT_OWNER_ID;
    const byEmail = process.env.ADMIN_DEFAULT_OWNER_EMAIL;
    if (byId) ownerId = byId;
    else if (byEmail) {
      const u = await db.user.findUnique({ where: { email: byEmail }, select: { id: true } });
      if (!u) throw new TRPCError({ code: "BAD_REQUEST", message: "ADMIN_DEFAULT_OWNER_EMAIL not found" });
      ownerId = u.id;
    } else {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No ownerId available for import" });
    }
  }

  // Normalize tags: CSV often sends a single string like "CNC, GMAO, électromécanique"
  const normalizeTags = (val: unknown): string[] => {
    if (val === undefined || val === null) return [];
    if (Array.isArray(val)) {
      return val
        .flatMap((entry) => {
          if (typeof entry !== "string") return [];
          return entry
            .split(/[,\|;]+/g)
            .map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
        })
        .filter(Boolean);
    }
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) return [];
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed.filter((s: unknown) => typeof s === "string");
        } catch {}
      }
      return trimmed
        .split(/[,\|;]+/g)
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    }
    return [];
  };

  const data = input.rows.map((r) => {
    const row = r as any;
    const description = r.description || row.description_rewritten || r.description || "";
    return {
      userId: ownerId!,
      title: r.title,
      companyName: r.companyName,
      companyImage: r.companyImage ?? row.companyLogoS3 ?? null,
      description,
      category: r.category,
      locationRequirement: r.locationRequirement,
      experienceLevel: r.experienceLevel,
      type: r.type,
      // Keep compatibility with CSVs that still expose `skills` column.
      tags: normalizeTags((r as any).tags ?? row.tags ?? (r as any).skills ?? row.skills),
      wage: r.wage ?? null,
      countryIso2: row.countryIso2 ?? null,
      stateAbbreviation: r.stateAbbreviation ?? row.stateAbbr ?? null,
      city: r.city ?? null,
      applicationEmail: r.applicationEmail ?? row.applicationEmail_extracted ?? "",
      applicationUrl: r.applicationUrl ?? null,
      status: "published" as const,
    };
  });

  // Compute embeddings for imported jobs so they participate in semantic ranking.
  try {
    const texts = input.rows.map((r, idx) => {
      const row = r as any;
      const description = r.description || row.description_rewritten || "";
      const tags = (data[idx] as any).tags as string[];
      return buildJobEmbeddingText({
        title: r.title ?? "",
        description,
        tags: tags ?? [],
        city: r.city ?? null,
        locationRequirement: r.locationRequirement ?? null,
        experienceLevel: r.experienceLevel ?? null,
        type: r.type ?? null,
        wage: r.wage ?? null,
        companyName: r.companyName ?? null,
        category: r.category ?? null,
      });
    });
    const embeddings = await embedBatch(texts);
    embeddings.forEach((vec, idx) => {
      (data[idx] as any).embedding = vec;
    });
  } catch (err) {
    console.error("Failed to compute embeddings for imported jobs", err);
  }

  await db.job.createMany({ data });

  // Prisma only writes to the "embedding" Float[] column. The pgvector column
  // "embedding_vector" is used for semantic search and is not set by createMany.
  // Sync it from embedding so new jobs participate in vector search.
  try {
    await (db as any).$executeRawUnsafe(`
      UPDATE "Job"
      SET embedding_vector = embedding::vector
      WHERE embedding_vector IS NULL
        AND embedding IS NOT NULL
        AND array_length(embedding, 1) = 1024
    `);
  } catch (err) {
    console.error("Failed to sync embedding_vector from embedding", err);
  }

  return { success: true, count: data.length };
}),
});
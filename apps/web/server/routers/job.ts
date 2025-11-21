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
import type { PrismaClient } from "@workspace/db";
import { inngest } from "@/functions/inngest/client";
import { applyAndNotify } from "@/server/services/job-application";
import { headers } from "next/headers";
import { getTenantFromHost } from "@/lib/domain";
import maStates from "@workspace/ui/lib/states.json" assert { type: "json" };


export const jobRouter = router({
  createJob: protectedProcedure
    .input(jobListingFormSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = (ctx as any).user;

      try {
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
        // Emit background event for auto-apply (non-blocking)
        try {
          await inngest.send({
            name: "job/created",
            data: { jobId: job.id },
          });
        } catch (err) {
          console.error("Failed to send job/created event", err);
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
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 12;
      const locationRequirement = input?.locationRequirement;
      const category = input?.category;
      const experienceLevel = input?.experienceLevel;
      const type = input?.type;
      const search = input?.search?.trim() || "";
      const db = ctx.prisma as PrismaClient;

      // Base filter conditions
      const filters: string[] = [];
      const params: any[] = [];

      if (locationRequirement) {
        filters.push(`"locationRequirement" = $${params.length + 1}`);
        params.push(locationRequirement);
      }
      if (category) {
        filters.push(`category = $${params.length + 1}`);
        params.push(category);
      }
      if (experienceLevel) {
        filters.push(`"experienceLevel" = $${params.length + 1}`);
        params.push(experienceLevel);
      }
      if (type) {
        filters.push(`type = $${params.length + 1}`);
        params.push(type);
      }
      if ((input as any)?.countryIso2) {
        filters.push(`"countryIso2" = $${params.length + 1}`);
        params.push((input as any).countryIso2);
      }

      // Search logic with unaccent
      if (search) {
        filters.push(`
          (
            unaccent(lower(title)) LIKE unaccent(lower($${params.length + 1}))
            OR unaccent(lower(description)) LIKE unaccent(lower($${params.length + 1}))
            OR unaccent(lower("companyName")) LIKE unaccent(lower($${params.length + 1}))
            OR unaccent(lower(city)) LIKE unaccent(lower($${params.length + 1}))
          )
        `);
        params.push(`%${search}%`);
      }

      // Exclude Morocco for secondary domain
      try {
        const hdrs = await headers();
        const host = hdrs.get("host") || "";
        const tenant = getTenantFromHost(host);
        if (tenant === "secondary") {
          const maCodes = Object.keys(maStates as Record<string, string>);
          const maCodesPlaceholders = maCodes.map((_, i) => `$${params.length + 1 + i}`).join(", ");
          filters.push(`NOT ("countryIso2" = 'MA' OR "stateAbbreviation" IN (${maCodesPlaceholders}))`);
          params.push(...maCodes);
        }
      } catch {}

      // Build final WHERE clause
      const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

      // Pagination and ordering
      const offset = (page - 1) * pageSize;

      // Get jobs
      const items = await db.$queryRawUnsafe<any[]>(`
        SELECT 
          id, title, "companyName", "companyImage", description, category,
          "applicationUrl", "applicationEmail", wage, "countryIso2",
          "stateAbbreviation", tags, city, type, "experienceLevel",
          "locationRequirement", status, "createdAt"
        FROM "Job"
        ${whereClause}
        ORDER BY "createdAt" DESC, id DESC
        LIMIT ${pageSize} OFFSET ${offset};
      `, ...params);

      // Get total count
      const totalResult = await db.$queryRawUnsafe<{ count: number }[]>(`
        SELECT COUNT(*)::int AS count
        FROM "Job"
        ${whereClause};
      `, ...params);

      const total = totalResult[0]?.count ?? 0;

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
      const pageSize = input?.pageSize ?? 8;
      const enabled = input?.enabled ?? true;

      if (!enabled) {
        return { items: [], total: 0, page, pageSize };
      }

      // Load persisted auto-apply prefs
      const fullUser = await (db.user.findUnique as any)({
        where: { id: user.id },
        select: {
          autoApplyEnabled: true,
          autoApplyCategory: true,
          autoApplyKeywords: true,
          autoApplyRoles: true,
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

      // Determine if we have extra filters beyond category
      const hasKeywordFilters = !!(effectiveKeywords && effectiveKeywords.length);
      const hasRoleFilters = !!(effectiveRoles && effectiveRoles.length);

      const skip = (page - 1) * pageSize;

      // When extra filters are present, fetch all matching-category jobs and paginate after scoring/filtering.
      // Otherwise, rely on DB pagination for performance.
      let jobs:
        | {
            id: string;
            title: string | null;
            companyName: string | null;
            companyImage: string | null;
            description: string | null;
            category: any;
            applicationUrl: string | null;
            applicationEmail: string | null;
            wage: number | null;
            countryIso2: string | null;
            stateAbbreviation: string | null;
            tags: string[] | null;
            city: string | null;
            type: any;
            experienceLevel: any;
            locationRequirement: any;
            status: any;
            createdAt: Date;
          }[];
      let total: number;

      if (hasKeywordFilters || hasRoleFilters) {
        jobs = await db.job.findMany({
          where: {
            category: effectiveCategory as any,
          },
          orderBy: { createdAt: "desc" },
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
        });
        total = jobs.length;
      } else {
        const [pageJobs, catTotal] = await Promise.all([
          db.job.findMany({
            where: {
              category: effectiveCategory as any,
            },
            orderBy: { createdAt: "desc" },
            skip,
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
          db.job.count({
            where: {
              category: effectiveCategory as any,
            },
          }),
        ]);
        jobs = pageJobs;
        total = catTotal;
      }

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

      // Simple relevance scoring & filtering based on category + keywords (tags/text) & roles (title/description)
      const tokenize = (text: string) =>
        new Set(
          text
            .toLowerCase()
            .split(/[^a-z0-9+.#]/i)
            .filter(Boolean)
        );

      const scoredItems = jobs
        .map((job) => {
          const textTokens = tokenize(
            `${job.title ?? ""} ${job.description ?? ""}`
          );
          const tagTokens = new Set(
            (job.tags ?? []).map((t) => t.toLowerCase())
          );
          const jobTokens = new Set<string>([
            ...tagTokens,
            ...Array.from(textTokens),
          ]);

          let keywordMatches = 0;
          for (const kw of effectiveKeywords || []) {
            if (jobTokens.has(kw.toLowerCase())) {
              keywordMatches += 1;
            }
          }

          let roleMatches = 0;
          for (const role of effectiveRoles || []) {
            const roleToken = role.toLowerCase();
            // Match roles against both title and description tokens
            if (textTokens.has(roleToken)) {
              roleMatches += 1;
            }
          }

          const score = keywordMatches + roleMatches;

          return {
            ...job,
            alreadyApplied: appliedSet.has(job.id),
            _score: score,
          };
        })
        // If user specified keywords or roles, require at least one match (score > 0)
        .filter((item) => {
          if (!hasKeywordFilters && !hasRoleFilters) {
            return true;
          }
          return item._score > 0;
        });

      // Sort by score desc, then createdAt desc (they're already in createdAt desc)
      scoredItems.sort((a, b) => b._score - a._score);

      // When filters are present, paginate after filtering so "total" and visible items stay in sync.
      let items: typeof scoredItems;
      if (hasKeywordFilters || hasRoleFilters) {
        total = scoredItems.length;
        const start = skip;
        const end = start + pageSize;
        items = scoredItems.slice(start, end);
      } else {
        items = scoredItems;
      }

      const resultItems = items.map(({ _score, ...rest }) => rest);

      return { items: resultItems, total, page, pageSize };
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
        source: "manual",
      });

      return result;
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

  const data = input.rows.map((r) => ({
    userId: ownerId!,
    title: r.title,
    companyName: r.companyName,
    companyImage: r.companyImage ?? null,
    description: r.description,
    category: r.category,
    locationRequirement: r.locationRequirement,
    experienceLevel: r.experienceLevel,
    type: r.type,
    tags: [],
    wage: r.wage ?? null,
    countryIso2: (r as any).countryIso2 ?? null,
    stateAbbreviation: r.stateAbbreviation ?? null,
    city: r.city ?? null,
    applicationEmail: r.applicationEmail ?? "",
    applicationUrl: r.applicationUrl ?? null,
    status: "published" as const,
  }));

  await db.job.createMany({ data });
  // Background event for import (non-blocking)
  try {
    await inngest.send({
      name: "jobs/imported",
      data: { importedAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error("Failed to send jobs/imported event", err);
  }
  return { success: true, count: data.length };
}),
});
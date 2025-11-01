import { protectedProcedure, router, publicProcedure, adminProcedure } from "../trpc";
import {
  jobListingFormSchema,
  jobListQuerySchema,
  jobGetByIdSchema,
  jobApplicationCreateSchema,
  jobImportSchema,
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
      const search = input?.search;
      const db = ctx.prisma as PrismaClient;

      const where: any = {};
      if (locationRequirement) where.locationRequirement = locationRequirement;
      if (category) where.category = category;
      if (experienceLevel) where.experienceLevel = experienceLevel;
      if (type) where.type = type;
      if ((input as any)?.countryIso2) where.countryIso2 = (input as any).countryIso2;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { companyName: { contains: search, mode: "insensitive" } },
        ];
      }

      // Exclude Morocco (stateAbbreviation present in MA states) for secondary domain
      try {
        const hdrs = await headers();
        const host = hdrs.get("host") || "";
        const tenant = getTenantFromHost(host);
        if (tenant === "secondary") {
          const maCodes = Object.keys(maStates as Record<string, string>);
          where.NOT = where.NOT ?? {};
          where.NOT.stateAbbreviation = { in: maCodes } as any;
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
            user: { select: { name: true, image: true } },
            createdAt: true,
          },
        }),
        db.job.count({ where }),
      ]);
      return { items, total, page, pageSize };
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
    status: "draft" as const,
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
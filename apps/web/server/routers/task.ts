import { protectedProcedure, router, publicProcedure, adminProcedure } from "../trpc";
import {
  taskListingFormSchema,
  taskListQuerySchema,
  moderateApproveSchema,
  moderateRejectSchema,
  taskImportSchema,
} from "@workspace/ui/lib/validation-schemas";
import type { PrismaClient } from "@workspace/db";
import { TRPCError } from "@trpc/server";

export const taskRouter = router({
  // Create → Pending by default (schema), return review message
  createTask: protectedProcedure
    .input(taskListingFormSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = (ctx as any).user;

      try {
        const task = await db.task.create({
          data: {
            userId: user.id,
            title: input.title ?? null,
            description: input.description,
            category: input.category,
            bgStyle: input.bgStyle || null,
            budget: input.budget || null,
            budgetType: input.budgetType || null,
            stateAbbreviation: input.stateAbbreviation || null,
            city: input.city || null,
            address: input.address || null,
            latitude: input.latitude || null,
            longitude: input.longitude || null,
            phoneNumber: input.phoneNumber || null,
            email: input.email || null,
            displayName: input.displayName || null,
            displayImage: input.displayImage || null,
            deadline: input.deadline ? new Date(input.deadline) : null,
            images: JSON.stringify(input.images ?? []),
            // status defaults to Pending via schema
          },
          select: {
            id: true, title: true, description: true, category: true, status: true, createdAt: true
          },
        });

        return {
          success: true,
          message: "Your task is under review.",
          task,
        };
      } catch (error) {
        console.error("Error creating task:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create task",
        });
      }
    }),

  // Public list → default to Published unless status filter explicitly set
  getTask: publicProcedure
    .input(taskListQuerySchema.optional())
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 12;
      const category = input?.category;
      const status = input?.status;
      const search = input?.search;
      const city = input?.city;
      const stateAbbreviation = input?.stateAbbreviation;
      const budgetMin = input?.budgetMin;
      const budgetMax = input?.budgetMax;
      const db = ctx.prisma as any;

      const where: any = {};
      if (category) where.category = category;
      // if no explicit status filter, show only Published
      if (status) where.status = status;
      else where.status = "Published";

      if (city) where.city = { contains: city, mode: "insensitive" };
      if (stateAbbreviation) where.stateAbbreviation = stateAbbreviation;
      if (budgetMin || budgetMax) {
        where.budget = {};
        if (budgetMin) where.budget.gte = budgetMin;
        if (budgetMax) where.budget.lte = budgetMax;
      }
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { displayName: { contains: search, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        db.task.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true, title: true, description: true, bgStyle: true, category: true, status: true,
            budget: true, budgetType: true, stateAbbreviation: true, city: true,
            address: true, latitude: true, longitude: true,
            phoneNumber: true, email: true, displayName: true, displayImage: true,
            user: { select: { name: true, image: true } },
            createdAt: true,
          },
        }),
        db.task.count({ where }),
      ]);
      return { items, total, page, pageSize };
    }),

  // Admin: list pending
  getPending: adminProcedure.query(async ({ ctx }) => {
    const db = ctx.prisma as PrismaClient;
    return db.task.findMany({
      where: { status: "Pending" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, displayName: true, title: true, description: true, category: true,
        city: true, stateAbbreviation: true, createdAt: true, phoneNumber: true, email: true,
      },
    });
  }),

  // Admin: approve
  approve: adminProcedure
    .input(moderateApproveSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const admin = (ctx as any).user;
      const data: any = { status: "Published", moderatedAt: new Date() };
      if (admin?.id && admin.id !== "admin-service") data.moderatedBy = admin.id; // avoid FK error
      const updated = await db.task.update({ where: { id: input.id }, data });
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      // TODO: create Notification + email
      return { success: true };
    }),

  // Admin: reject
  reject: adminProcedure
    .input(moderateRejectSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const admin = (ctx as any).user;
      const data: any = {
        status: "Rejected",
        rejectionReason: input.reason,
        moderatedAt: new Date(),
      };
      if (admin?.id && admin.id !== "admin-service") data.moderatedBy = admin.id; // avoid FK error
      const updated = await db.task.update({ where: { id: input.id }, data });
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      // TODO: create Notification + email
      return { success: true };
    }),

  // Admin: bulk import tasks
  bulkCreate: adminProcedure
  .input(taskImportSchema)
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
      title: r.title ?? null,
      description: r.description,
      category: r.category,
      bgStyle: r.bgStyle ?? null,
      budget: r.budget ?? null,
      budgetType: r.budgetType ?? null,
      stateAbbreviation: r.stateAbbreviation ?? null,
      city: r.city ?? null,
      address: r.address ?? null,
      latitude: null,
      longitude: null,
      phoneNumber: r.phoneNumber ?? null,
      email: r.email ?? null,
      displayName: r.displayName ?? null,
      displayImage: r.displayImage ?? null,
      deadline: r.deadline ? new Date(r.deadline) : null,
      images: JSON.stringify([]),
      status: r.status ?? "Published",
    }));

    await db.task.createMany({ data });
    return { success: true, count: data.length };
  }),
});

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
            // budgetType removed
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
      const search = input?.search?.trim() || "";
      const city = input?.city;
      const stateAbbreviation = input?.stateAbbreviation;
      const budgetMin = input?.budgetMin;
      const budgetMax = input?.budgetMax;
      const db = ctx.prisma as any;

      // When a search term is provided, use unaccent() for accent-insensitive matching.
      if (search) {
        let whereSql = `WHERE 1=1`;
        const params: any[] = [];
        let idx = 1;

        if (category) {
          whereSql += ` AND "category" = $${idx}`;
          params.push(category);
          idx += 1;
        }

        // if no explicit status filter, show only Published
        const effectiveStatus = status ?? "Published";
        whereSql += ` AND "status" = $${idx}`;
        params.push(effectiveStatus);
        idx += 1;

        if (city) {
          whereSql += ` AND "city" ILIKE $${idx}`;
          params.push(`%${city}%`);
          idx += 1;
        }
        if (stateAbbreviation) {
          whereSql += ` AND "stateAbbreviation" = $${idx}`;
          params.push(stateAbbreviation);
          idx += 1;
        }
        if (budgetMin || budgetMax) {
          if (budgetMin) {
            whereSql += ` AND "budget" >= $${idx}`;
            params.push(budgetMin);
            idx += 1;
          }
          if (budgetMax) {
            whereSql += ` AND "budget" <= $${idx}`;
            params.push(budgetMax);
            idx += 1;
          }
        }

        // Token-aware fallback search (multi-word queries like "vendeuse a casablanca").
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
            OR unaccent(lower("displayName")) LIKE unaccent(lower($${idx}))
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
            "description",
            "bgStyle",
            "category",
            "status",
            "budget",
            "stateAbbreviation",
            "city",
            "address",
            "latitude",
            "longitude",
            "phoneNumber",
            "email",
            "displayName",
            "displayImage",
            "userId",
            "createdAt"
          FROM "Task"
        `;

        const itemsSql = `
          ${baseSelect}
          ${whereSql}
          ORDER BY "createdAt" DESC, "id" DESC
          LIMIT $${limitIdx} OFFSET $${offsetIdx}
        `;

        const countSql = `
          SELECT COUNT(*)::int AS "count"
          FROM "Task"
          ${whereSql}
        `;

        const limit = pageSize;
        const offset = (page - 1) * pageSize;

        const [rawItems, countRows] = await Promise.all([
          db.$queryRawUnsafe(itemsSql, ...params, limit, offset),
          db.$queryRawUnsafe(countSql, ...params),
        ]);

        const total = countRows[0]?.count ?? 0;

        const userIds = Array.from(
          new Set((rawItems as any[]).map((t) => t.userId).filter(Boolean)),
        );
        const usersById: Record<string, { name: string | null; image: string | null }> =
          userIds.length === 0
            ? {}
            : (
                await db.user.findMany({
                  where: { id: { in: userIds } },
                  select: { id: true, name: true, image: true },
                })
              ).reduce(
                (acc: any, u: any) => ({
                  ...acc,
                  [u.id]: { name: u.name ?? null, image: u.image ?? null },
                }),
                {},
              );

        const items = (rawItems as any[]).map((t) => ({
          ...t,
          user: t.userId ? usersById[t.userId] ?? { name: null, image: null } : null,
        }));

        return { items, total, page, pageSize };
      }

      // Default path (no search term): keep existing Prisma query builder.
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

      const [items, total] = await Promise.all([
        db.task.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            title: true,
            description: true,
            bgStyle: true,
            category: true,
            status: true,
            budget: true,
            stateAbbreviation: true,
            city: true,
            address: true,
            latitude: true,
            longitude: true,
            phoneNumber: true,
            email: true,
            displayName: true,
            displayImage: true,
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

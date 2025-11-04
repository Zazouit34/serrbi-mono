import { protectedProcedure, router, publicProcedure, adminProcedure } from "../trpc";
import {
  serviceListingFormSchema,
  serviceListQuerySchema,
  serviceGetByIdSchema,
  moderateApproveSchema,
  moderateRejectSchema,
  serviceImportSchema,
} from "@workspace/ui/lib/validation-schemas";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@workspace/db";

export const serviceRouter = router({
  createService: protectedProcedure
    .input(serviceListingFormSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = (ctx as any).user;

      try {
        const service = await db.service.create({
          data: {
            userId: user.id,
            title: input.title,
            displayName: input.displayName || null,
            displayImage: input.displayImage || null, // optional again
            images: JSON.stringify(input.images), // images required by schema
            description: input.description,
            serviceCategory: input.serviceCategory,
            type: input.type,
            price: input.price,
            stateAbbreviation: input.stateAbbreviation || null,
            city: input.city || null,
            address: input.address || null,
            latitude: input.latitude || null,
            longitude: input.longitude || null,
            phoneNumber: input.phoneNumber || null,
            email: input.email || null,
            website: input.website || null,
            openingHours: input.openingHours ? JSON.stringify(input.openingHours) : null,
          },
          select: {
            id: true,
            title: true,
            displayName: true,
            displayImage: true,
            images: true,
            description: true,
            serviceCategory: true,
            type: true,
            price: true,
            // priceType removed
            stateAbbreviation: true,
            city: true,
            address: true,
            latitude: true,
            longitude: true,
            phoneNumber: true,
            email: true,
            website: true,
            openingHours: true,
            averageRating: true,
            numberOfReviews: true,
            createdAt: true,
          },
        });

        return {
          success: true,
          message: "Service listing created successfully",
          service,
        };
      } catch (error) {
        console.error("Error creating service:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create service listing",
        });
      }
    }),

  getService: publicProcedure
    .input(serviceListQuerySchema.optional())
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 12;
      const serviceCategory = input?.serviceCategory;
      const type = input?.type;
      const search = input?.search;
      const city = input?.city;
      const stateAbbreviation = input?.stateAbbreviation;
      const priceMin = input?.priceMin;
      const priceMax = input?.priceMax;
      // priceType removed
      const db = ctx.prisma as any;

      const where: any = {};
      // default to published
      where.status = "published";
      if (serviceCategory) where.serviceCategory = serviceCategory;
      if (type) where.type = { contains: type, mode: "insensitive" };
      if (city) where.city = { contains: city, mode: "insensitive" };
      if (stateAbbreviation) where.stateAbbreviation = stateAbbreviation;
      // if (priceType) where.priceType = priceType; // removed
      if (priceMin || priceMax) {
        where.price = {};
        if (priceMin) where.price.gte = priceMin;
        if (priceMax) where.price.lte = priceMax;
      }
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { displayName: { contains: search, mode: "insensitive" } },
          { type: { contains: search, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        db.service.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
          id: true,
          title: true,
          displayName: true,
          displayImage: true,
          images: true,
          description: true,
          serviceCategory: true,
          type: true,
          price: true,
            // priceType removed
          stateAbbreviation: true,
          city: true,
          address: true,
          latitude: true,
          longitude: true,
          phoneNumber: true,
          email: true,
          website: true,
          openingHours: true,
          averageRating: true,
          numberOfReviews: true,
          user: { select: { name: true, image: true } },
          createdAt: true,
        },
        }),
        db.service.count({ where }),
      ]);
      return {
        items: items.map((s: any) => ({
          ...s,
          images: s.images ? JSON.parse(s.images) : [],
          openingHours: s.openingHours ? JSON.parse(s.openingHours) : null,
        })),
        total,
        page,
        pageSize,
      };
    }),

  getById: publicProcedure
    .input(serviceGetByIdSchema)
    .query(async ({ ctx, input }) => {
      const db = ctx.prisma as any;
      const service = await db.service.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          title: true,
          displayName: true,
          displayImage: true,
          images: true,
          description: true,
          serviceCategory: true,
          type: true,
          price: true,
          stateAbbreviation: true,
          city: true,
          address: true,
          latitude: true,
          longitude: true,
          phoneNumber: true,
          email: true,
          website: true,
          openingHours: true,
          averageRating: true,
          numberOfReviews: true,
          user: { select: { name: true, image: true } },
          createdAt: true,
        },
      });
      if (!service) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        ...service,
        images: service.images ? JSON.parse(service.images) : [],
        openingHours: service.openingHours ? JSON.parse(service.openingHours) : null,
      };
    }),

  // Admin: list pending
  getPending: adminProcedure.query(async ({ ctx }) => {
    const db = ctx.prisma as PrismaClient;
    return db.service.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, displayName: true, serviceCategory: true,
        city: true, stateAbbreviation: true, price: true, phoneNumber: true,
        email: true, createdAt: true,
      },
    });
  }),

  // Admin: approve
  approve: adminProcedure
    .input(moderateApproveSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const admin = (ctx as any).user;
      const data: any = { status: "published", moderatedAt: new Date() };
      if (admin?.id && admin.id !== "admin-service") data.moderatedBy = admin.id;
      const updated = await db.service.update({ where: { id: input.id }, data });
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  // Admin: reject
  reject: adminProcedure
    .input(moderateRejectSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const admin = (ctx as any).user;
      const data: any = {
        status: "rejected",
        rejectionReason: input.reason,
        moderatedAt: new Date(),
      };
      if (admin?.id && admin.id !== "admin-service") data.moderatedBy = admin.id;
      const updated = await db.service.update({ where: { id: input.id }, data });
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true };
    }),

  // Admin: bulk import services
  bulkCreate: adminProcedure
  .input(serviceImportSchema)
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
      title: r.title as any,
      displayName: (r.displayName ?? null) as any,
      displayImage: (r.displayImage ?? null) as any,
      images: JSON.stringify(r.images ?? []),
      description: r.description as any,
      serviceCategory: r.serviceCategory as any,
      type: r.type as any,
      price: (r.price ?? 0) as any,
      averageRating: (r.averageRating ?? 0) as any,
      stateAbbreviation: (r.stateAbbreviation ?? null) as any,
      city: (r.city ?? null) as any,
      address: (r.address ?? null) as any,
      latitude: null,
      longitude: null,
      phoneNumber: (r.phoneNumber ?? null) as any,
      email: (r.email ?? null) as any,
      website: (r.website ?? null) as any,
      openingHours: null,
      status: (r.status ?? "published") as any,
    }));

    await db.service.createMany({ data });
    return { success: true, count: data.length };
  }),
});
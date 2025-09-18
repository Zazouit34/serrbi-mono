import { protectedProcedure, router } from "../trpc";
import {
  addFavoriteSchema,
  removeFavoriteSchema,
  getFavoritesSchema,
} from "@workspace/ui/lib/validation-schemas";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@workspace/db";

export const favoriteRouter = router({
  // Add to favorites
  add: protectedProcedure
    .input(addFavoriteSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = (ctx as any).user;

      try {
        // Check if already favorited
        const existing = await db.favorite.findFirst({
          where: {
            userId: user.id,
            ...(input.jobId && { jobId: input.jobId }),
            ...(input.serviceId && { serviceId: input.serviceId }),
            ...(input.taskId && { taskId: input.taskId }),
          },
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Item already favorited",
          });
        }

        const favorite = await db.favorite.create({
          data: {
            userId: user.id,
            jobId: input.jobId || null,
            serviceId: input.serviceId || null,
            taskId: input.taskId || null,
          },
        });

        return {
          success: true,
          message: "Added to favorites",
          favorite,
        };
      } catch (error) {
        console.error("Error adding favorite:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add favorite",
        });
      }
    }),

  // Remove from favorites
  remove: protectedProcedure
    .input(removeFavoriteSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = (ctx as any).user;

      try {
        const favorite = await db.favorite.findFirst({
          where: {
            id: input.id,
            userId: user.id,
          },
        });

        if (!favorite) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Favorite not found",
          });
        }

        await db.favorite.delete({
          where: { id: input.id },
        });

        return {
          success: true,
          message: "Removed from favorites",
        };
      } catch (error) {
        console.error("Error removing favorite:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove favorite",
        });
      }
    }),

  // Get user's favorites
  getFavorites: protectedProcedure
    .input(getFavoritesSchema)
    .query(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = (ctx as any).user;
      const { page, pageSize, type } = input;

      const where: any = { userId: user.id };
      
      if (type === "job") where.jobId = { not: null };
      if (type === "service") where.serviceId = { not: null };
      if (type === "task") where.taskId = { not: null };

      const [items, total] = await Promise.all([
        db.favorite.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            job: {
              select: {
                id: true,
                title: true,
                companyName: true,
                description: true,
                category: true,
                wage: true,
                city: true,
                stateAbbreviation: true,
                type: true,
                experienceLevel: true,
                locationRequirement: true,
                createdAt: true,
              },
            },
            service: {
              select: {
                id: true,
                title: true,
                description: true,
                serviceCategory: true,
                price: true,
                priceType: true,
                city: true,
                stateAbbreviation: true,
                displayName: true,
                displayImage: true,
                phoneNumber: true,
                createdAt: true,
              },
            },
            task: {
              select: {
                id: true,
                title: true,
                description: true,
                category: true,
                budget: true,
                budgetType: true,
                city: true,
                stateAbbreviation: true,
                displayName: true,
                displayImage: true,
                phoneNumber: true,
                createdAt: true,
              },
            },
          },
        }),
        db.favorite.count({ where }),
      ]);

      return { items, total, page, pageSize };
    }),

  // Check if item is favorited
  isFavorited: protectedProcedure
    .input(addFavoriteSchema)
    .query(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = (ctx as any).user;

      const favorite = await db.favorite.findFirst({
        where: {
          userId: user.id,
          ...(input.jobId && { jobId: input.jobId }),
          ...(input.serviceId && { serviceId: input.serviceId }),
          ...(input.taskId && { taskId: input.taskId }),
        },
      });

      return { isFavorited: !!favorite, favoriteId: favorite?.id };
    }),
});

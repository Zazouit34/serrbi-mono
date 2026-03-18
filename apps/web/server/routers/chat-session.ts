import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@workspace/db";

export const chatSessionRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.prisma as PrismaClient;
    const user = (ctx as any).user;
    return db.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
      take: 50,
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = (ctx as any).user;

      const session = await db.chatSession.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          // Prisma JSON columns are typed with Prisma's internal JsonValue type.
          // We cast to `any` so the generated tRPC types stay portable in TS.
          messages: true,
        },
      });

      if (!session || session.userId !== user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Chat session not found" });
      }

      return {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messages: session.messages as any,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        messages: z.any(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = (ctx as any).user;
      const session = await db.chatSession.create({
        data: {
          userId: user.id,
          title: input.title,
          messages: input.messages ?? [],
        },
      });
      return { id: session.id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        messages: z.any().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = (ctx as any).user;
      const existing = await db.chatSession.findUnique({ where: { id: input.id } });
      if (!existing || existing.userId !== user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await db.chatSession.update({
        where: { id: input.id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.messages !== undefined && { messages: input.messages }),
        },
      });
      return { success: true };
    }),

  rename: protectedProcedure
    .input(z.object({ id: z.string().uuid(), title: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = (ctx as any).user;
      const existing = await db.chatSession.findUnique({ where: { id: input.id } });
      if (!existing || existing.userId !== user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await db.chatSession.update({
        where: { id: input.id },
        data: { title: input.title },
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = (ctx as any).user;
      const existing = await db.chatSession.findUnique({ where: { id: input.id } });
      if (!existing || existing.userId !== user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await db.chatSession.delete({ where: { id: input.id } });
      return { success: true };
    }),
});

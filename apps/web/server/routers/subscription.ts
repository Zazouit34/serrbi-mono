import { z } from "zod";
import {
  router,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { PaddleService } from "@/lib/paddle/server";
import type { PrismaClient } from "@workspace/db";
import { SubscriptionStatus } from "@workspace/db";

export const subscriptionRouter = router({
  // Get available plans
  getPlans: publicProcedure.query(async ({ ctx }) => {
    const db = ctx.prisma as PrismaClient;
    return db.subscriptionPlanConfig.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });
  }),

  // Get user's current subscription
  getCurrentSubscription: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.prisma as PrismaClient;

    const subscription = await db.subscription.findUnique({
      where: { userId: ctx.user.id },
      include: {
        plan: true,
        payments: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (subscription?.paddleSubscriptionId) {
      try {
        const paddleSubscription = await PaddleService.getSubscription(
          subscription.paddleSubscriptionId
        );

        if (paddleSubscription.status.toString() !== subscription.status) {
          await db.subscription.update({
            where: { id: subscription.id },
            data: {
              status: paddleSubscription.status as SubscriptionStatus,
              currentPeriodStart: paddleSubscription.currentBillingPeriod
                ?.startsAt
                ? new Date(paddleSubscription.currentBillingPeriod.startsAt)
                : subscription.currentPeriodStart,
              currentPeriodEnd: paddleSubscription.currentBillingPeriod?.endsAt
                ? new Date(paddleSubscription.currentBillingPeriod.endsAt)
                : subscription.currentPeriodEnd,
            },
          });
        }
      } catch (error) {
        console.error("Error syncing with Paddle:", error);
      }
    }

    return subscription;
  }),

  // Create a new subscription (for free plan or after Paddle checkout)
  createSubscription: protectedProcedure
    .input(z.object({ planId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;

      const existing = await db.subscription.findFirst({
        where: {
          userId: ctx.user.id,
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
        },
      });

      if (existing)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already has an active subscription",
        });

      const plan = await db.subscriptionPlanConfig.findUnique({
        where: { id: input.planId },
      });

      if (!plan)
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });

      if (plan.price === 0) {
        return db.subscription.create({
          data: {
            userId: ctx.user.id,
            planId: input.planId,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          include: { plan: true },
        });
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Paid plans must be subscribed through Paddle checkout",
      });
    }),

  // Update subscription (change plan)
  updateSubscription: protectedProcedure
    .input(z.object({ planId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;

      const subscription = await db.subscription.findUnique({
        where: { userId: ctx.user.id },
        include: { plan: true },
      });

      if (!subscription)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No subscription found",
        });

      const newPlan = await db.subscriptionPlanConfig.findUnique({
        where: { id: input.planId },
      });

      if (!newPlan)
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });

      if (subscription.paddleSubscriptionId && newPlan.paddlePriceId) {
        try {
          const paddleSubscription = await PaddleService.updateSubscription({
            subscriptionId: subscription.paddleSubscriptionId,
            items: [{ priceId: newPlan.paddlePriceId, quantity: 1 }],
          });

          return db.subscription.update({
            where: { id: subscription.id },
            data: {
              planId: input.planId,
              status: paddleSubscription.status as SubscriptionStatus,
            },
            include: { plan: true },
          });
        } catch (error) {
          console.error("Error updating subscription in Paddle:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update subscription",
          });
        }
      }

      return db.subscription.update({
        where: { id: subscription.id },
        data: { planId: input.planId },
        include: { plan: true },
      });
    }),

  // Cancel subscription
  cancelSubscription: protectedProcedure
    .input(z.object({ immediately: z.boolean().optional().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;

      const subscription = await db.subscription.findUnique({
        where: { userId: ctx.user.id },
      });

      if (!subscription)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No subscription found",
        });

      if (subscription.paddleSubscriptionId) {
        try {
          const paddleSubscription = await PaddleService.cancelSubscription(
            subscription.paddleSubscriptionId
          );

          const paddleStatus =
            paddleSubscription.status?.toLowerCase() || "canceled";

          return db.subscription.update({
            where: { id: subscription.id },
            data: {
              status:
                paddleStatus.includes("cancel") ||
                paddleStatus.includes("inactive")
                  ? SubscriptionStatus.CANCELED
                  : SubscriptionStatus.ACTIVE,
              canceledAt: new Date(),
            },
            include: { plan: true },
          });
        } catch (error: any) {
          const message =
            error?.error?.message || error.message || "Unknown error";

          if (message.includes("pending scheduled changes")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "You already have a pending subscription change (pause/cancel). Please wait until it takes effect.",
            });
          }

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message,
          });
        }
      }

      return db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
        },
        include: { plan: true },
      });
    }),

  // Pause subscription
  pauseSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const db = ctx.prisma as PrismaClient;

    const subscription = await db.subscription.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!subscription || !subscription.paddleSubscriptionId)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active subscription found",
      });

    try {
      const paddleSubscription = await PaddleService.pauseSubscription(
        subscription.paddleSubscriptionId
      );

      const paddleStatus = paddleSubscription.status?.toLowerCase() || "paused";

      return db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: paddleStatus.includes("pause")
            ? SubscriptionStatus.PAUSED
            : SubscriptionStatus.ACTIVE,
          pausedAt: new Date(),
        },
        include: { plan: true },
      });
    } catch (error) {
      console.error("Error pausing subscription in Paddle:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to pause subscription",
      });
    }
  }),

  // Resume subscription
  resumeSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const db = ctx.prisma as PrismaClient;

    const subscription = await db.subscription.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!subscription || !subscription.paddleSubscriptionId)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No paused subscription found",
      });

    try {
      const paddleSubscription = await PaddleService.resumeSubscription(
        subscription.paddleSubscriptionId
      );

      return db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: paddleSubscription.status as SubscriptionStatus,
          pausedAt: null,
        },
        include: { plan: true },
      });
    } catch (error) {
      console.error("Error resuming subscription in Paddle:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to resume subscription",
      });
    }
  }),

  // Payment history
  getPaymentHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;

      const [payments, total] = await Promise.all([
        db.payment.findMany({
          where: { userId: ctx.user.id },
          take: input.limit,
          skip: input.offset,
          orderBy: { createdAt: "desc" },
          include: { subscription: { include: { plan: true } } },
        }),
        db.payment.count({ where: { userId: ctx.user.id } }),
      ]);

      return { payments, total, hasMore: input.offset + input.limit < total };
    }),

  // Usage stats
  getUsageStats: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.prisma as PrismaClient;

    const subscription = await db.subscription.findUnique({
      where: { userId: ctx.user.id },
      include: { plan: true },
    });

    if (!subscription || !subscription.plan)
      return {
        applicationsUsed: 0,
        applicationsLimit: 0,
        autoAppliedUsed: 0,
        autoApplyLimit: 0,
        jobBoardAccess: false,
        resumeAtsScoreAccess: false,
        smartMatchAccess: false,
        autoApplyAccess: false,
      };

    // Start of current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // usage computed by email to cover both manual and auto submissions
    const userEmail = ctx.user.email;

    const [applicationsUsed, autoAppliedUsed] = await Promise.all([
      db.jobApplication.count({
        where: { email: userEmail, createdAt: { gte: startOfMonth } },
      }),
      db.jobApplication.count({
        where: {
          email: userEmail,
          createdAt: { gte: startOfMonth },
          source: "auto",
        },
      }),
    ]);

    return {
      applicationsUsed,
      applicationsLimit: subscription.plan.monthlyApplyLimit ?? 0,
      autoAppliedUsed,
      autoApplyLimit: subscription.plan.autoApplyMonthlyLimit ?? 0,
      jobBoardAccess: subscription.plan.jobBoardAccess,
      resumeAtsScoreAccess: subscription.plan.resumeAtsScoreAccess,
      smartMatchAccess: subscription.plan.smartMatchAccess,
      autoApplyAccess: subscription.plan.autoApplyAccess,
    };
  }),

  // Admin - get all subscriptions
  getAllSubscriptions: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z.nativeEnum(SubscriptionStatus).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const where = input.status ? { status: input.status } : {};

      const [subscriptions, total] = await Promise.all([
        db.subscription.findMany({
          where,
          take: input.limit,
          skip: input.offset,
          orderBy: { createdAt: "desc" },
          include: {
            user: true,
            plan: true,
            payments: { take: 5, orderBy: { createdAt: "desc" } },
          },
        }),
        db.subscription.count({ where }),
      ]);

      return {
        subscriptions,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),
});

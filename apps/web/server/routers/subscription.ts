import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { PaddleService } from "@/lib/paddle/server";
import { prisma } from "@workspace/db";
import { PrismaClient } from "@workspace/db";
import { SubscriptionPlan, SubscriptionStatus, PaymentStatus } from "@workspace/db";

export const subscriptionRouter = router({
  // Get available plans
  getPlans: publicProcedure.query(async ({ ctx }) => {
    const db = ctx.prisma as PrismaClient;
    const plans = await db.subscriptionPlanConfig.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
    return plans;
  }),

  // Get user's current subscription
  getCurrentSubscription: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: ctx.user.id },
      include: {
        plan: true,
        payments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // If subscription exists and has Paddle ID, sync with Paddle
    if (subscription?.paddleSubscriptionId) {
      try {
        const paddleSubscription = await PaddleService.getSubscription(
          subscription.paddleSubscriptionId
        );

        // Update local subscription if status changed
        if (paddleSubscription.status.toString() !== subscription.status) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: paddleSubscription.status as SubscriptionStatus,
              currentPeriodStart: paddleSubscription.currentBillingPeriod?.startsAt 
                ? new Date(paddleSubscription.currentBillingPeriod.startsAt) 
                : subscription.currentPeriodStart,
              currentPeriodEnd: paddleSubscription.currentBillingPeriod?.endsAt 
                ? new Date(paddleSubscription.currentBillingPeriod.endsAt) 
                : subscription.currentPeriodEnd,
            },
          });
        }
      } catch (error) {
        console.error('Error syncing with Paddle:', error);
      }
    }

    return subscription;
  }),

  // Create a new subscription (for free plan or after Paddle checkout)
  createSubscription: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already has an active subscription
      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          userId: ctx.user.id,
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
        },
      });

      if (existingSubscription) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User already has an active subscription',
        });
      }

      // Get plan details
      const plan = await prisma.subscriptionPlanConfig.findUnique({
        where: { id: input.planId },
      });

      if (!plan) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Plan not found',
        });
      }

      // For free plan, create subscription directly
      if (plan.price === 0) {
        const subscription = await prisma.subscription.create({
          data: {
            userId: ctx.user.id,
            planId: input.planId,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
          include: { plan: true },
        });

        return subscription;
      }

      // For paid plans, this should be called after Paddle webhook
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Paid plans must be subscribed through Paddle checkout',
      });
    }),

  // Update subscription (change plan)
  updateSubscription: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: ctx.user.id },
        include: { plan: true },
      });

      if (!subscription) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No subscription found',
        });
      }

      const newPlan = await prisma.subscriptionPlanConfig.findUnique({
        where: { id: input.planId },
      });

      if (!newPlan) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Plan not found',
        });
      }

      // If subscription has Paddle ID, update in Paddle
      if (subscription.paddleSubscriptionId && newPlan.paddlePriceId) {
        try {
          const paddleSubscription = await PaddleService.updateSubscription({
            subscriptionId: subscription.paddleSubscriptionId,
            items: [{ priceId: newPlan.paddlePriceId, quantity: 1 }],
          });

          // Update in database
          const updatedSubscription = await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              planId: input.planId,
              status: paddleSubscription.status as SubscriptionStatus,
            },
            include: { plan: true },
          });

          return updatedSubscription;
        } catch (error) {
          console.error('Error updating subscription in Paddle:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update subscription',
          });
        }
      }

      // For free tier, update directly
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: { planId: input.planId },
        include: { plan: true },
      });

      return updatedSubscription;
    }),

  // Cancel subscription
  cancelSubscription: protectedProcedure
    .input(
      z.object({
        immediately: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: ctx.user.id },
      });

      if (!subscription) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No subscription found',
        });
      }

      // If has Paddle subscription, cancel in Paddle
      if (subscription.paddleSubscriptionId) {
        try {
          const paddleSubscription = await PaddleService.cancelSubscription(
            subscription.paddleSubscriptionId,
            input.immediately ? 'immediately' : 'next_billing_period'
          );

          const updatedSubscription = await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: paddleSubscription.status as SubscriptionStatus,
              canceledAt: new Date(),
            },
            include: { plan: true },
          });

          return updatedSubscription;
        } catch (error) {
          console.error('Error canceling subscription in Paddle:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to cancel subscription',
          });
        }
      }

      // For free tier, cancel directly
      return await prisma.subscription.update({
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
    const subscription = await prisma.subscription.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!subscription || !subscription.paddleSubscriptionId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No active subscription found',
      });
    }

    try {
      const paddleSubscription = await PaddleService.pauseSubscription(
        subscription.paddleSubscriptionId
      );

      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: paddleSubscription.status as SubscriptionStatus,
          pausedAt: new Date(),
        },
        include: { plan: true },
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Error pausing subscription in Paddle:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to pause subscription',
      });
    }
  }),

  // Resume subscription
  resumeSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!subscription || !subscription.paddleSubscriptionId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No paused subscription found',
      });
    }

    try {
      const paddleSubscription = await PaddleService.resumeSubscription(
        subscription.paddleSubscriptionId
      );

      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: paddleSubscription.status as SubscriptionStatus,
          pausedAt: null,
        },
        include: { plan: true },
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Error resuming subscription in Paddle:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to resume subscription',
      });
    }
  }),

  // Get payment history
  getPaymentHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where: { userId: ctx.user.id },
          take: input.limit,
          skip: input.offset,
          orderBy: { createdAt: 'desc' },
          include: {
            subscription: {
              include: { plan: true },
            },
          },
        }),
        prisma.payment.count({
          where: { userId: ctx.user.id },
        }),
      ]);

      return {
        payments,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Get usage stats
  getUsageStats: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: ctx.user.id },
      include: { plan: true },
    });

    if (!subscription) {
      return {
        jobListingsUsed: 0,
        jobListingsLimit: 0,
        serviceListingsUsed: 0,
        serviceListingsLimit: 0,
        taskListingsUsed: 0,
        taskListingsLimit: 0,
      };
    }

    // Count active listings
    const [jobCount, serviceCount, taskCount] = await Promise.all([
      prisma.job.count({
        where: {
          userId: ctx.user.id,
          status: { in: ['published', 'pending'] },
        },
      }),
      prisma.service.count({
        where: {
          userId: ctx.user.id,
          status: { in: ['published', 'pending'] },
        },
      }),
      prisma.task.count({
        where: {
          userId: ctx.user.id,
          status: { in: ['Active', 'Pending', 'Published'] },
        },
      }),
    ]);

    return {
      jobListingsUsed: jobCount,
      jobListingsLimit: subscription.plan.maxJobListings,
      serviceListingsUsed: serviceCount,
      serviceListingsLimit: subscription.plan.maxServiceListings,
      taskListingsUsed: taskCount,
      taskListingsLimit: subscription.plan.maxTaskListings,
      featuredListings: subscription.plan.featuredListings,
      prioritySupport: subscription.plan.prioritySupport,
      analyticsAccess: subscription.plan.analyticsAccess,
    };
  }),

  // Check if user can create more listings
  canCreateListing: protectedProcedure
    .input(
      z.object({
        type: z.enum(['job', 'service', 'task']),
      })
    )
    .query(async ({ ctx, input }) => {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: ctx.user.id },
        include: { plan: true },
      });

      // Free tier or no subscription
      if (!subscription || subscription.plan.name === SubscriptionPlan.FREE) {
        let count = 0;
        let limit = 0;

        switch (input.type) {
          case 'job':
            count = await prisma.job.count({
              where: {
                userId: ctx.user.id,
                status: { in: ['published', 'pending'] },
              },
            });
            limit = 3;
            break;
          case 'service':
            count = await prisma.service.count({
              where: {
                userId: ctx.user.id,
                status: { in: ['published', 'pending'] },
              },
            });
            limit = 1;
            break;
          case 'task':
            count = await prisma.task.count({
              where: {
                userId: ctx.user.id,
                status: { in: ['Active', 'Pending', 'Published'] },
              },
            });
            limit = 2;
            break;
        }

        return {
          canCreate: count < limit,
          used: count,
          limit,
          requiresUpgrade: count >= limit,
        };
      }

      // Paid subscription
      let used = 0;
      let limit: number | null = null;

      switch (input.type) {
        case 'job':
          used = subscription.jobListingsUsed;
          limit = subscription.plan.maxJobListings;
          break;
        case 'service':
          used = subscription.serviceListingsUsed;
          limit = subscription.plan.maxServiceListings;
          break;
        case 'task':
          used = subscription.taskListingsUsed;
          limit = subscription.plan.maxTaskListings;
          break;
      }

      return {
        canCreate: limit === null || used < limit,
        used,
        limit,
        requiresUpgrade: limit !== null && used >= limit,
      };
    }),

  // Admin endpoints
  getAllSubscriptions: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z.nativeEnum(SubscriptionStatus).optional(),
      })
    )
    .query(async ({ input }) => {
      const where = input.status ? { status: input.status } : {};

      const [subscriptions, total] = await Promise.all([
        prisma.subscription.findMany({
          where,
          take: input.limit,
          skip: input.offset,
          orderBy: { createdAt: 'desc' },
          include: {
            user: true,
            plan: true,
            payments: {
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
          },
        }),
        prisma.subscription.count({ where }),
      ]);

      return {
        subscriptions,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),
});
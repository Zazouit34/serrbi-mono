import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { PaddleService } from "@/lib/paddle-server";
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

    // If subscription exists and has Paddle ID, fetch latest status from Paddle
    if (subscription?.paddleSubscriptionId) {
      try {
        const paddleSubscription = await PaddleService.getSubscription(
          subscription.paddleSubscriptionId
        );

        // Update local subscription status if changed
        if (paddleSubscription.status !== subscription.status) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: paddleSubscription.status as SubscriptionStatus,
              currentPeriodStart: paddleSubscription.currentBillingPeriod?.startsAt,
              currentPeriodEnd: paddleSubscription.currentBillingPeriod?.endsAt,
            },
          });
        }
      } catch (error) {
        console.error('Error syncing with Paddle:', error);
      }
    }

    return subscription;
  }),

  // Create or get Paddle customer
  createOrGetCustomer: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if customer already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { userId: ctx.user.id },
    });

    if (existingCustomer) {
      return existingCustomer;
    }

    // Create new Paddle customer
    const paddleCustomer = await PaddleService.createCustomer(
      ctx.user.email,
      ctx.user.name
    );

    // Save to database
    const customer = await prisma.customer.create({
      data: {
        userId: ctx.user.id,
        paddleCustomerId: paddleCustomer.id,
        email: paddleCustomer.email,
        name: paddleCustomer.name,
      },
    });

    return customer;
  }),

  // Create a new subscription
  createSubscription: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
        paddlePriceId: z.string(),
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

      // Get or create Paddle customer
      let customer = await prisma.customer.findUnique({
        where: { userId: ctx.user.id },
      });

      if (!customer) {
        const paddleCustomer = await PaddleService.createCustomer(
          ctx.user.email,
          ctx.user.name
        );

        customer = await prisma.customer.create({
          data: {
            userId: ctx.user.id,
            paddleCustomerId: paddleCustomer.id,
            email: paddleCustomer.email,
            name: paddleCustomer.name,
          },
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

      // Create subscription in Paddle
      const paddleSubscription = await PaddleService.createSubscription({
        customerId: customer.paddleCustomerId,
        items: [{ priceId: input.paddlePriceId, quantity: 1 }],
        trialPeriod: plan.name !== SubscriptionPlan.FREE ? {
          frequency: 7,
          interval: 'day',
        } : undefined,
      });

      // Create subscription in database
      const subscription = await prisma.subscription.create({
        data: {
          userId: ctx.user.id,
          planId: input.planId,
          paddleSubscriptionId: paddleSubscription.id,
          paddleCustomerId: customer.paddleCustomerId,
          status: paddleSubscription.status as SubscriptionStatus,
          currentPeriodStart: paddleSubscription.currentBillingPeriod?.startsAt,
          currentPeriodEnd: paddleSubscription.currentBillingPeriod?.endsAt,
          trialStart: paddleSubscription.trialPeriod?.startsAt,
          trialEnd: paddleSubscription.trialPeriod?.endsAt,
        },
        include: { plan: true },
      });

      return subscription;
    }),

  // Update subscription (upgrade/downgrade)
  updateSubscription: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
        paddlePriceId: z.string(),
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

      if (!subscription.paddleSubscriptionId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Subscription not linked to Paddle',
        });
      }

      // Update in Paddle
      const paddleSubscription = await PaddleService.updateSubscription({
        subscriptionId: subscription.paddleSubscriptionId,
        items: [{ priceId: input.paddlePriceId, quantity: 1 }],
      });

      // Update in database
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          planId: input.planId,
          status: paddleSubscription.status as SubscriptionStatus,
          currentPeriodStart: paddleSubscription.currentBillingPeriod?.startsAt,
          currentPeriodEnd: paddleSubscription.currentBillingPeriod?.endsAt,
        },
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

      if (!subscription.paddleSubscriptionId) {
        // If no Paddle subscription, just cancel in database
        return await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.CANCELED,
            canceledAt: new Date(),
          },
        });
      }

      // Cancel in Paddle
      const paddleSubscription = await PaddleService.cancelSubscription(
        subscription.paddleSubscriptionId,
        input.immediately ? 'immediately' : 'next_billing_period'
      );

      // Update in database
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: paddleSubscription.status as SubscriptionStatus,
          canceledAt: new Date(),
        },
        include: { plan: true },
      });

      return updatedSubscription;
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

    // Pause in Paddle
    const paddleSubscription = await PaddleService.pauseSubscription(
      subscription.paddleSubscriptionId
    );

    // Update in database
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: paddleSubscription.status as SubscriptionStatus,
        pausedAt: new Date(),
      },
      include: { plan: true },
    });

    return updatedSubscription;
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

    // Resume in Paddle
    const paddleSubscription = await PaddleService.resumeSubscription(
      subscription.paddleSubscriptionId
    );

    // Update in database
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: paddleSubscription.status as SubscriptionStatus,
        pausedAt: null,
      },
      include: { plan: true },
    });

    return updatedSubscription;
  }),

  // Get transaction for updating payment method
  getUpdatePaymentMethodTransaction: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!subscription || !subscription.paddleSubscriptionId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No active subscription found',
      });
    }

    const transaction = await PaddleService.getPaymentMethodUpdateTransaction(
      subscription.paddleSubscriptionId
    );

    return {
      subscriptionId: subscription.id,
      transactionId: transaction?.transactionId || transaction?.id || undefined,
    };
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
        // Count existing listings for free tier limits
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
            limit = 3; // Free tier limit
            break;
          case 'service':
            count = await prisma.service.count({
              where: {
                userId: ctx.user.id,
                status: { in: ['published', 'pending'] },
              },
            });
            limit = 1; // Free tier limit
            break;
          case 'task':
            count = await prisma.task.count({
              where: {
                userId: ctx.user.id,
                status: { in: ['Active', 'Pending', 'Published'] },
              },
            });
            limit = 2; // Free tier limit
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

  // Get Paddle client token
  getPaddleClientToken: publicProcedure.query(async () => {
    // Return the client token from environment variable
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    const environment = process.env.PADDLE_ENVIRONMENT || 'sandbox';
    
    // Development fallback - you can replace this with your actual Paddle client token
    const fallbackToken = token || 'test_client_token_for_development';
    
    if (!token) {
      console.warn('⚠️  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN not set. Using development fallback.');
      console.warn('   Please set up your Paddle credentials in .env.local for production use.');
    }
    
    return {
      token: fallbackToken,
      environment,
    };
  }),

  // Get customer's payment methods
  getPaymentMethods: protectedProcedure.query(async ({ ctx }) => {
    const customer = await prisma.customer.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!customer) {
      return [];
    }

    try {
      const paymentMethods = await PaddleService.getCustomerPaymentMethods(customer.paddleCustomerId);
      return paymentMethods;
    } catch (error) {
      console.error('Error getting payment methods:', error);
      return [];
    }
  }),

  // Get customer's invoices
  getInvoices: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const customer = await prisma.customer.findUnique({
        where: { userId: ctx.user.id },
      });

      if (!customer) {
        return { invoices: [], total: 0, hasMore: false };
      }

      try {
        const invoices = await PaddleService.getCustomerInvoices(customer.paddleCustomerId);
        return {
          invoices: invoices.slice(input.offset, input.offset + input.limit),
          total: invoices.length,
          hasMore: input.offset + input.limit < invoices.length,
        };
      } catch (error) {
        console.error('Error getting invoices:', error);
        return { invoices: [], total: 0, hasMore: false };
      }
    }),

  // Get invoice download URL
  getInvoiceDownloadUrl: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ input }) => {
      try {
        const downloadUrl = await PaddleService.getInvoiceDownloadUrl(input.invoiceId);
        return { downloadUrl };
      } catch (error) {
        console.error('Error getting invoice download URL:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get invoice download URL',
        });
      }
    }),

  // Get upcoming invoice
  getUpcomingInvoice: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!subscription || !subscription.paddleSubscriptionId) {
      return null;
    }

    try {
      const upcomingInvoice = await PaddleService.getUpcomingInvoice(subscription.paddleSubscriptionId);
      return upcomingInvoice;
    } catch (error) {
      console.error('Error getting upcoming invoice:', error);
      return null;
    }
  }),

  // Preview subscription change
  previewSubscriptionChange: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
        paddlePriceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
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
        const preview = await PaddleService.previewSubscriptionChange({
          subscriptionId: subscription.paddleSubscriptionId,
          items: [{ priceId: input.paddlePriceId, quantity: 1 }],
        });
        return preview;
      } catch (error) {
        console.error('Error previewing subscription change:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to preview subscription change',
        });
      }
    }),

  // Create refund (admin only for now)
  createRefund: adminProcedure
    .input(
      z.object({
        paymentId: z.string(),
        amount: z.number().optional(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const payment = await prisma.payment.findUnique({
        where: { id: input.paymentId },
      });

      if (!payment || !payment.paddleTransactionId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Payment not found or not linked to Paddle',
        });
      }

      try {
        const refund = await PaddleService.createRefund({
          transactionId: payment.paddleTransactionId,
          amount: input.amount,
          reason: input.reason,
        });

        // Update payment status
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.REFUNDED,
            refundedAt: new Date(),
          },
        });

        return refund;
      } catch (error) {
        console.error('Error creating refund:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create refund',
        });
      }
    }),
});
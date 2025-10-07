import {
  publicProcedure,
  router,
  protectedProcedure,
  adminProcedure,
} from "../trpc";
import {
  loginFormSchema,
  registerFormSchema,
  emailFormSchema,
  tokenFormSchema,
  resetPasswordFormSchema,
  updateUserRoleSchema,
  resumeUpdateSchema,
  autoApplyPrefsSchema,
} from "@workspace/ui/lib/validation-schemas";
import bcrypt from "bcryptjs";

import { PLANS } from "@/lib/plans";

import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@workspace/db";
import { SubscriptionStatus } from "@workspace/db";
import {
  createResetPasswordToken,
  getResetPasswordTokenbyToken,
} from "../services/verification";
import { inngest } from "@/functions/inngest/client";

export const authRouter = router({
  // Keep login for compatibility with existing UI
  login: publicProcedure
    .input(loginFormSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const { email, password } = input;

      const user = await db.user.findUnique({ where: { email } });
      if (!user || !user.password)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });

      // Session is created on the client via NextAuth signIn('credentials')
      return { success: true, message: "Login validated" };
    }),

  register: publicProcedure
    .input(registerFormSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const { email, password, name, phone } = input;

      const existing = await db.user.findUnique({ where: { email } });
      if (existing)
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already exists",
        });

      const hashed = await bcrypt.hash(password, 10);
      const user = await db.user.create({
        data: { name, email, phone, password: hashed },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      });

      // Automatically assign free subscription to new users
      try {
        const freePlan = await db.subscriptionPlanConfig.findFirst({
          where: { name: "FREE" },
        });

        if (freePlan) {
          await db.subscription.create({
            data: {
              userId: user.id,
              planId: freePlan.id,
              status: SubscriptionStatus.ACTIVE,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(
                Date.now() + 365 * 24 * 60 * 60 * 1000
              ), // 1 year for free plan
            },
          });
        }
      } catch (error) {
        console.error("Error creating free subscription for new user:", error);
        // Don't fail registration if subscription creation fails
      }

      return { success: true, message: "Registration successful", user };
    }),

  forgotPassword: publicProcedure
    .input(emailFormSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const { email } = input;

      const existing = await db.user.findUnique({ where: { email } });
      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const token = await createResetPasswordToken(email);
      await inngest.send({
        name: "email/send",
        data: {
          type: "password-reset",
          data: { email, token: token.token },
        },
      });

      return { success: true, message: "Password reset email sent" };
    }),

  verifyResetToken: publicProcedure
    .input(tokenFormSchema)
    .query(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const { token } = input;

      const tokenData = await db.passwordResetToken.findFirst({
        where: { token },
      });
      if (!tokenData)
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid token" });
      if (tokenData.expires < new Date()) {
        await db.passwordResetToken.delete({ where: { id: tokenData.id } });
        throw new TRPCError({ code: "BAD_REQUEST", message: "Token expired" });
      }

      return { success: true, message: "Token verified", tokenData };
    }),

  resetPassword: publicProcedure
    .input(resetPasswordFormSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const tokenRecord = await getResetPasswordTokenbyToken(input.token);
      if (!tokenRecord)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid token" });
      if (tokenRecord.expires < new Date()) {
        await db.passwordResetToken.delete({ where: { id: tokenRecord.id } });
        throw new TRPCError({ code: "BAD_REQUEST", message: "Token expired" });
      }

      const user = await db.user.findUnique({
        where: { email: tokenRecord.email },
      });
      if (!user) {
        await db.passwordResetToken.delete({ where: { id: tokenRecord.id } });
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const hashed = await bcrypt.hash(input.password, 10);
      await db.user.update({
        where: { id: user.id },
        data: { password: hashed },
      });
      await db.passwordResetToken.delete({ where: { id: tokenRecord.id } });

      return { success: true, message: "Password has been changed" };
    }),

  userData: protectedProcedure.query(async ({ ctx }) => {
    // ctx.user is injected by protectedProcedure
    return { user: (ctx as any).user, session: ctx.session };
  }),

  // Admin only: list users
  getUsers: adminProcedure.query(async ({ ctx }) => {
    const db = ctx.prisma as PrismaClient;
    return db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Admin only: update user role
  updateUserRole: adminProcedure
    .input(updateUserRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      await db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });
      return { success: true };
    }),

  //Update Resume
  updateResume: protectedProcedure
    .input(resumeUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      const user = (ctx as any).user;
      await db.user.update({
        where: { id: user.id },
        data: { resumeUrl: input.resumeUrl },
      });
      await inngest.send({
        name: "user/resume.updated",
        data: { userId: user.id },
      });
      return { success: true };
    }),
  // clear resume
  clearResume: protectedProcedure.mutation(async ({ ctx }) => {
    const db = ctx.prisma as PrismaClient;
    const user = (ctx as any).user;
    await db.user.update({
      where: { id: user.id },
      data: { resumeUrl: null },
    });
    return { success: true };
  }),

  whoAmI: adminProcedure.query(async ({ ctx }) => {
    const { id, role } = (ctx as any).user as { id: string; role: string };
    return { id, role };
  }),

  //auto-apply
  getAutoApplyPrefs: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.prisma as PrismaClient;
    const u = await db.user.findUnique({
      where: { id: (ctx as any).user.id },
      select: {
        autoApplyEnabled: true,
        autoApplyCategory: true,
        autoApplyKeywords: true,
      },
    });
    return (
      u ?? {
        autoApplyEnabled: false,
        autoApplyCategory: null,
        autoApplyKeywords: [],
        autoApplyMinMatches: 2,
      }
    );
  }),

  updateAutoApplyPrefs: protectedProcedure
    .input(autoApplyPrefsSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient;
      await db.user.update({
        where: { id: (ctx as any).user.id },
        data: {
          autoApplyEnabled: input.enabled,
          autoApplyCategory: input.category,
          autoApplyKeywords: input.keywords,
        },
      });
      return { success: true };
    }),

  //auto apply stats
  getAutoApplyStats: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.prisma as PrismaClient;
    const user = ctx.user;

    // start of current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get all job applications for this user this month
    const apps = await db.jobApplication.findMany({
      where: {
        email: user.email,
        createdAt: { gte: startOfMonth },
      },
      orderBy: { createdAt: "desc" },
      take: 5, // limit to latest 5 for now
      select: {
        id: true,
        createdAt: true,
        job: {
          select: {
            title: true,
            companyName: true,
          },
        },
      },
    });

    const appliedCount = apps.length;

    return { appliedCount, recent: apps };
  }),

  //track user planId
  getUserSubscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.prisma as PrismaClient;
    const userId = ctx.user.id;

    const subscription = await db.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      select: {
        planId: true,
        plan: { select: { name: true } },
      },
    });

    // ✅ Always return eligible in both cases
    if (!subscription) {
      return {
        active: false,
        plan: null,
        eligible: false, 
      };
    }

    const eligiblePlans = [PLANS.BASIC.id, PLANS.PREMIUM.id];

    const isEligible = eligiblePlans.includes(subscription.planId);

    return {
      active: true,
      plan: subscription.plan.name,
      eligible: isEligible,
    };
  }),
});

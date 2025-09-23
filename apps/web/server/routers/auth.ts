import { publicProcedure, router, protectedProcedure, adminProcedure } from "../trpc";
import { loginFormSchema, registerFormSchema, emailFormSchema , tokenFormSchema ,resetPasswordFormSchema, updateUserRoleSchema } from "@workspace/ui/lib/validation-schemas";
import bcrypt from "bcryptjs";

import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@workspace/db"
import { createResetPasswordToken, getResetPasswordTokenbyToken } from "../services/verification"
import { inngest } from "@/functions/inngest/client";




export const authRouter = router({
  // Keep login for compatibility with existing UI
  login: publicProcedure.input(loginFormSchema).mutation(async ({ ctx, input }) => {
    const db = ctx.prisma as PrismaClient
    const { email, password } = input

    const user = await db.user.findUnique({ where: { email } })
    if (!user || !user.password) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" })

    // Session is created on the client via NextAuth signIn('credentials')
    return { success: true, message: "Login validated" }
  }),

  register: publicProcedure.input(registerFormSchema).mutation(async ({ ctx, input }) => {
    const db = ctx.prisma as PrismaClient
    const { email, password, name, phone } = input

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "User already exists" })

    const hashed = await bcrypt.hash(password, 10)
    const user = await db.user.create({
      data: { name, email, phone, password: hashed },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    })

    // Trigger welcome workflow
    await inngest.send({
      name: "auth/user.registered",
      data: { user }
    });

    return { success: true, message: "Registration successful", user }
  }),

  forgotPassword: publicProcedure.input(emailFormSchema).mutation(async ({ ctx, input }) => {
    const db = ctx.prisma as PrismaClient
    const { email } = input

    const existing = await db.user.findUnique({ where: { email } })
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" })

    const token = await createResetPasswordToken(email)
    await inngest.send({
      name: "email/send",
      data: {
        type: "password-reset",
        data: { email, token: token.token }
      }
    });
  
    return { success: true, message: "Password reset email sent" }
  }),

  verifyResetToken : publicProcedure.input(tokenFormSchema).query(async ({ ctx, input }) => {
    const db = ctx.prisma as PrismaClient
    const { token } = input
    
    const tokenData = await db.passwordResetToken.findFirst({ where: { token } })
    if (!tokenData) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid token" })
    if (tokenData.expires < new Date()) {
      await db.passwordResetToken.delete({ where: { id: tokenData.id } })
      throw new TRPCError({ code: "BAD_REQUEST", message: "Token expired" })
    }
  
    return { success: true, message: "Token verified", tokenData }
  }),

 resetPassword: publicProcedure
 .input(resetPasswordFormSchema)
 .mutation(async ({ ctx, input }) => {
   const db = ctx.prisma as PrismaClient
   const tokenRecord = await getResetPasswordTokenbyToken(input.token)
   if (!tokenRecord) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid token" })
   if (tokenRecord.expires < new Date()) {
     await db.passwordResetToken.delete({ where: { id: tokenRecord.id } })
     throw new TRPCError({ code: "BAD_REQUEST", message: "Token expired" })
   }

   const user = await db.user.findUnique({ where: { email: tokenRecord.email } })
   if (!user) {
     await db.passwordResetToken.delete({ where: { id: tokenRecord.id } })
     throw new TRPCError({ code: "NOT_FOUND", message: "User not found" })
   }

   const hashed = await bcrypt.hash(input.password, 10)
   await db.user.update({ where: { id: user.id }, data: { password: hashed } })
   await db.passwordResetToken.delete({ where: { id: tokenRecord.id } })

   return { success: true, message: "Password has been changed" }
 }),
  
  

  userData: protectedProcedure.query(async ({ ctx }) => {
    // ctx.user is injected by protectedProcedure
    return { user: (ctx as any).user, session: ctx.session }
  }),

  // Admin only: list users
  getUsers: adminProcedure.query(async ({ ctx }) => {
    const db = ctx.prisma as PrismaClient
    return db.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })
  }),

  // Admin only: update user role
  updateUserRole: adminProcedure
    .input(updateUserRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.prisma as PrismaClient
      await db.user.update({ where: { id: input.userId }, data: { role: input.role } })
      return { success: true }
    }),
})






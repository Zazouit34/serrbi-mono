import { publicProcedure, router, protectedProcedure } from "../trpc";
import { loginFormSchema, registerFormSchema } from "@workspace/ui/lib/validation-schemas";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@workspace/db"

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

    return { success: true, message: "Registration successful", user }
  }),

  userData: protectedProcedure.query(async ({ ctx }) => {
    // ctx.user is injected by protectedProcedure
    return { user: (ctx as any).user, session: ctx.session }
  }),
})
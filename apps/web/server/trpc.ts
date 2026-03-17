import { initTRPC, TRPCError } from "@trpc/server"
import { auth } from "@/auth"
import { headers } from "next/headers"
import type { Session } from "next-auth"

// IMPORTANT: Hide Prisma types from exported API types
// We still use the real prisma client at runtime, but do not expose its type.
import { prisma } from "@workspace/db"
import type { PrismaClient } from "@workspace/db"

type Ctx = {
  session: Session | null
  prisma: unknown
  adminToken?: string | null
  adminEmail?: string | null
  user?: unknown
}

export const createContext = async (): Promise<Ctx> => {
  const session = await auth()
  const hdrs = await headers()
  const adminToken = hdrs.get("x-admin-token")
  const adminEmail = hdrs.get("x-admin-email")
  return { session, prisma, adminToken, adminEmail }
}

const t = initTRPC.context<Ctx>().create()

// Admin middleware: allow either valid admin token header OR session user with ADMIN role
const isAdmin = t.middleware(async ({ ctx, next }) => {
  const db = ctx.prisma as PrismaClient

  // Service-to-service token path
  if (ctx.adminToken && ctx.adminToken === process.env.ADMIN_API_TOKEN) {
    if (ctx.adminEmail) {
      const tokenUser = await db.user.findUnique({
        where: { email: ctx.adminEmail },
        select: { id: true, role: true },
      })
      if (tokenUser && tokenUser.role === "ADMIN") {
        return next({ ctx: { ...ctx, user: tokenUser } })
      }
    }
    return next({ ctx: { ...ctx, user: { id: "admin-service", role: "ADMIN" } } })
  }

  // Session user path
  const email = ctx.session?.user?.email
  if (!email) throw new TRPCError({ code: "FORBIDDEN" })

  const user = await db.user.findUnique({ where: { email }, select: { id: true, role: true } })
  if (!user || user.role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN" })

  return next({ ctx: { ...ctx, user } })
})

export const adminProcedure = t.procedure.use(isAdmin)


export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user?.email) throw new TRPCError({ code: "UNAUTHORIZED" })

  // Locally downcast, does not leak into exported types
  const db = ctx.prisma as PrismaClient

  const user = await db.user.findUnique({
    where: { email: ctx.session.user.email },
    select: { id: true, name: true, email: true, phone: true, image: true, emailVerified: true, resumeUrl: true }
  })
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" })

  return next({ ctx: { ...ctx, user } })
})
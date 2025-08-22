import { initTRPC, TRPCError } from "@trpc/server"
import { auth } from "@/auth"
import type { Session } from "next-auth"

// IMPORTANT: Hide Prisma types from exported API types
// We still use the real prisma client at runtime, but do not expose its type.
import { prisma } from "@workspace/db"
import type { PrismaClient } from "@workspace/db"

type Ctx = {
  session: Session | null
  prisma: unknown
}

export const createContext = async (): Promise<Ctx> => {
  const session = await auth()
  return { session, prisma }
}

const t = initTRPC.context<Ctx>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user?.email) throw new TRPCError({ code: "UNAUTHORIZED" })

  // Locally downcast, does not leak into exported types
  const db = ctx.prisma as PrismaClient

  const user = await db.user.findUnique({
    where: { email: ctx.session.user.email },
    select: { id: true, name: true, email: true, phone: true, image: true, emailVerified: true }
  })
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" })

  return next({ ctx: { ...ctx, user } })
})
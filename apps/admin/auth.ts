import NextAuth, { type NextAuthResult } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@workspace/db"
import authConfig from "./auth.config"

const result = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  ...authConfig,
  callbacks: {
    async session({ session, token }: { session: any, token: any }) {
      if (!session?.user) return null
      // block non-admin sessions (double safety)
      return token?.role === "ADMIN" ? session : null
    },
    async jwt({ token }: { token: any }) {
      if (!token.sub) return token
      const u = await prisma.user.findUnique({ where: { id: token.sub } })
      if (u) token.role = u.role
      return token
    },
  },
})

export const handlers: NextAuthResult["handlers"] = result.handlers
export const auth: NextAuthResult["auth"] = result.auth
export const signIn: NextAuthResult["signIn"] = result.signIn
export const signOut: NextAuthResult["signOut"] = result.signOut

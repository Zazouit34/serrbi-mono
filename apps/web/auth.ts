import NextAuth, { type NextAuthResult } from 'next-auth'
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@workspace/db"
import authConfig from "./auth.config"

const result = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // Edge-friendly; Accounts still created via adapter
  ...authConfig,
  callbacks: {
    async session({ session, token }) {
      if (session.user && token?.sub) session.user.id = token.sub
      return session
    },
  },
})

export const handlers: NextAuthResult['handlers'] = result.handlers
export const auth: NextAuthResult['auth'] = result.auth
export const signIn: NextAuthResult['signIn'] = result.signIn
export const signOut: NextAuthResult['signOut'] = result.signOut
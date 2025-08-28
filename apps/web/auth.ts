import NextAuth, { type NextAuthResult } from 'next-auth'
import { Role } from '@workspace/db'
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@workspace/db"
import authConfig from "./auth.config"



const result = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // Edge-friendly; Accounts still created via adapter
  ...authConfig,

  events: {
    async linkAccount({ user }) {
      await prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          emailVerified: new Date()
        }
      })
    }
  },

  callbacks: {
    async session({ session, token }) {
      
      if (session.user && token?.sub) session.user.id = token.sub

      if (session.user && token?.role) session.user.role = token.role as Role

      if(session.user) session.user.phone = (token.phone as string | null) ?? null

      
      return session
    },
    async jwt({ token }) {
     if (!token.sub) return token;

     const existingUser = await prisma.user.findUnique({
      where: {
        id: token.sub
      }
     })

     if(!existingUser) return token;

    token.role = existingUser.role
    token.phone = existingUser.phone ?? null
    
    return token
      
    }
  },
})

export const handlers: NextAuthResult['handlers'] = result.handlers
export const auth: NextAuthResult['auth'] = result.auth
export const signIn: NextAuthResult['signIn'] = result.signIn
export const signOut: NextAuthResult['signOut'] = result.signOut





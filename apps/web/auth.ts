import NextAuth, { type NextAuthResult } from 'next-auth'
import { Role } from '@workspace/db'
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@workspace/db"
import authConfig from "./auth.config"

const result = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  
  // Add these for better session handling
  pages: {
    signIn: '/login',
    signOut: '/',
  },

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
    },
    // Remove the return statements - events don't return values
    async signIn() {
      // Session refreshes automatically
    },
    async signOut() {
      // Session refreshes automatically  
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
    },
    
    // Handle redirects properly
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
})

export const handlers: NextAuthResult['handlers'] = result.handlers
export const auth: NextAuthResult['auth'] = result.auth
export const signIn: NextAuthResult['signIn'] = result.signIn
export const signOut: NextAuthResult['signOut'] = result.signOut





import type { NextMiddleware } from "next/server"
import NextAuth from 'next-auth'
import authConfig from './auth.config'
import { publicRoutes, authRoutes, apiAuthPrefix, DEFAULT_LOGIN_REDIRECT, privateRoutes } from "./routes"
import { isSecondaryHost } from "@/lib/domain"


const { auth } = NextAuth(authConfig)


const middleware: NextMiddleware = auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix) || nextUrl.pathname.startsWith("/api/trpc")
  const isPrivateRoute = privateRoutes.includes(nextUrl.pathname)
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname)
  const isAuthRoute = authRoutes.includes(nextUrl.pathname)

  if(isApiAuthRoute) {
    return null;
  }

  // Domain-based variant restrictions
  const host = nextUrl.hostname
  if (isSecondaryHost(host)) {
    const blocked = nextUrl.pathname.startsWith("/services") || nextUrl.pathname.startsWith("/tasks")
    if (blocked) {
      return Response.redirect(new URL('/', nextUrl))
    }
  }

  if(isAuthRoute) {
    if(isLoggedIn) {
      return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl))
    }
    return null;
  }
  
  if(isPrivateRoute){
    if(!isLoggedIn) {
      return Response.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(nextUrl.pathname)}`, nextUrl))
    }
    return null;
  }


  
  return null;

  })
  
export default middleware
  

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
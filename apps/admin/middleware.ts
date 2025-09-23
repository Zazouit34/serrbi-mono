import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export default async function middleware(req: Request) {
  const url = new URL(req.url)
  const isLogin = url.pathname.startsWith("/login")

  const token = await getToken({
    req: req as any,
    secret: process.env.AUTH_SECRET,               // <-- add this
    secureCookie: process.env.NODE_ENV === "production",
  })

  if (!token && !isLogin) return NextResponse.redirect(new URL("/login", url))
  if (token && (token as any).role !== "ADMIN") return NextResponse.redirect(new URL("/login", url))

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/auth|api/trpc).*)"],
}
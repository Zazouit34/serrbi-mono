import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@workspace/db"
import { loginFormSchema } from "@workspace/ui/lib/validation-schemas"

export default {
  providers: [
    Credentials({
      async authorize(credentials: any) {
        const parsed = loginFormSchema.safeParse(credentials)
        if (!parsed.success) return null
        const { email, password } = parsed.data

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || user.role !== "ADMIN" || !user.password) return null

        const ok = await bcrypt.compare(password, user.password)
        return ok ? user : null
      }
    })
  ],
} satisfies NextAuthConfig

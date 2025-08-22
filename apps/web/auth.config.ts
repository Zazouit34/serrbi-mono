import Credentials from "next-auth/providers/credentials"
import { loginFormSchema } from "@workspace/ui/lib/validation-schemas";
import { prisma } from "@workspace/db"
import bcrypt from "bcryptjs"
import Google from "next-auth/providers/google"
import type { NextAuthConfig } from "next-auth"

 
export default { 
    providers: [
        Google,
        Credentials({
            async authorize(credentials) {
                const validatedFields = loginFormSchema.safeParse(credentials)
                if (validatedFields.success) {
                    const { email, password } = validatedFields.data

                    const user = await prisma.user.findUnique({ where: { email } })
                    if (!user || !user.password) throw new Error("User does not exist")

                   const isPasswordValid = await bcrypt.compare(password, user.password)
                   if (isPasswordValid)
                   return user
                }
                return null;
            }
        }),
    ] } satisfies NextAuthConfig
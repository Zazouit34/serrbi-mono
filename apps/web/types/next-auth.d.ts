import { DefaultSession } from "next-auth"
import { Role } from "@workspace/db"
export type ExtendedUser = DefaultSession["user"] & {
  id: string
  role: Role
  phone?: string | null
}

declare module "next-auth" {
  interface Session {
    user: ExtendedUser
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role
    phone?: string | null
  }
}
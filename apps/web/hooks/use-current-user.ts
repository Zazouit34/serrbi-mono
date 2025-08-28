// serrbi/apps/web/hooks/use-current-user.ts
"use client"
import { useSession } from "next-auth/react"

export function useCurrentUser() {
  const { data, status } = useSession()
  return { user: data?.user ?? null, status }
}
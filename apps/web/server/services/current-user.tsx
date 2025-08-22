// e.g. serrbi/apps/web/server/services/current-user.ts
import { auth } from "@/auth"
import { prisma } from "@workspace/db"

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) return null

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
      emailVerified: true,
    },
  })
}
// serrbi/apps/web/app/api/send/route.ts
import { sendPasswordResetEmail } from "@/server/services/email"

export async function POST(req: Request) {
  const { type, email, token } = await req.json()

  if (type === "password-reset" && email && token) {
    await sendPasswordResetEmail(email, token)
    return new Response(null, { status: 204 })
  }

  return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 })
}
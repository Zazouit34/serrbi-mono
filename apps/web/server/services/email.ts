// serrbi/apps/web/server/services/email.ts
import { Resend } from "resend"

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY is missing")
  return new Resend(key)
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `/reset?token=${encodeURIComponent(token)}`
  await getResend().emails.send({
    from: "Serrbi <onboarding@resend.dev>",
    to: email,
    subject: "Reset your password",
    html: `<h1>Reset</h1><p><a href="${link}">Reset password</a></p>`,
  })
}

export async function sendVerificationEmail(email: string, token: string) {
  const link = `/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
  await getResend().emails.send({
    from: "Serrbi <onboarding@resend.dev>",
    to: email,
    subject: "Verify your email",
    html: `<h1>Verify</h1><p><a href="${link}">Verify account</a></p>`,
  })
}
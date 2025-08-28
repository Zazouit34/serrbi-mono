// serrbi/apps/web/server/services/email.ts
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${APP_URL}/reset?token=${encodeURIComponent(token)}`
  await resend.emails.send({
    from: "Serrbi <onboarding@resend.dev>",
    to: email,
    subject: "Reset your password",
    html: `<h1>Reset your password</h1>
    <p>Click <a href="${resetLink}">here</a> to reset your password</p>`,
  })
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyLink = `${APP_URL}/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
  await resend.emails.send({
    from: "Serrbi <onboarding@resend.dev>",
    to: email,
    subject: "Verify your email",
    html: `<h1>Verify your email</h1>
    <p>Click <a href="${verifyLink}">here</a> to verify your account</p>`,
  })
}
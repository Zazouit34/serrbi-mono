// serrbi/apps/web/server/services/email.ts
import { Resend } from "resend"

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY is missing")
  return new Resend(key)
}

// Password reset email
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
    from: "Serrbi",
    to: email,
    subject: "Verify your email",
    html: `<h1>Verify</h1><p><a href="${link}">Verify account</a></p>`,
  })
}

// Job application email
export async function sendJobApplicationEmail(
  applicationEmail: string,
  jobTitle: string,
  companyName: string,
  applicantName: string,
  applicantEmail: string,
  cvData?: string,
  cvFilename?: string
) {
  const resend = getResend()

  const attachments =
    cvData && cvFilename
      ? [
          {
            filename: cvFilename,
            content: cvData, // base64 string
          },
        ]
      : []

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://serrbi.ma"
  const baseUrl = appUrl.replace(/\/$/, "")
  const logoUrl = `${baseUrl}/og/og-default.png`

  await resend.emails.send({
    from: "Serrbi Talent Team <talents@serrbi.com>", // ✅ must be on your verified sending domain
    to: applicationEmail,
    replyTo: applicantEmail,
    subject: `Candidate from Serrbi for ${jobTitle} – ${applicantName}`,
    html: `
      <div style="font-family: system, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color:#f3f4f6; padding:24px 0;">
        <div style="max-width:640px; margin:0 auto; padding:0 16px;">
          <!-- Header / visual -->
          <div style="text-align:center; margin-bottom:24px;">
            <img src="${logoUrl}" alt="Serrbi" style="max-width:100%; border-radius:16px; border:1px solid #e5e7eb;" />
          </div>

          <div style="background-color:#ffffff; border-radius:16px; padding:24px 24px 20px; border:1px solid #e5e7eb;">
            <p style="font-size:14px; color:#4b5563; margin:0 0 16px;">
              Bonjour${companyName ? " " + companyName : ""},
            </p>

            <p style="font-size:14px; color:#111827; margin:0 0 12px;">
              Je vous écris au nom de <strong>Serrbi</strong>, une plateforme de recrutement assistée par l’IA.
              Un talent vient de postuler à votre offre&nbsp;:
            </p>

            <table role="presentation" style="width:100%; border-collapse:collapse; font-size:14px; margin:12px 0 16px;">
              <tr>
                <td style="padding:4px 0; color:#6b7280; width:120px;">Poste</td>
                <td style="padding:4px 0; color:#111827;"><strong>${jobTitle}</strong></td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#6b7280;">Entreprise</td>
                <td style="padding:4px 0; color:#111827;">${companyName}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#6b7280;">Candidat</td>
                <td style="padding:4px 0; color:#111827;">${applicantName}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#6b7280;">Contact</td>
                <td style="padding:4px 0; color:#111827;">
                  <a href="mailto:${applicantEmail}" style="color:#2563eb; text-decoration:none;">
                    ${applicantEmail}
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#6b7280;">CV</td>
                <td style="padding:4px 0; color:#111827;">
                  ${cvData ? "Fourni en pièce jointe" : "Non fourni"}
                </td>
              </tr>
            </table>

            <p style="font-size:14px; color:#111827; margin:0 0 12px;">
              Vous pouvez répondre directement à ce message ou contacter le candidat via son adresse e‑mail ci‑dessus.
            </p>

            <p style="font-size:13px; color:#6b7280; margin:16px 0 0;">
              Bien à vous,<br/>
              <strong>L’équipe Serrbi Talent</strong>
            </p>
          </div>

          <p style="font-size:11px; color:#9ca3af; text-align:center; margin:16px 0 0;">
            Cet e‑mail vous a été envoyé car une candidature a été soumise à votre offre via Serrbi.
          </p>
        </div>
      </div>
    `,
    attachments,
  })
}

// Service booking email
export async function sendServiceBookingEmail(
  serviceEmail: string,
  serviceTitle: string,
  serviceProviderName: string,
  clientName: string,
  clientEmail: string,
  clientPhone: string,
  message?: string,
  preferredDate?: string,
  preferredTime?: string
) {
  const resend = getResend()

  await resend.emails.send({
    from: clientEmail,
    to: serviceEmail,
    subject: `New Service Booking for ${serviceTitle}`,
    html: `
      <h2>New Service Booking</h2>
      <p><strong>Service:</strong> ${serviceTitle}</p>
      <p><strong>Provider:</strong> ${serviceProviderName}</p>
      <p><strong>Client:</strong> ${clientName}</p>
      <p><strong>Email:</strong> ${clientEmail}</p>
      <p><strong>Phone:</strong> ${clientPhone}</p>
      ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
      ${preferredDate ? `<p><strong>Preferred Date:</strong> ${preferredDate}</p>` : ''}
      ${preferredTime ? `<p><strong>Preferred Time:</strong> ${preferredTime}</p>` : ''}
    `,
  })
}

// Welcome email
export async function sendWelcomeEmail(email: string, name: string) {
  const resend = getResend()

  await resend.emails.send({
    from: "support@serrbi.com", // ✅ MUST be on your verified sending domain
    to: email,
    subject: "Welcome to Serrbi! 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to Serrbi, ${name}! 🎉</h1>
        
        <p>We're excited to have you join our AI-driven marketplace!</p>
        
        <h2>What you can do on Serrbi:</h2>
        <ul>
          <li>🔍 <strong>Find Jobs</strong> - Discover opportunities that match your skills</li>
          <li>🛠️ <strong>Offer Services</strong> - Connect with clients who need your expertise</li>
          <li>📋 <strong>Post Tasks</strong> - Get help with projects and gigs</li>
          <li>🤖 <strong>AI Assistant</strong> - Get personalized recommendations</li>
        </ul>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Getting Started:</h3>
          <p>1. Complete your profile<br/>
          2. Browse our marketplace<br/>
          3. Start connecting with opportunities!</p>
        </div>
        
        <p>If you have any questions, we're here to help!</p>
        
        <p>Best regards,<br/>The Serrbi Team</p>
      </div>
    `,
  })
}
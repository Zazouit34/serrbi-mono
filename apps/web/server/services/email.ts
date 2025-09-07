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
  
  const attachments = cvData && cvFilename ? [{
    filename: cvFilename,
    content: cvData, // base64 string
  }] : []

  await resend.emails.send({
    from: "Serrbi <applications@resend.dev>",
    to: applicationEmail,
    subject: `New Application for ${jobTitle} - ${companyName}`,
    html: `
      <h2>New Job Application</h2>
      <p><strong>Position:</strong> ${jobTitle}</p>
      <p><strong>Company:</strong> ${companyName}</p>
      <p><strong>Applicant:</strong> ${applicantName}</p>
      <p><strong>Email:</strong> ${applicantEmail}</p>
       ${cvData ? '<p><strong>CV:</strong> Attached</p>' : '<p><strong>CV:</strong> Not provided</p>'}
    `,
    attachments,
  })
}

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
    from: "Serrbi <bookings@resend.dev>",
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
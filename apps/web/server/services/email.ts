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
    from: "Serrbi <onboarding@resend.dev>",
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

// Welcome email
export async function sendWelcomeEmail(email: string, name: string) {
  const resend = getResend()

  await resend.emails.send({
    from: "Serrbi <welcome@resend.dev>",
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
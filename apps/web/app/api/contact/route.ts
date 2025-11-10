import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().min(4),
  message: z.string().min(10),
});

export async function POST(req: Request) {
  try {
    const data = await req.json().catch(() => null);
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { name, email, subject, message } = parsed.data;

    const key = process.env.RESEND_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }
    const resend = new Resend(key);

    await resend.emails.send({
      from: "Serrbi <support@serrbi.com>",
      to: "support@serrbi.com",
      replyTo: email,
      subject: `[Contact] ${subject}`,
      html: `
        <h2>New Contact Message</h2>
        <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br/>")}</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}



// serrbi/apps/web/server/services/job-application.ts
import type { PrismaClient } from "@workspace/db";
import { TRPCError } from "@trpc/server";
import { inngest } from "@/functions/inngest/client";

type ApplyInput = {
  db: PrismaClient;
  jobId: string;
  userId?: string;
  name?: string;
  email?: string;
  resumeUrl?: string;
  cvData?: string;     // base64
  cvFilename?: string; // e.g. "resume.pdf"
};

async function fetchResumeAsBase64(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch resume from ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}

export async function applyAndNotify(input: ApplyInput) {
  const { db, jobId } = input;

  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { id: true, title: true, applicationEmail: true, companyName: true },
  });
  if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

  let userName = input.name || "";
  let userEmail = input.email || "";
  let resumeUrl = input.resumeUrl;

  if (input.userId) {
    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: { name: true, email: true, resumeUrl: true },
    });
    if (!user || !user.email) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "User not found or missing email" });
    }
    userName = userName || user.name || "";
    userEmail = userEmail || user.email;
    resumeUrl = resumeUrl || user.resumeUrl || undefined;
  }

  // Idempotency: avoid duplicate apps for same job+email
  const existing = await db.jobApplication.findFirst({
    where: { jobId, email: userEmail },
    select: { id: true },
  });
  if (existing) {
    return { success: true, message: "Already applied", applicationId: existing.id };
  }

  let cvData = input.cvData;
  let cvFilename = input.cvFilename || "resume.pdf";

  if (!cvData && resumeUrl) {
    try {
      cvData = await fetchResumeAsBase64(resumeUrl);
      try {
        const u = new URL(resumeUrl);
        const last = u.pathname.split("/").pop();
        if (last) cvFilename = last;
      } catch {}
    } catch (e) {
      // Resume fetch failed; continue without attachment
      cvData = undefined;
    }
  }

  const app = await db.jobApplication.create({
    data: {
      jobId,
      jobTitle: job.title,
      name: userName,
      email: userEmail,
      cv: !!cvData, // schema has Boolean 'cv'
    },
  });

  try {
    await inngest.send({
      name: "email/send",
      data: {
        type: "job-application",
        data: {
          applicationEmail: job.applicationEmail,
          jobTitle: job.title,
          companyName: job.companyName || "Company",
          applicantName: userName,
          applicantEmail: userEmail,
          cvData,
          cvFilename,
        },
      },
    });
  } catch (e) {
    console.error("Failed to send application email:", e);
  }

  return { success: true, message: "Application submitted", applicationId: app.id };
}
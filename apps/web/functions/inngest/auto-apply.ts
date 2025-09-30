import { inngest } from "./client";
import { prisma } from "@workspace/db";
import { applyAndNotify } from "@/server/services/job-application";

async function getCandidates() {
  return prisma.user.findMany({
    where: { resumeUrl: { not: null } },
    select: { id: true },
  });
}

export const autoApplyOnJobCreated = inngest.createFunction(
  { id: "auto-apply-on-job-created" },
  { event: "job/created" },
  async ({ event }) => {
    const job = await prisma.job.findUnique({
      where: { id: event.data.jobId },
      select: { id: true },
    });
    if (!job) return { success: false };

    const users = await getCandidates();
    for (const u of users) {
      await applyAndNotify({ db: prisma, jobId: job.id, userId: u.id });
    }
    return { success: true, applied: users.length };
  }
);

export const autoApplyOnJobsImported = inngest.createFunction(
  { id: "auto-apply-on-jobs-imported" },
  { event: "jobs/imported" },
  async () => {
    const since = new Date(Date.now() - 15 * 60 * 1000);
    const jobs = await prisma.job.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true },
    });
    const users = await getCandidates();

    for (const job of jobs) {
      for (const u of users) {
        await applyAndNotify({ db: prisma, jobId: job.id, userId: u.id });
      }
    }
    return { success: true, jobs: jobs.length, users: users.length };
  }
);



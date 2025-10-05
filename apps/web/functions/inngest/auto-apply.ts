import { inngest } from "./client";
import { prisma, SubscriptionStatus } from "@workspace/db";
import { applyAndNotify } from "@/server/services/job-application";

async function getCandidates(category: any) {
  return prisma.user.findMany({
    where: {
      resumeUrl: { not: null },
      autoApplyEnabled: true,
      autoApplyCategory: category,
      subscription: {
        is: {
          status: SubscriptionStatus.ACTIVE,
          planId: {
            in: [
              "9e3b09e3-88c8-4ca6-a2a8-78b501fc8a28", // Basic
              "ee62299a-4591-4cec-a7a9-41d04c4aa70b", // Premium
            ],
          },
        },
      },
    },
    select: {
      id: true,
      autoApplyKeywords: true,
    },
  });
}

function tokenize(text: string) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9+.#]/i)
      .filter(Boolean)
  );
}

const MIN_MATCHES = 2;

export const autoApplyOnJobCreated = inngest.createFunction(
  { id: "auto-apply-on-job-created" },
  { event: "job/created" },
  async ({ event }) => {
    const job = await prisma.job.findUnique({
      where: { id: event.data.jobId },
      select: {
        id: true,
        category: true,
        title: true,
        description: true,
        tags: true,
      },
    });
    if (!job) return { success: false };

    const users = await getCandidates(job.category);

    // Build tokens from both tags and title+description
    const textTokens = tokenize(`${job.title ?? ""} ${job.description ?? ""}`);
    const tagTokens = new Set((job.tags ?? []).map((t) => t.toLowerCase()));
    const jobTokens = new Set<string>([...tagTokens, ...textTokens]);

    let applied = 0;
    for (const u of users) {
      const matches = (u.autoApplyKeywords || []).reduce(
        (acc, kw) => acc + (jobTokens.has(kw.toLowerCase()) ? 1 : 0),
        0
      );
      if (matches >= MIN_MATCHES) {
        await applyAndNotify({ db: prisma, jobId: job.id, userId: u.id });
        applied++;
      }
    }
    return { success: true, applied };
  }
);

export const autoApplyOnJobsImported = inngest.createFunction(
  { id: "auto-apply-on-jobs-imported" },
  { event: "jobs/imported" },
  async () => {
    const since = new Date(Date.now() - 15 * 60 * 1000);
    const jobs = await prisma.job.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true,
        category: true,
        title: true,
        description: true,
        tags: true,
      },
    });

    let totalApplied = 0;
    for (const job of jobs) {
      const users = await getCandidates(job.category);

      // Build tokens from both tags and title+description
      const textTokens = tokenize(
        `${job.title ?? ""} ${job.description ?? ""}`
      );
      const tagTokens = new Set((job.tags ?? []).map((t) => t.toLowerCase()));
      const jobTokens = new Set<string>([...tagTokens, ...textTokens]);

      let applied = 0;
      for (const u of users) {
        const matches = (u.autoApplyKeywords || []).reduce(
          (acc, kw) => acc + (jobTokens.has(kw.toLowerCase()) ? 1 : 0),
          0
        );
        if (matches >= MIN_MATCHES) {
          await applyAndNotify({ db: prisma, jobId: job.id, userId: u.id });
          applied++;
        }
      }
      totalApplied += applied;
    }
    return { success: true, jobs: jobs.length, applied: totalApplied };
  }
);

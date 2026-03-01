import { inngest } from "./client";
import { prisma, SubscriptionStatus, Role } from "@workspace/db";
import { PLANS } from "@/lib/plans"
import { applyAndNotify } from "@/server/services/job-application";
import { scoreAutoApplyJob } from "@/lib/auto-apply-ranking";

async function getCandidates(category: any) {
  return (prisma.user.findMany as any)({
    where: {
      resumeUrl: { not: null },
      autoApplyEnabled: true,
      autoApplyCategory: category,
      subscription: {
        is: {
          status: SubscriptionStatus.ACTIVE,
          planId: {
            in: [PLANS.BASIC.id, PLANS.PREMIUM.id], 
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
      autoApplyKeywords: true,
      autoApplyRoles: true,
      resumeEmbedding: true,
      subscription: {
        select: {
          plan: {
            select: {
              monthlyApplyLimit: true,
              autoApplyMonthlyLimit: true,
              autoApplyAccess: true,
            },
          },
        },
      },
    },
  });
}

const MIN_MATCH_PERCENT_WITH_RESUME = Number(process.env.AUTO_APPLY_MIN_MATCH_WITH_RESUME ?? 62);
const MIN_MATCH_PERCENT_NO_RESUME = Number(process.env.AUTO_APPLY_MIN_MATCH_NO_RESUME ?? 52);
const MAX_APPLIES_PER_JOB = Number(process.env.AUTO_APPLY_MAX_APPLIES_PER_JOB ?? 12);

type RankedCandidate = {
  user: any;
  score: ReturnType<typeof scoreUserAgainstJob>;
};

async function canAutoApplyForUser(user: any): Promise<boolean> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const email = user.email;
  const plan = user.subscription?.plan;
  if (!plan?.autoApplyAccess) return false;
  const appsUsed = await prisma.jobApplication.count({
    where: { email, createdAt: { gte: startOfMonth } },
  });
  const autoUsed = await prisma.jobApplication.count({
    where: { email, createdAt: { gte: startOfMonth }, OR: [{ source: "auto" as any }] },
  } as any);
  if (plan.monthlyApplyLimit && appsUsed >= plan.monthlyApplyLimit) return false;
  if (plan.autoApplyMonthlyLimit && autoUsed >= plan.autoApplyMonthlyLimit) return false;
  return true;
}

function scoreUserAgainstJob(job: {
  id: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: Date;
  city?: string | null;
  type?: string | null;
  embedding?: number[];
}, user: {
  autoApplyKeywords?: string[];
  autoApplyRoles?: string[];
  resumeEmbedding?: number[];
}) {
  const scored = scoreAutoApplyJob({
    job: {
      id: job.id,
      title: job.title ?? "",
      description: job.description ?? "",
      tags: job.tags ?? [],
      city: job.city ?? null,
      type: job.type ?? null,
      createdAt: job.createdAt,
      embedding: Array.isArray(job.embedding) ? job.embedding : [],
    },
    keywords: user.autoApplyKeywords ?? [],
    roles: user.autoApplyRoles ?? [],
    resumeEmbedding:
      Array.isArray(user.resumeEmbedding) && user.resumeEmbedding.length > 0
        ? user.resumeEmbedding
        : null,
    maxReasons: 3,
  });

  return {
    ...scored,
    hasResumeEmbedding:
      Array.isArray(user.resumeEmbedding) && user.resumeEmbedding.length > 0,
  };
}

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
        city: true,
        type: true,
        embedding: true,
        createdAt: true,
        user: { select: { role: true } },
      },
    });
    if (!job) return { success: false };
    // Skip auto-apply for jobs owned by admins
    if (job.user?.role === Role.ADMIN) return { success: true, skipped: "admin-owned-job" };

    const users = await getCandidates(job.category);

    const scoredUsers = users
      .map((u: any) => ({
        user: u,
        score: scoreUserAgainstJob(job as any, u),
      })) as RankedCandidate[];
      const filteredAndOrdered = scoredUsers
      .filter(({ score }: RankedCandidate) => {
        const threshold = score.hasResumeEmbedding
          ? MIN_MATCH_PERCENT_WITH_RESUME
          : MIN_MATCH_PERCENT_NO_RESUME;
        return score.matchPercent >= threshold;
      })
      .sort((a: RankedCandidate, b: RankedCandidate) => b.score.finalScore - a.score.finalScore)
      .slice(0, Math.max(1, MAX_APPLIES_PER_JOB));

    let applied = 0;
    for (const candidate of filteredAndOrdered) {
      if (await canAutoApplyForUser(candidate.user)) {
        await applyAndNotify({ db: prisma, jobId: job.id, userId: candidate.user.id, source: "auto" });
        applied += 1;
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
        city: true,
        type: true,
        embedding: true,
        createdAt: true,
        user: { select: { role: true } },
      },
    });

    let totalApplied = 0;
    for (const job of jobs) {
      // Skip auto-apply for admin-owned imports
      if (job.user?.role === Role.ADMIN) {
        continue;
      }
      const users = await getCandidates(job.category);

      const scoredUsers = users
        .map((u: any) => ({
          user: u,
          score: scoreUserAgainstJob(job as any, u),
        })) as RankedCandidate[];
      const filteredAndOrdered = scoredUsers
        .filter(({ score }: RankedCandidate) => {
          const threshold = score.hasResumeEmbedding
            ? MIN_MATCH_PERCENT_WITH_RESUME
            : MIN_MATCH_PERCENT_NO_RESUME;
          return score.matchPercent >= threshold;
        })
        .sort((a: RankedCandidate, b: RankedCandidate) => b.score.finalScore - a.score.finalScore)
        .slice(0, Math.max(1, MAX_APPLIES_PER_JOB));

      let applied = 0;
      for (const candidate of filteredAndOrdered) {
        if (await canAutoApplyForUser(candidate.user)) {
          await applyAndNotify({ db: prisma, jobId: job.id, userId: candidate.user.id, source: "auto" });
          applied += 1;
        }
      }
      totalApplied += applied;
    }
    return { success: true, jobs: jobs.length, applied: totalApplied };
  }
);

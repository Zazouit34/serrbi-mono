import type { MetadataRoute } from "next";
import { prisma } from "@workspace/db";
import { slugify } from "@/lib/slugify";

// Regenerate sitemap periodically so new published jobs are included without redeploy
export const revalidate = 300; // seconds

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const primary = process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || "serrbi.ma";
  const base = `https://${primary}`;
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/jobs`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/services`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/tasks`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/subscription`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Recent published jobs
  const jobs = await prisma.job.findMany({
    where: { status: "published" },
    select: { id: true, title: true, updatedAt: true, createdAt: true },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });

  const jobEntries: MetadataRoute.Sitemap = jobs.map((j) => ({
    url: `${base}/jobs/apply/${slugify(j.title)}/${j.id}`,
    lastModified: j.updatedAt ?? j.createdAt ?? now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticEntries, ...jobEntries];
}



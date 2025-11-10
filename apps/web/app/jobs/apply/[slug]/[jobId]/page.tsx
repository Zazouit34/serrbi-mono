// apps/web/app/jobs/apply/[slug]/[jobId]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@workspace/db";
import ApplyJobClientPage from "./client";

export default async function ApplyJobPage({
  params,
}: {
  params: { jobId: string; slug: string };
}) {
  const job = await prisma.job.findUnique({
    where: { id: params.jobId },
    select: { id: true, status: true },
  });
  if (!job || job.status !== "published") {
    notFound();
  }
  return <ApplyJobClientPage />;
}

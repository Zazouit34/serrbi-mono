"use client";
import { useParams } from "next/navigation";
import { trpc } from "@/app/_trpc/client";
import { Container } from "@workspace/ui/components/container";
import { MarkdownRendererClient } from "@/components/ui/form/markdown-render.client";
import { JobApplyForm } from "@/components/ui/form/job/job-apply-form";
import {
  formatJobType,
  formatLocationRequirement,
} from "@workspace/ui/lib/formatter";
import { JobListingInfo } from "@/components/ui/form/job/job-listing-info";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ClockIcon } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";

export default function ApplyJobClientPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: job, isLoading } = trpc.job.getById.useQuery({ id: jobId });

  const daysAgo = job?.createdAt
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(job.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  if (isLoading)
    return (
      <Container className="py-8">
        <div className="space-y-6">
          <Skeleton className="w-3/4 h-8" />
          <div className="space-y-2">
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-5/6 h-4" />
            <Skeleton className="w-4/5 h-4" />
          </div>
          <div className="space-y-6 max-w-xl">
            <div className="space-y-2">
              <Skeleton className="w-12 h-4" />
              <Skeleton className="w-full h-10" />
            </div>
            <div className="space-y-2">
              <Skeleton className="w-16 h-4" />
              <Skeleton className="w-full h-10" />
            </div>
            <div className="space-y-2">
              <Skeleton className="w-40 h-4" />
              <div className="p-8 rounded-lg border border-dashed">
                <div className="flex flex-col justify-center items-center space-y-2">
                  <Skeleton className="w-10 h-10 rounded" />
                  <Skeleton className="w-48 h-4" />
                  <Skeleton className="w-40 h-3" />
                </div>
              </div>
            </div>
            <Skeleton className="w-20 h-10" />
          </div>
        </div>
      </Container>
    );

  if (!job) return null;

  return (
    <Container>
      <JobApplyForm jobId={job.id} jobTitle={job.title} applicationUrl={job.applicationUrl} />
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-start">
          <div className="flex items-center gap-3">
            <Avatar className="bg-gray-100 rounded-2xl shadow-sm size-16">
              <AvatarImage
                src={job.companyImage || undefined}
                alt={job.companyName ?? "Company"}
              />
              <AvatarFallback className="bg-gray-200 text-gray-600 font-semibold">
                {(job.companyName?.slice(0, 2) || "CO").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold">{job.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs text-foreground/80">
              {formatLocationRequirement(job.locationRequirement as any)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-0.5 text-xs text-foreground/80">
              {formatJobType(job.type as any)}
            </span>
          </div>
        </div>
        <div className="flex gap-2 items-center text-sm text-foreground/80">
          <span className="font-medium">
            {job.companyName ?? "Unknown Company"}
          </span>
          <span className="flex gap-1 items-center text-foreground/60">
            <ClockIcon className="size-3" />
            {daysAgo !== null
              ? daysAgo === 0
                ? "Today"
                : `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`
              : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 justify-between w-full">
          <JobListingInfo
            city={job.city}
            stateAbbreviation={job.stateAbbreviation}
            experienceLevel={job.experienceLevel}
          />
        </div>
        {job.description && (
          <div className="leading-snug prose-sm text-foreground/80">
            <MarkdownRendererClient source={job.description} />
          </div>
        )}
      </div>
    </Container>
  );
}


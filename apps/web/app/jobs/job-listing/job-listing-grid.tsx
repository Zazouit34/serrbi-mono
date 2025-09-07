"use client"

import { trpc } from "@/app/_trpc/client"
import { JobCard } from "@/components/ui/form/job/job-card"
import { Skeleton } from "@workspace/ui/components/skeleton"

type JobListingGridProps = {
  filters: Record<string, string>
}

export function JobListingGrid({ filters }: JobListingGridProps) {
  const queryInput = {
    ...filters,
    page: 1,
    pageSize: 10,
  }

  const { data, isLoading } = trpc.job.getJob.useQuery(queryInput)
  const jobs = data?.items ?? []

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border">
            <Skeleton className="w-3/4 h-6" />
            <Skeleton className="mt-2 w-16 h-5" />
            <Skeleton className="mt-4 w-24 h-4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {jobs.length === 0 ? (
        <p>No jobs found</p>
      ) : (
        jobs.map((j) => <JobCard key={j.id} job={j as any} />)
      )}
    </div>
  )
}

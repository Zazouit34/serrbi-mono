"use client"

import { useEffect, useMemo, useState } from "react"
import { trpc } from "@/app/_trpc/client"
import { JobCard } from "@/components/ui/form/job/job-card"
import { useTranslations } from "next-intl"
import { Skeleton } from "@workspace/ui/components/skeleton"

type JobListingGridProps = {
  filters: Record<string, string>
}

export function JobListingGrid({ filters }: JobListingGridProps) {
  const t = useTranslations("JobGrid")
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)

  // Reset when filters change
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters])
  useEffect(() => {
    setPage(1)
    setItems([])
    setTotal(0)
  }, [filtersKey])

  const queryInput = {
    ...filters,
    page,
    pageSize: 12,
  }

  const { data, isLoading, isFetching } = trpc.job.getJob.useQuery(queryInput, {
    placeholderData: (prev) => prev,
  })
  
  // Append page results safely
  useEffect(() => {
    if (!data || data.page !== page) return
    setTotal(data.total)
    setItems((prev) =>
      page === 1
        ? data.items
        : [...prev, ...data.items.filter((n) => !prev.some((p) => p.id === n.id))]
    )
  }, [data, page])

  const hasMore = items.length < total
  const loadingMore = isFetching && items.length > 0

  if (isLoading && items.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {items.length === 0 ? (
          <p>{t("noJobs")}</p>
        ) : (
          items.map((j) => <JobCard key={j.id} job={j as any} />)
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button
            className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setPage((p) => p + 1)}
            disabled={loadingMore}
          >
            {loadingMore ? t("loading") : t("loadMore")}
          </button>
        </div>
      )}
    </div>
  )
}
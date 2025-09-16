"use client"

import { trpc } from "@/app/_trpc/client"
import { ServiceCard } from "@/components/ui/form/service/service-card"
import { Skeleton } from "@workspace/ui/components/skeleton"

type ServiceListingGridProps = {
  filters: Record<string, string>
}

export function ServiceListingGrid({ filters }: ServiceListingGridProps) {
  const queryInput = {
    ...filters,
    page: 1,
    pageSize: 10,
  }

  const { data, isLoading } = trpc.service.getService.useQuery(queryInput)
  const services = data?.items ?? []

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
      {services.length === 0 ? (
        <p>No services found</p>
      ) : (
        services.map((s: any) => <ServiceCard key={s.id} service={s} />)
      )}
    </div>
  )
}

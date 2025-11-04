"use client"

import { useEffect, useMemo, useState } from "react"
import { trpc } from "@/app/_trpc/client"
import { ServiceCard } from "@/components/ui/form/service/service-card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@workspace/ui/components/pagination"

type ServiceListingGridProps = {
  filters: Record<string, string>
}

export function ServiceListingGrid({ filters }: ServiceListingGridProps) {
  const [page, setPage] = useState(1)

  // Reset when filters change
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters])
  useEffect(() => {
    setPage(1)
  }, [filtersKey])

  const queryInput = {
    ...filters,
    page,
    pageSize: 12,
  }

  const { data, isLoading, isFetching } = trpc.service.getService.useQuery(queryInput, {
    placeholderData: (prev) => prev,
  })

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0

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

  const renderPaginationItems = () => {
    const items = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault()
                setPage(i)
              }}
              isActive={page === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }
    } else {
      // Show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault()
              setPage(1)
            }}
            isActive={page === 1}
          >
            1
          </PaginationLink>
        </PaginationItem>
      )

      // Show ellipsis if needed
      if (page > 3) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        )
      }

      // Show pages around current page - ensure at least 5 pages are visible
      let start = Math.max(2, page - 2)
      let end = Math.min(totalPages - 1, page + 2)
      
      // Adjust to show at least 5 pages total (including first and last)
      const middlePages = end - start + 1
      const totalVisible = middlePages + 2 // +2 for first and last page
      
      if (totalVisible < 5 && totalPages >= 5) {
        if (page <= 3) {
          // If we're near the beginning, extend the end
          end = Math.min(totalPages - 1, 4)
        } else if (page >= totalPages - 2) {
          // If we're near the end, extend the start
          start = Math.max(2, totalPages - 3)
        }
      }
      
      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault()
                setPage(i)
              }}
              isActive={page === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }

      // Show ellipsis if needed
      if (page < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        )
      }

      // Show last page
      if (totalPages > 1) {
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault()
                setPage(totalPages)
              }}
              isActive={page === totalPages}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )
      }
    }

    return items
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {!data || data.items.length === 0 ? (
          <p>No services found</p>
        ) : (
          data.items.map((s: any) => <ServiceCard key={s.id} service={s} />)
        )}
      </div>

      {data && totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page > 1) setPage(page - 1)
                }}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            
            {renderPaginationItems()}
            
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page < totalPages) setPage(page + 1)
                }}
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
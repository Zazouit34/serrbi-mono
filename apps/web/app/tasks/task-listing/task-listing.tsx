"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { FilterBar } from "@/components/ui/filter-bar"
import { taskFiltersConfig } from "@/components/ui/config/task-filter-config"
import { TaskListingGrid } from "./task-listing-grid"

export function TaskListing() {
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<Record<string, string>>({})

  // Initialize filters from URL parameters - focus on search
  useEffect(() => {
    const urlFilters: Record<string, string> = {}
    
    // Primary: Get search parameter for task titles
    const search = searchParams.get('search')
    if (search) urlFilters.search = search
    
    setFilters(urlFilters)
  }, [searchParams])

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <FilterBar
        filtersConfig={taskFiltersConfig}
        onFilterChange={(values) => setFilters(values)}
        createConfig={{ label: "Create a Task Listing", href: "/tasks/task-listing/new" }}
        initialFilters={filters}
      />

      {/* Tasks grid */}
      <TaskListingGrid filters={filters} />
    </div>
  )
}

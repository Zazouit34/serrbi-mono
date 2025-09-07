"use client"

import { useState } from "react"
import { FilterBar } from "@/components/ui/filter-bar"
import { taskFiltersConfig } from "@/components/ui/config/task-filter-config"
import { TaskListingGrid } from "./task-listing-grid"

export function TaskListing() {
  const [filters, setFilters] = useState<Record<string, string>>({})

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <FilterBar
        filtersConfig={taskFiltersConfig}
        onFilterChange={(values) => setFilters(values)}
        createConfig={{ label: "Create a Task Listing", href: "/tasks/task-listing/new" }}
      />

      {/* Services grid */}
      <TaskListingGrid filters={filters} />
    </div>
  )
}

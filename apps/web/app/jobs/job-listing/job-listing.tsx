"use client"

import { useState } from "react"
import { FilterBar } from "@/components/ui/filter-bar"
import { jobFiltersConfig } from "@/components/ui/config/job-filters-config"
import { JobListingGrid } from "./job-listing-grid"

export function JobListing() {
  const [filters, setFilters] = useState<Record<string, string>>({})

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <FilterBar
        filtersConfig={jobFiltersConfig}
        onFilterChange={(values) => setFilters(values)}
        createConfig={{ label: "Create Job Listing", href: "/jobs/job-listing/new" }}
      />

      {/* Jobs grid */}
      <JobListingGrid filters={filters} />
    </div>
  )
}

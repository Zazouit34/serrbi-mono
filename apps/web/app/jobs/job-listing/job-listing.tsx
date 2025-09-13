"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { FilterBar } from "@/components/ui/filter-bar"
import { jobFiltersConfig } from "@/components/ui/config/job-filters-config"
import { JobListingGrid } from "./job-listing-grid"

export function JobListing() {
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<Record<string, string>>({})

  // Initialize filters from URL parameters - focus on search
  useEffect(() => {
    const urlFilters: Record<string, string> = {}
    
    // Primary: Get search parameter for job titles
    const search = searchParams.get('search')
    if (search) urlFilters.search = search
    
    setFilters(urlFilters)
  }, [searchParams])

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <FilterBar
        filtersConfig={jobFiltersConfig}
        onFilterChange={(values) => setFilters(values)}
        createConfig={{ label: "Create Job Listing", href: "/jobs/job-listing/new" }}
        initialFilters={filters}
      />

      {/* Jobs grid */}
      <JobListingGrid filters={filters} />
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { FilterBar } from "@/components/ui/filter-bar"
import { serviceFiltersConfig } from "@/components/ui/config/service-filters-config"
import { ServiceListingGrid } from "./service-listing-grid"

export function ServiceListing() {
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<Record<string, string>>({})

  // Initialize filters from URL parameters - focus on search
  useEffect(() => {
    const urlFilters: Record<string, string> = {}
    
    // Primary: Get search parameter for service titles
    const search = searchParams.get('search')
    if (search) urlFilters.search = search
    
    setFilters(urlFilters)
  }, [searchParams])

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <FilterBar
        filtersConfig={serviceFiltersConfig}
        onFilterChange={(values) => setFilters(values)}
        initialFilters={filters}
      />

      {/* Services grid */}
      <ServiceListingGrid filters={filters} />
    </div>
  )
}

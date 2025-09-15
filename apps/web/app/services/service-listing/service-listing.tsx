"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { DualSearchBar } from "@/components/ui/dual-search-bar"
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
    <div className="space-y-4 md:space-y-10">
      {/* Dual Search Bar */}
      <DualSearchBar
        onFilterChange={(values) => setFilters(values)}
        initialFilters={filters}
        type="service"
      />

      {/* Services grid */}
      <ServiceListingGrid filters={filters} />
    </div>
  )
}

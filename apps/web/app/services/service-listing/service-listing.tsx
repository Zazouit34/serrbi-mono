"use client"

import { useState } from "react"
import { FilterBar } from "@/components/ui/filter-bar"
import { serviceFiltersConfig } from "@/components/ui/config/service-filters-config"
import { ServiceListingGrid } from "./service-listing-grid"

export function ServiceListing() {
  const [filters, setFilters] = useState<Record<string, string>>({})

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <FilterBar
        filtersConfig={serviceFiltersConfig}
        onFilterChange={(values) => setFilters(values)}
        createConfig={{ label: "Create a Service Listing", href: "/services/service-listing/new" }}
      />

      {/* Services grid */}
      <ServiceListingGrid filters={filters} />
    </div>
  )
}

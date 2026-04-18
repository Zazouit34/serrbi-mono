"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/ui/filter-bar";
import { getJobFiltersConfig } from "@/components/ui/config/job-filters-config";
import { JobListingGrid } from "./job-listing-grid";

export function JobListing() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Initialize filters from URL parameters - focus on search
  useEffect(() => {
    const urlFilters: Record<string, string> = {};

    // Primary: Get search parameter for job titles
    const search = searchParams.get("search");
    if (search) urlFilters.search = search;

    // Prefilter by category if provided
    const category = searchParams.get("category");
    if (category) urlFilters.category = category;

    setFilters(urlFilters);
  }, [searchParams]);

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Filters bar */}

      <FilterBar
        filtersConfig={getJobFiltersConfig()}
        onFilterChange={(values) => setFilters(values)}
        initialFilters={filters}
      />

      {/* Jobs grid */}
      <JobListingGrid filters={filters} />
    </div>
  );
}

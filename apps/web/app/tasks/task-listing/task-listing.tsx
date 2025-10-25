"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { DualSearchBar } from "@/components/ui/dual-search-bar";
import { TaskListingGrid } from "./task-listing-grid";

export function TaskListing() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Initialize filters from URL parameters - focus on search
  useEffect(() => {
    const urlFilters: Record<string, string> = {};

    // Primary: Get search parameter for task titles
    const search = searchParams.get("search");
    if (search) urlFilters.search = search;

    // Prefilter by task category if provided
    const category = searchParams.get("category");
    if (category) urlFilters.category = category;

    setFilters(urlFilters);
  }, [searchParams]);

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Filters bar */}
      <DualSearchBar
        onFilterChange={(values) => setFilters(values)}
        initialFilters={filters}
        type="task"
      />

      {/* Tasks grid */}
      <TaskListingGrid filters={filters} />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export type FilterOption = {
  label: string;
  value: string;
};

export type FilterConfig =
  | {
      key: string;
      label: string;
      type: "select";
      options: FilterOption[];
    }
  | {
      key: string;
      label: string;
      type: "input";
      placeholder?: string;
    };

type CreateConfig = {
  label: string;
  href: string;
};

type FilterBarProps = {
  filtersConfig: FilterConfig[];
  onFilterChange: (filters: Record<string, string>) => void;
  createConfig?: CreateConfig;
  initialFilters?: Record<string, string>;
};

export function FilterBar({
  filtersConfig,
  onFilterChange,
  createConfig,
  initialFilters = {},
}: FilterBarProps) {
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  // Update internal filters when initialFilters change
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  return (
    <div className="space-y-4">
      {/* Top search + controls */}
      <div className="flex flex-col gap-2 w-full sm:flex-row">
        {/* Search always on top, full width */}
        <Input
          placeholder="Search..."
          value={filters["search"] || ""}
          onChange={(e) => handleFilterChange("search", e.target.value)}
          className="w-full sm:flex-1"
        />

        {/* Controls stack under on mobile, inline on larger screens */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
          {createConfig && (
            <Link href={createConfig.href}>
              <Button>{createConfig.label}</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Dynamic filters */}
      {showFilters && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 justify-start">
            {filtersConfig.map((filter) => (
              <div key={filter.key} className="min-w-[150px]">
                {filter.type === "select" && (
                  <Select
                    value={filters[filter.key] || ""}
                    onValueChange={(val) => handleFilterChange(filter.key, val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={filter.label} />
                    </SelectTrigger>
                    <SelectContent>
                      {filter.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>

          {/* Reset Filters button - only shown when filters are visible */}
          <div className="flex justify-start">
            <Button variant="ghost" onClick={resetFilters} size="sm">
              Reset Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Search, X, Filter } from "lucide-react";
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


type FilterBarProps = {
  filtersConfig: FilterConfig[];
  onFilterChange: (filters: Record<string, string>) => void;
  initialFilters?: Record<string, string>;
};

export function FilterBar({
  filtersConfig,
  onFilterChange,
  initialFilters = {},
}: FilterBarProps) {
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || "");
  const [showFilters, setShowFilters] = useState(false);

  // Update internal filters when initialFilters change
  useEffect(() => {
    setFilters(initialFilters);
    setSearchQuery(initialFilters.search || "");
  }, [initialFilters]);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSearch = () => {
    const newFilters = { ...filters, search: searchQuery };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    setFilters({});
    setSearchQuery("");
    onFilterChange({});
  };

  return (
    <div className="space-y-4">
      {/* Top search + controls */}
      <div className="flex flex-col gap-2 w-full sm:flex-row">
        {/* Search Input - Hero style */}
        <div className="flex flex-col gap-3 w-full max-w-2xl sm:flex-row sm:gap-0 sm:relative sm:flex-1">
          <div className="relative flex-1">
            <Input
              placeholder="Search by role, skills, or keywords.."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-8 pr-4 sm:pr-24 h-16 text-base border-gray-200 focus:border-[#FF040E] focus:ring-[#FF040E] rounded-full"
            />
          </div>

          {/* Search Button - Below on mobile, inside on desktop */}
          <Button
            onClick={handleSearch}
            className="self-start p-4 w-14 h-14 text-white bg-[#FF040E] rounded-full hover:bg-[#FF040E]/80 focus:ring-black sm:absolute sm:right-1 sm:top-1/2 sm:transform sm:-translate-y-1/2"
          >
            <Search className="text-white size-5" />
          </Button>
        </div>

        {/* Controls stack under on mobile, inline on larger screens */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            className="p-4 size-14 rounded-full bg-[#FF040E] hover:bg-[#FF040E]/80"
          >
            {showFilters ? <X className="size-5" /> : <Filter className="size-5" />}
          </Button>
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

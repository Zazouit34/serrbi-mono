"use client";

import { useState, useEffect } from "react";
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
  const [filters, setFilters] =
    useState<Record<string, string>>(initialFilters);
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
      {/* Top search + controls - Centered on large screens */}
      <div className="flex gap-2 items-center w-full sm:flex-row sm:justify-center sm:gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-2xl">
          <Input
            placeholder="Search roles, skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="pl-6 pr-10 h-10 text-sm border-gray-200 focus:!border-none focus:!ring-1 focus:!ring-gray-200 rounded-full w-full sm:h-16 sm:text-base sm:pl-8 sm:pr-20"
          />

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-2 w-8 h-8 text-white bg-[#FF040E] rounded-full hover:bg-[#FF040E]/80 focus:ring-black sm:w-14 sm:h-14 sm:p-4"
          >
            <Search className="w-3 h-3 text-white sm:w-5 sm:h-5" />
          </Button>
        </div>

        {/* Filter Button */}
        <Button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 size-8 rounded-full bg-[#FF040E] hover:bg-[#FF040E]/80 flex items-center justify-center flex-shrink-0 sm:w-14 sm:h-14 sm:p-4"
        >
          {showFilters ? (
            <X className="w-3 h-3 sm:w-5 sm:h-5" />
          ) : (
            <Filter className="w-3 h-3 sm:w-5 sm:h-5" />
          )}
        </Button>
      </div>

      {/* Dynamic filters - Also centered */}
      {showFilters && (
        <div className="flex flex-col items-center space-y-3">
          <div className="flex flex-wrap gap-2 justify-center max-w-4xl">
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

          {/* Reset Filters button - centered */}
          <div className="flex justify-center">
            <Button variant="ghost" onClick={resetFilters} size="sm">
              Reset Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

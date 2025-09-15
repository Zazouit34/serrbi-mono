"use client";

import { useState, useEffect } from "react";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Search,  Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@workspace/ui/components/dialog";

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
  const [tempFilters, setTempFilters] = useState<Record<string, string>>(initialFilters);
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || "");
  const [showFiltersDialog, setShowFiltersDialog] = useState(false);

  // Update internal filters when initialFilters change
  useEffect(() => {
    setFilters(initialFilters);
    setTempFilters(initialFilters);
    setSearchQuery(initialFilters.search || "");
  }, [initialFilters]);

  const handleSearch = () => {
    const newFilters = { ...filters, search: searchQuery };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleTempFilterChange = (key: string, value: string) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const newFilters = { ...tempFilters, search: searchQuery };
    setFilters(newFilters);
    onFilterChange(newFilters);
    setShowFiltersDialog(false);
  };

  const resetFilters = () => {
    const resetFilters = { search: searchQuery };
    setTempFilters(resetFilters);
    setFilters(resetFilters);
    setSearchQuery("");
    onFilterChange({});
    setShowFiltersDialog(false);
  };

  const hasActiveFilters = Object.keys(filters).some(key => key !== 'search' && filters[key]);

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
            className="pl-6 pr-10 h-13 text-sm border-gray-200 focus:!border-none focus:!ring-1 focus:!ring-gray-200 rounded-full w-full sm:h-16 sm:text-base sm:pl-8 sm:pr-20"
          />

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-2 size-10 text-white bg-[#FF040E] rounded-full hover:bg-[#FF040E]/80 focus:ring-black sm:w-14 sm:h-14 sm:p-4"
          >
            <Search className="w-3 h-3 text-white sm:w-5 sm:h-5" />
          </Button>
        </div>

        {/* Filter Dialog Button */}
        <Dialog open={showFiltersDialog} onOpenChange={setShowFiltersDialog}>
          <DialogTrigger asChild>
            <Button
              className={`p-2 size-10 rounded-full flex items-center justify-center flex-shrink-0 sm:w-14 sm:h-14 sm:p-4 ${
                hasActiveFilters 
                  ? 'bg-[#FF040E] hover:bg-[#FF040E]/80' 
                  : 'bg-[#FF040E] hover:bg-[#FF040E]/80'
              }`}
            >
              <Filter className="w-3 h-3 sm:w-5 sm:h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Filter Options</DialogTitle>
            </DialogHeader>
            
            {/* Filters Grid */}
            <div className="py-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtersConfig.map((filter) => (
                  <div key={filter.key} className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      {filter.label}
                    </label>
                    {filter.type === "select" && (
                      <Select
                        value={tempFilters[filter.key] || ""}
                        onValueChange={(val) => handleTempFilterChange(filter.key, val)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={`Select ${filter.label}`} />
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
                    {filter.type === "input" && (
                      <Input
                        placeholder={filter.placeholder || filter.label}
                        value={tempFilters[filter.key] || ""}
                        onChange={(e) => handleTempFilterChange(filter.key, e.target.value)}
                        className="w-full"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="flex flex-row gap-2 justify-between">
              {/* Reset Filters button */}
              <Button variant="ghost" onClick={resetFilters} size="sm">
                Reset Filters
              </Button>
              
              {/* Apply Filters button */}
              <Button onClick={applyFilters} className="bg-[#FF040E] hover:bg-[#FF040E]/80">
                Apply Filters
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

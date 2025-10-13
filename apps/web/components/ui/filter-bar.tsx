"use client";

import { useState, useEffect } from "react";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Search, Filter, Check } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { useTranslations } from "next-intl";

export type FilterOption = {
  label: string;
  value: string;
  icon?: React.ComponentType<any>;
  labelKey?: string;
};

export type FilterConfig =
  | {
      key: string;
      label: string;
      labelKey?: string;
      type: "select";
      options: FilterOption[];
    }
  | {
      key: string;
      label: string;
      labelKey?: string;
      type: "input";
      placeholder?: string;
      placeholderKey?: string;
    }
  | {
      key: string;
      label: string;
      labelKey?: string;
      type: "popover";
      options: FilterOption[];
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
  const t = useTranslations();
  const [filters, setFilters] =
    useState<Record<string, string>>(initialFilters);
  const [tempFilters, setTempFilters] =
    useState<Record<string, string>>(initialFilters);
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || "");
  const [showFiltersDialog, setShowFiltersDialog] = useState(false);
  const [dialogPopoverStates, setDialogPopoverStates] = useState<
    Record<string, boolean>
  >({});

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
    setTempFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleDialogPopoverFilterChange = (key: string, value: string) => {
    setTempFilters((prev) => ({ ...prev, [key]: value }));
    setDialogPopoverStates((prev) => ({ ...prev, [key]: false }));
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

  const hasActiveFilters = Object.keys(filters).some(
    (key) => key !== "search" && filters[key]
  );

  return (
    <div className="space-y-4">
      {/* Top search + controls - Centered on large screens */}
      <div
        className="flex gap-2 items-center w-full sm:flex-row sm:justify-center sm:gap-4"
        dir="ltr"
      >
        {/* Search Input */}
        <div className="relative flex-1 max-w-2xl">
          <Input
            placeholder={t("FilterBar.searchPlaceholder")}
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
                  ? "bg-[#FF040E] hover:bg-[#FF040E]/80"
                  : "bg-[#FF040E] hover:bg-[#FF040E]/80"
              }`}
            >
              <Filter className="w-3 h-3 sm:w-5 sm:h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("FilterBar.filterOptions")}</DialogTitle>
            </DialogHeader>

            {/* Filters Grid */}
            <div className="py-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtersConfig.map((filter) => (
                  <div key={filter.key} className="space-y-2">
                    {(() => {
                      const displayLabel = filter.labelKey
                        ? t(filter.labelKey)
                        : filter.label;
                      return (
                        <label className="text-sm font-medium text-gray-700">
                          {displayLabel}
                        </label>
                      );
                    })()}

                    {filter.type === "select" && (
                      <Select
                        value={tempFilters[filter.key] || ""}
                        onValueChange={(val) =>
                          handleTempFilterChange(filter.key, val)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t("FilterBar.selectPrefix", {
                              label: filter.labelKey
                                ? t(filter.labelKey)
                                : filter.label,
                            })}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {filter.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.labelKey ? t(option.labelKey) : option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {filter.type === "input" && (
                      <Input
                        placeholder={
                          filter.placeholderKey
                            ? t(filter.placeholderKey)
                            : filter.placeholder || filter.label
                        }
                        value={tempFilters[filter.key] || ""}
                        onChange={(e) =>
                          handleTempFilterChange(filter.key, e.target.value)
                        }
                        className="w-full"
                      />
                    )}

                    {filter.type === "popover" && (
                      <Popover
                        open={dialogPopoverStates[filter.key] || false}
                        onOpenChange={(open) =>
                          setDialogPopoverStates((prev) => ({
                            ...prev,
                            [filter.key]: open,
                          }))
                        }
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                          >
                            {tempFilters[filter.key] ? (
                              (() => {
                                const selectedOption = filter.options.find(
                                  (opt) => opt.value === tempFilters[filter.key]
                                );
                                const IconComponent = selectedOption?.icon;
                                return (
                                  <div className="flex gap-2 items-center">
                                    {IconComponent && (
                                      <IconComponent className="w-4 h-4 text-red-600" />
                                    )}
                                    <span className="font-medium text-red-700">
                                      {selectedOption?.label}
                                    </span>
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="text-gray-500">
                                {t("FilterBar.selectPrefix", {
                                  label: filter.labelKey
                                    ? t(filter.labelKey)
                                    : filter.label,
                                })}
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-4 w-80" align="start">
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-gray-900">
                              {filter.labelKey
                                ? t(filter.labelKey)
                                : filter.label}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {filter.options.map((option) => {
                                const IconComponent = option.icon;
                                const isSelected =
                                  tempFilters[filter.key] === option.value;
                                return (
                                  <Button
                                    key={option.value}
                                    variant="outline"
                                    size="sm"
                                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                                      isSelected
                                        ? "border-gray-400 bg-gray-100 text-gray-900"
                                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                                    }`}
                                    onClick={() =>
                                      handleDialogPopoverFilterChange(
                                        filter.key,
                                        option.value
                                      )
                                    }
                                  >
                                    {IconComponent && (
                                      <IconComponent
                                        className={`w-3 h-3 ${isSelected ? "text-red-600" : "text-gray-500"}`}
                                      />
                                    )}
                                    <span>{option.labelKey ? t(option.labelKey) : option.label}</span>
                                    {isSelected && (
                                      <Check className="w-3 h-3 text-black" />
                                    )}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="flex flex-row gap-2 justify-between">
              {/* Reset Filters button */}
              <Button variant="ghost" onClick={resetFilters} size="sm">
                {t("FilterBar.reset")}
              </Button>

              {/* Apply Filters button */}
              <Button
                onClick={applyFilters}
                className="bg-[#FF040E] hover:bg-[#FF040E]/80"
              >
                {t("FilterBar.apply")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

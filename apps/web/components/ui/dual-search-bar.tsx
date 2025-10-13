"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import { Search, X, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { useTranslations } from "next-intl";

type CategoryOption = {
  label: string;
  value: string;
  icon?: React.ComponentType<any>;
};

type DualSearchBarProps = {
  onFilterChange: (filters: Record<string, string>) => void;
  initialFilters?: Record<string, string>;
  type: "service" | "task";
};

export function DualSearchBar({
  onFilterChange,
  initialFilters = {},
  type,
}: DualSearchBarProps) {
  const t = useTranslations("DualSearchBar");
  const [filters, setFilters] =
    useState<Record<string, string>>(initialFilters);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);

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
    const newFilters = { ...filters };
    if (type === "service") {
      delete newFilters.serviceCategory;
      delete newFilters.city;
    } else {
      delete newFilters.category;
      delete newFilters.city;
    }
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSearch = () => {
    onFilterChange(filters);
  };

  // Get category options based on type
  const getCategoryOptions = (): CategoryOption[] => {
    if (type === "service") {
      const {
        serviceCategoryValues,
      } = require("@workspace/ui/lib/service-enum");
      const {
        categoryIcons,
      } = require("@/components/ui/config/service-filters-config");
      return serviceCategoryValues.map((category: any) => ({
        label: category,
        value: category,
        icon: categoryIcons[category as keyof typeof categoryIcons],
      }));
    } else {
      const { taskCategoryValues } = require("@workspace/ui/lib/task-enum");
      const {
        taskCategoryIcons,
      } = require("@/components/ui/config/task-filter-config");
      return taskCategoryValues.map((category: any) => ({
        label: category,
        value: category,
        icon: taskCategoryIcons[category as keyof typeof taskCategoryIcons],
      }));
    }
  };

  // Get location options (same for both)
  const getLocationOptions = () => {
    return [
      { value: "Casablanca", label: "Casablanca" },
      { value: "Rabat", label: "Rabat" },
      { value: "Marrakech", label: "Marrakech" },
      { value: "Fez", label: "Fez" },
      { value: "Tangier", label: "Tangier" },
      { value: "Agadir", label: "Agadir" },
    ];
  };

  const categoryOptions = getCategoryOptions();
  const locationOptions = getLocationOptions();

  const categoryKey = type === "service" ? "serviceCategory" : "category";
  const categoryLabel =
    type === "service" ? t("what") : t("what");

  const getSelectedCategoryData = () => {
    return categoryOptions.find(
      (option) => option.value === filters[categoryKey]
    );
  };

  const getSelectedLocationData = () => {
    return locationOptions.find((option) => option.value === filters.city);
  };

  const selectedCategoryData = getSelectedCategoryData();
  const selectedLocationData = getSelectedLocationData();
  const hasAnySelection = filters[categoryKey] || filters.city;

  return (
    <div className="flex gap-2 items-center w-full sm:flex-row sm:justify-center sm:gap-4">
      {/* Dual Search Container */}
      <div className="relative flex-1 max-w-2xl">
        <div className="flex relative items-center pr-10 pl-6 bg-white rounded-full border border-gray-200 h-13 sm:h-16 sm:pl-8 sm:pr-20">
          <div className="flex flex-1 gap-4 items-center">
            {/* What (Category) Popover */}
            <div className="flex-1">
              <Popover
                open={categoryPopoverOpen}
                onOpenChange={setCategoryPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="justify-start p-0 w-full h-full font-normal text-left border-none hover:bg-transparent"
                  >
                    {filters[categoryKey] ? (
                      <div className="flex gap-2 items-center">
                        {selectedCategoryData?.icon && (
                          <selectedCategoryData.icon className="w-4 h-4 text-black" />
                        )}
                        <span className="font-medium text-black">
                          {selectedCategoryData?.label}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 sm:text-base">
                        {t("what")}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="center"
                  sideOffset={12}
                  className="rounded-3xl p-4 w-[350px] max-w-[90vw] bg-white shadow-lg border border-gray-100 sm:p-6 sm:w-[700px]"
                >
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                    {categoryOptions.map((option) => {
                      const IconComponent = option.icon;
                      const isSelected = filters[categoryKey] === option.value;
                      return (
                        <Button
                          key={option.value}
                          variant="outline"
                          size="sm"
                          className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors border sm:gap-3 sm:px-6 sm:py-3 sm:text-base sm:size-lg ${
                            isSelected
                              ? "border-gray-400 bg-gray-100 text-gray-900"
                              : "border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            handleFilterChange(categoryKey, option.value);
                            setCategoryPopoverOpen(false);
                          }}
                        >
                          {IconComponent && (
                            <IconComponent
                              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                isSelected ? "text-black" : "text-gray-500"
                              }`}
                            />
                          )}
                          {option.label}
                          {isSelected && (
                            <Check className="w-3 h-3 text-black sm:w-4 sm:h-4" />
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Separator */}
            <div className="text-lg font-light text-gray-300">|</div>

            {/* Where (Location) Popover */}
            <div className="flex-1">
              <Popover
                open={locationPopoverOpen}
                onOpenChange={setLocationPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="justify-start p-0 w-full h-full font-normal text-left border-none hover:bg-transparent"
                  >
                    {filters.city ? (
                      <span className="font-medium text-black">
                        {selectedLocationData?.label}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500 sm:text-base">
                        {t("where")}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="center"
                  sideOffset={12}
                  className="rounded-3xl p-4 w-[350px] max-w-[90vw] bg-white shadow-lg border border-gray-100 sm:p-6 sm:w-[700px]"
                >
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                    {locationOptions.map((option) => {
                      const isSelected = filters.city === option.value;
                      return (
                        <Button
                          key={option.value}
                          variant="outline"
                          size="lg"
                          className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors border sm:gap-3 sm:px-6 sm:py-3 sm:text-base sm:size-lg ${
                            isSelected
                              ? "border-gray-400 bg-gray-100 text-gray-900"
                              : "border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            handleFilterChange("city", option.value);
                            setLocationPopoverOpen(false);
                          }}
                        >
                          {option.label}
                          {isSelected && (
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 text-black" />
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Single Clear/Reset button */}
          {hasAnySelection && (
            <Button
              onClick={resetFilters}
              className="absolute right-16 top-1/2 p-1 text-gray-400 bg-transparent rounded-full -translate-y-1/2 sm:right-20 size-6 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="size-3" />
            </Button>
          )}
        </div>

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-2 size-10 text-white bg-[#FF040E] rounded-full hover:bg-[#FF040E]/80 focus:ring-black sm:w-14 sm:h-14 sm:p-4"
        >
          <Search className="w-3 h-3 text-white sm:w-5 sm:h-5" />
        </Button>
      </div>
    </div>
  );
}

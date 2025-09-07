// job-filters-config.ts
import {
  jobCategoryValues,
  experienceLevelValues,
  jobListingTypeValues,
  locationRequirementValues,
} from "@workspace/ui/lib/job-enum";
import {
  formatJobCategory,
  formatExperienceLevel,
  formatJobType,
  formatLocationRequirement,
} from "@workspace/ui/lib/formatter";
import { FilterConfig } from "@/components/ui/filter-bar";

export const jobFiltersConfig: FilterConfig[] = [
  
  {
    key: "locationRequirement", // must match getJob input
    label: "Location",
    type: "select",
    options: locationRequirementValues.map((l) => ({
      label: formatLocationRequirement(l),
      value: l,
    })),
  },
  
  {
    key: "category",
    label: "Category",
    type: "select",
    options: jobCategoryValues.map((c) => ({
      label: formatJobCategory(c),
      value: c,
    })),
  },
  {
    key: "experienceLevel",
    label: "Experience Level",
    type: "select",
    options: experienceLevelValues.map((lvl) => ({
      label: formatExperienceLevel(lvl),
      value: lvl,
    })),
  },
  {
    key: "type",
    label: "Job Type",
    type: "select",
    options: jobListingTypeValues.map((t) => ({
      label: formatJobType(t),
      value: t,
    })),
  },
];

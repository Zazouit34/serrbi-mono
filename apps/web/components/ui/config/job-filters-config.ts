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
import { 
  Laptop, 
  DollarSign, 
  Coffee, 
  Stethoscope, 
  Scale, 
  Hammer, 
  GraduationCap, 
  Phone, 
  Car, 
  Sparkles, 
  MoreHorizontal 
} from "lucide-react";

// Job category icons mapping
export const jobCategoryIcons = {
  "Tech": Laptop,
  "Finance": DollarSign,
  "Hospitality": Coffee,
  "Health": Stethoscope,
  "Legal": Scale,
  "Construction": Hammer,
  "Education": GraduationCap,
  "CallCenter": Phone,
  "Auto": Car,
  "Cleaning": Sparkles,
  "Other": MoreHorizontal,
} as const;

export const jobFiltersConfig: FilterConfig[] = [
  {
    key: "category",
    label: "Category",
    labelKey: "JobsFilters.category",
    type: "popover",
    options: jobCategoryValues.map((c) => ({
      label: formatJobCategory(c),
      labelKey: `Enums.JobCategory.${c}`,
      value: c,
      icon: jobCategoryIcons[c as keyof typeof jobCategoryIcons],
    })),
  },
  {
    key: "locationRequirement", // must match getJob input
    label: "Location",
    labelKey: "JobsFilters.location",
    type: "select",
    options: locationRequirementValues.map((l) => ({
      label: formatLocationRequirement(l),
      labelKey: `Enums.LocationRequirement.${l}`,
      value: l,
    })),
  },
  {
    key: "experienceLevel",
    label: "Experience Level",
    labelKey: "JobsFilters.experienceLevel",
    type: "select",
    options: experienceLevelValues.map((lvl) => ({
      label: formatExperienceLevel(lvl),
      labelKey: `Enums.ExperienceLevel.${lvl}`,
      value: lvl,
    })),
  },
  {
    key: "type",
    label: "Job Type",
    labelKey: "JobsFilters.jobType",
    type: "select",
    options: jobListingTypeValues.map((t) => ({
      label: formatJobType(t),
      labelKey: `Enums.JobType.${t}`,
      value: t,
    })),
  },
];

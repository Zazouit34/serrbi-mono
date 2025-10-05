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
    type: "popover",
    options: jobCategoryValues.map((c) => ({
      label: formatJobCategory(c),
      value: c,
      icon: jobCategoryIcons[c as keyof typeof jobCategoryIcons],
    })),
  },
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

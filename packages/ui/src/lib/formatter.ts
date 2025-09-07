import {
  ExperienceLevel,
  JobListingType,
  LocationRequirement,
  JobCategory,
  JobListingStatus,
  ServiceCategory,
  PriceType,
  TaskCategory,
  TaskStatus,
} from "../../../database/generated/prisma/client.js";
import {
  Briefcase,
  Stethoscope,
  BookOpen,
  Ruler,
  Wrench,
  Zap,
  Hammer,
  Car,
  Calculator,
  Scissors,
  Brush,
  Building,
  Laptop,
  HeartPulse,
  Gavel,
  Utensils,
  Users,
} from "lucide-react";

// ------------------------
// JOB CATEGORY STYLES
// ------------------------
export const jobCategoryStyles: Record<
  JobCategory,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  Tech: {
    label: "Tech",
    color: "bg-blue-100 text-blue-700 border-blue-300",
    icon: Laptop,
  },
  Finance: {
    label: "Finance",
    color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    icon: Calculator,
  },
  Hospitality: {
    label: "Hospitality",
    color: "bg-pink-100 text-pink-700 border-pink-300",
    icon: Utensils,
  },
  Health: {
    label: "Health",
    color: "bg-red-100 text-red-700 border-red-300",
    icon: HeartPulse,
  },
  Legal: {
    label: "Legal",
    color: "bg-purple-100 text-purple-700 border-purple-300",
    icon: Gavel,
  },
  Construction: {
    label: "Construction",
    color: "bg-orange-100 text-orange-700 border-orange-300",
    icon: Building,
  },
  Education: {
    label: "Education",
    color: "bg-indigo-100 text-indigo-700 border-indigo-300",
    icon: BookOpen,
  },
  CallCenter: {
    label: "Call Center",
    color: "bg-cyan-100 text-cyan-700 border-cyan-300",
    icon: Users,
  },
  Auto: {
    label: "Automotive",
    color: "bg-gray-100 text-gray-700 border-gray-300",
    icon: Car,
  },
  Cleaning: {
    label: "Cleaning",
    color: "bg-teal-100 text-teal-700 border-teal-300",
    icon: Brush,
  },
  Other: {
    label: "Other",
    color: "bg-slate-100 text-slate-700 border-slate-300",
    icon: Briefcase,
  },
};

export function formatJobCategory(category: JobCategory) {
  return jobCategoryStyles[category].label; // { label, color, icon }
}
// ------------------------
// SERVICE CATEGORY STYLES
// ------------------------
export const taskCategoryStyles: Record<
  TaskCategory,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  MultiSector: {
    label: "Multi Sector",
    color: "bg-slate-100 text-slate-700 border-slate-300",
    icon: Briefcase,
  },
  Health: {
    label: "Health",
    color: "bg-red-100 text-red-700 border-red-300",
    icon: HeartPulse,
  },
  Cleaning: {
    label: "Cleaning",
    color: "bg-teal-100 text-teal-700 border-teal-300",
    icon: Brush,
  },
  Construction: {
    label: "Construction",
    color: "bg-orange-100 text-orange-700 border-orange-300",
    icon: Building,
  },
  Auto: {
    label: "Auto",
    color: "bg-gray-100 text-gray-700 border-gray-300",
    icon: Car,
  },
  Tech: {
    label: "Tech",
    color: "bg-blue-100 text-blue-700 border-blue-300",
    icon: Laptop,
  },
  Finance: {
    label: "Finance",
    color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    icon: Calculator,
  },
  Hospitality: {
    label: "Hospitality",
    color: "bg-pink-100 text-pink-700 border-pink-300",
    icon: Utensils,
  },
  Legal: {
    label: "Legal",
    color: "bg-purple-100 text-purple-700 border-purple-300",
    icon: Gavel,
  },
  Education: {
    label: "Education",
    color: "bg-indigo-100 text-indigo-700 border-indigo-300",
    icon: BookOpen,
  },
};
export function formatTaskCategory(category: TaskCategory) {
  return taskCategoryStyles[category].label;
}
// ------------------------
// TASK CATEGORY STYLES
// ------------------------
export const serviceCategoryStyles: Record<
  ServiceCategory,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  Lawyer: {
    label: "Lawyer",
    color: "bg-purple-100 text-purple-700 border-purple-300",
    icon: Gavel,
  },
  Doctor: {
    label: "Doctor",
    color: "bg-red-100 text-red-700 border-red-300",
    icon: Stethoscope,
  },
  Education: {
    label: "Education",
    color: "bg-blue-100 text-blue-700 border-blue-300",
    icon: BookOpen,
  },
  Architect: {
    label: "Architect",
    color: "bg-green-100 text-green-700 border-green-300",
    icon: Ruler,
  },
  Plumber: {
    label: "Plumber",
    color: "bg-cyan-100 text-cyan-700 border-cyan-300",
    icon: Wrench,
  },
  Electrician: {
    label: "Electrician",
    color: "bg-yellow-100 text-yellow-700 border-yellow-300",
    icon: Zap,
  },
  Mason: {
    label: "Mason",
    color: "bg-orange-100 text-orange-700 border-orange-300",
    icon: Hammer,
  },
  Mechanic: {
    label: "Mechanic",
    color: "bg-gray-100 text-gray-700 border-gray-300",
    icon: Car,
  },
  Accountant: {
    label: "Accountant",
    color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    icon: Calculator,
  },
  Esthetician: {
    label: "Esthetician",
    color: "bg-pink-100 text-pink-700 border-pink-300",
    icon: Scissors,
  },
  Cleaning: {
    label: "Cleaning",
    color: "bg-teal-100 text-teal-700 border-teal-300",
    icon: Brush,
  },
};
export function formatServiceCategory(category: ServiceCategory) {
  return serviceCategoryStyles[category].label;
}
// Location Requirement
export function formatLocationRequirement(location: LocationRequirement) {
  switch (location) {
    case "in_office":
      return "In Office";
    case "hybrid":
      return "Hybrid";
    case "remote":
      return "Remote";
    default:
      throw new Error(
        `Unknown location requirement: ${location satisfies never}`
      );
  }
}

// Experience Level
export function formatExperienceLevel(level: ExperienceLevel) {
  switch (level) {
    case "junior":
      return "Junior";
    case "mid_level":
      return "Mid Level";
    case "senior":
      return "Senior";
    default:
      throw new Error(`Unknown experience level: ${level satisfies never}`);
  }
}

// Job Type
export function formatJobType(type: JobListingType) {
  switch (type) {
    case "full_time":
      return "Full Time";
    case "part_time":
      return "Part Time";
    case "internship":
      return "Internship";
    default:
      throw new Error(`Unknown job type: ${type satisfies never}`);
  }
}

// Job Status
export function formatJobStatus(status: JobListingStatus) {
  switch (status) {
    case "draft":
      return "Draft";
    case "published":
      return "Published";
    case "delisted":
      return "Delisted";
    case "expired":
      return "Expired";
    default:
      throw new Error(`Unknown job status: ${status satisfies never}`);
  }
}

// Price Type
export function formatPriceType(type: PriceType) {
  switch (type) {
    case "fixed":
      return "Fixed Price";
    case "hourly":
      return "Per Hour";
    case "starting_from":
      return "Starting From";
    default:
      throw new Error(`Unknown price type: ${type satisfies never}`);
  }
}

// Task Status
export function formatTaskStatus(status: TaskStatus) {
  switch (status) {
    case "Active":
      return "Active";
    case "Done":
      return "Done";
    case "Cancelled":
      return "Cancelled";
    default:
      throw new Error(`Unknown task status: ${status satisfies never}`);
  }
}
// Task Status Colors
export function getTaskStatusColor(status: TaskStatus) {
  switch (status) {
    case "Done":
      return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "Cancelled":
      return "bg-red-100 text-red-700 border-red-300";
    case "Active":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}
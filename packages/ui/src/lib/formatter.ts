import {
  ExperienceLevel,
  JobListingType,
  LocationRequirement,
  JobCategory,
  JobListingStatus,
  ServiceCategory,
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
  WashingMachine,
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
    label: "Auto",
    color: "bg-gray-100 text-gray-700 border-gray-300",
    icon: Car,
  },
  Cleaning: {
    label: "Cleaning",
    color: "bg-teal-100 text-teal-700 border-teal-300",
    icon: WashingMachine,
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
// TASK CATEGORY STYLES
// ------------------------
export const taskCategoryStyles: Record<
  TaskCategory,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;

    gradient: string;
  }
> = {
  MultiSector: {
    label: "Multi Sector",
    icon: Briefcase,
    color: "text-gray-700",
    gradient: "linear-gradient(135deg, #374151 0%, #6b7280 100%)",
  },
  Health: {
    label: "Health",
    color: "text-red-700",
    icon: HeartPulse,
    gradient: "linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)",
  },
  Cleaning: {
    label: "Cleaning",
    color: "text-teal-700",
    icon: WashingMachine,
    gradient: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
  },
  Construction: {
    label: "Construction",
    color: "text-orange-700",
    icon: Building,
    gradient: "linear-gradient(135deg, #c2410c 0%, #ea580c 100%)",
  },
  Auto: {
    label: "Auto",
    color: "text-gray-700",
    icon: Car,
    gradient: "linear-gradient(135deg, #374151 0%, #6b7280 100%)",
  },
  Tech: {
    label: "Tech",
    color: "text-blue-700",
    icon: Laptop,
    gradient: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
  },
  Finance: {
    label: "Finance",
    color: "text-emerald-700",
    icon: Calculator,
    gradient: "linear-gradient(135deg, #047857 0%, #059669 100%)",
  },
  Hospitality: {
    label: "Hospitality",
    color: "text-pink-700",
    icon: Utensils,
    gradient: "linear-gradient(135deg, #be185d 0%, #db2777 100%)",
  },
  Legal: {
    label: "Legal",
    color: "text-purple-700",
    icon: Gavel,
    gradient: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
  },
  Education: {
    label: "Education",
    color: "text-indigo-700",
    icon: BookOpen,
    gradient: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
  },
};

export function formatTaskCategory(category: TaskCategory) {
  return taskCategoryStyles[category].label;
}

// 🔹 New helper function to get gradient for a category
export function getTaskCategoryGradient(category: TaskCategory) {
  return taskCategoryStyles[category].gradient;
}
// ------------------------
// SERVICE  CATEGORY STYLES
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
    icon: WashingMachine,
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
    case "pending":
      return "Pending";
    case "rejected":
      return "Rejected";
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
// price type removed

// Task Status
export function formatTaskStatus(status: TaskStatus) {
  switch (status) {
    case "Active":
      return "Active";
    case "Pending":
      return "Pending";
    case "Rejected":
      return "Rejected";
    case "Published":
      return "Published";
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

// Task Budget
// budget type removed

import { taskCategoryValues, taskStatusValues } from "@workspace/ui/lib/task-enum";
import { FilterConfig } from "@/components/ui/filter-bar";
import { 
  Briefcase, 
  HeartPulse, 
  WashingMachine, 
  Building, 
  Car, 
  Laptop, 
  Calculator, 
  Utensils, 
  Gavel, 
  BookOpen 
} from "lucide-react";

// Task category icons mapping - matching the ones from formatter.ts
export const taskCategoryIcons = {
  "MultiSector": Briefcase,
  "Health": HeartPulse,
  "Cleaning": WashingMachine,
  "Construction": Building,
  "Auto": Car,
  "Tech": Laptop,
  "Finance": Calculator,
  "Hospitality": Utensils,
  "Legal": Gavel,
  "Education": BookOpen,
} as const;

export const taskFiltersConfig: FilterConfig[] = [
  {
    key: "category",
    label: "Task Category",
    labelKey: "TasksFilters.taskCategory",
    type: "select",
    options: taskCategoryValues.map((category: any) => ({
      label: category,
      labelKey: `Enums.TaskCategory.${category}`,
      value: category,
      icon: taskCategoryIcons[category as keyof typeof taskCategoryIcons],
    })),
  },
  {
    key: "status",
    label: "Task Status",
    labelKey: "TasksFilters.taskStatus",
    type: "select",
    options: taskStatusValues.map((status: any) => ({
      label: status,
      labelKey: `Enums.TaskStatus.${status}`,
      value: status,
    })),
  },
  {
    key: "city",
    label: "Location",
    labelKey: "TasksFilters.location",
    type: "select",
    options: [
      { value: "Casablanca", label: "Casablanca" },
      { value: "Rabat", label: "Rabat" },
      { value: "Marrakech", label: "Marrakech" },
      { value: "Fez", label: "Fez" },
      { value: "Tangier", label: "Tangier" },
      { value: "Agadir", label: "Agadir" },
    ],
  },
  {
    key: "budgetMin",
    label: "Min Budget (MAD)",
    type: "input",
    placeholder: "Enter minimum budget",
  },
  {
    key: "budgetMax",
    label: "Max Budget (MAD)",
    type: "input",
    placeholder: "Enter maximum budget",
  },
];
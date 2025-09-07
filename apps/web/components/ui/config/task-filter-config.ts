import { taskCategoryValues, taskStatusValues } from "@workspace/ui/lib/task-enum";
import { FilterConfig } from "@/components/ui/filter-bar";

export const taskFiltersConfig: FilterConfig[] = [
  {
    key: "category",
    label: "Task Category",
    type: "select",
    options: taskCategoryValues.map((category: any) => ({
      label: category,
      value: category,
    })),
  },
  {
    key: "status",
    label: "Task Status",
    type: "select",
    options: taskStatusValues.map((status: any) => ({
      label: status,
      value: status,
    })),
  },
  {
    key: "city",
    label: "Location",
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
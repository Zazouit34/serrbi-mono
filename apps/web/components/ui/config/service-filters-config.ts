import { serviceCategoryValues } from "@workspace/ui/lib/service-enum";
import { FilterConfig } from "@/components/ui/filter-bar";
import { 
  Scale, 
  Stethoscope, 
  GraduationCap, 
  Building, 
  Wrench, 
  Zap, 
  Hammer, 
  Car, 
  Calculator, 
  Sparkles, 
  WashingMachine 
} from "lucide-react";

// Category icons mapping
export const categoryIcons = {
  "Lawyer": Scale,
  "Doctor": Stethoscope,
  "Education": GraduationCap,
  "Architect": Building,
  "Plumber": Wrench,
  "Electrician": Zap,
  "Mason": Hammer,
  "Mechanic": Car,
  "Accountant": Calculator,
  "Esthetician": Sparkles,
  "Cleaning": WashingMachine,
} as const;

export const serviceFiltersConfig: FilterConfig[] = [
  {
    key: "serviceCategory",
    label: "Service Category",
    labelKey: "ServicesFilters.serviceCategory",
    type: "select",
    options: serviceCategoryValues.map((category: any) => ({
      label: category,
      labelKey: `Enums.ServiceCategory.${category}`,
      value: category,
      icon: categoryIcons[category as keyof typeof categoryIcons],
    })),
  },
  {
    key: "type",
    label: "Service Type",
    labelKey: "ServicesFilters.serviceType",
    type: "select",
    options: [
      { value: "Plumber", label: "Plumber", labelKey: "Enums.ServiceCategory.Plumber" },
      { value: "Dentist", label: "Dentist", labelKey: "Enums.ServiceCategory.Dentist" },
      { value: "Doctor", label: "Doctor", labelKey: "Enums.ServiceCategory.Doctor" },
      { value: "Lawyer", label: "Lawyer", labelKey: "Enums.ServiceCategory.Lawyer" },
      { value: "Electrician", label: "Electrician", labelKey: "Enums.ServiceCategory.Electrician" },
      { value: "Mechanic", label: "Mechanic", labelKey: "Enums.ServiceCategory.Mechanic" },
      { value: "Accountant", label: "Accountant", labelKey: "Enums.ServiceCategory.Accountant" },
      { value: "Architect", label: "Architect", labelKey: "Enums.ServiceCategory.Architect" },
      { value: "Teacher", label: "Teacher", labelKey: "Enums.ServiceCategory.Teacher" },
      { value: "Esthetician", label: "Esthetician", labelKey: "Enums.ServiceCategory.Esthetician" },
      { value: "Mason", label: "Mason", labelKey: "Enums.ServiceCategory.Mason" },
      { value: "Cleaner", label: "Cleaner", labelKey: "Enums.ServiceCategory.Cleaning" },
    ],
  },
  {
    key: "city",
    label: "Location",
    labelKey: "ServicesFilters.location",
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
];
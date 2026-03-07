import { serviceCategoryValues } from "@workspace/ui/lib/service-enum";
import { FilterConfig } from "@/components/ui/filter-bar";
import { 
  Home,
  HardHat,
  HeartPulse,
  Sparkles, 
  Camera,
  Utensils,
  Monitor,
  Scale,
  GraduationCap,
  CarFront,
  Briefcase,
} from "lucide-react";

// Category icons mapping
export const categoryIcons = {
  "HomeMaintenance": Home,
  "ConstructionInstallation": HardHat,
  "HealthWellness": HeartPulse,
  "BeautyPersonalCare": Sparkles,
  "EventsMedia": Camera,
  "FoodCatering": Utensils,
  "DigitalCreative": Monitor,
  "LegalFinance": Scale,
  "EducationCoaching": GraduationCap,
  "AutomotiveTransport": CarFront,
  "Other": Briefcase,
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
    type: "input",
    placeholder: "Plumber, Designer, Doctor...",
    placeholderKey: "ServicesFilters.serviceTypePlaceholder",
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
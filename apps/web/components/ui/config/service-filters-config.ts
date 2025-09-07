import { serviceCategoryValues } from "@workspace/ui/lib/service-enum";
import { FilterConfig } from "@/components/ui/filter-bar";

export const serviceFiltersConfig: FilterConfig[] = [
  {
    key: "serviceCategory",
    label: "Service Category",
    type: "select",
    options: serviceCategoryValues.map((category: any) => ({
      label: category,
      value: category,
    })),
  },
  {
    key: "type",
    label: "Service Type",
    type: "select",
    options: [
      { value: "Plumber", label: "Plumber" },
      { value: "Dentist", label: "Dentist" },
      { value: "Doctor", label: "Doctor" },
      { value: "Lawyer", label: "Lawyer" },
      { value: "Electrician", label: "Electrician" },
      { value: "Mechanic", label: "Mechanic" },
      { value: "Accountant", label: "Accountant" },
      { value: "Architect", label: "Architect" },
      { value: "Teacher", label: "Teacher" },
      { value: "Esthetician", label: "Esthetician" },
      { value: "Mason", label: "Mason" },
      { value: "Cleaner", label: "Cleaner" },
    ],
  },
  {
    key: "priceType",
    label: "Price Type",
    type: "select",
    options: [
      { value: "fixed", label: "Fixed Price" },
      { value: "hourly", label: "Per Hour" },
      { value: "starting_from", label: "Starting From" },
    ],
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
];
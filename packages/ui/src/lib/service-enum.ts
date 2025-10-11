export const serviceCategoryValues = [
    "Lawyer",
    "Doctor",
    "Education",
    "Architect",
    "Plumber",
    "Electrician",    
    "Mason",
    "Mechanic",
    "Accountant",
    "Esthetician",
    "Cleaning",
    ] as const
    export type ServiceCategoryValue = (typeof serviceCategoryValues)[number]

// priceType removed

export const serviceStatusValues = [
    "draft",
    "pending",
    "published",
    "rejected",
    "delisted",
] as const
export type ServiceStatusValue = (typeof serviceStatusValues)[number]
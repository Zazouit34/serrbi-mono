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

export const priceTypeValues = [
    "fixed",
    "hourly",
    "starting_from",
] as const
export type PriceTypeValue = (typeof priceTypeValues)[number]

export const serviceStatusValues = [
    "draft",
    "pending",
    "published",
    "rejected",
    "delisted",
] as const
export type ServiceStatusValue = (typeof serviceStatusValues)[number]
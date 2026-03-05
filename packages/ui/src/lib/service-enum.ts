export const serviceCategoryValues = [
    "HomeMaintenance",
    "ConstructionInstallation",
    "HealthWellness",
    "BeautyPersonalCare",
    "EventsMedia",
    "FoodCatering",
    "DigitalCreative",
    "LegalFinance",
    "EducationCoaching",
    "AutomotiveTransport",
    "Other",
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
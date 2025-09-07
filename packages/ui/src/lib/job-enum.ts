
export const jobCategoryValues = [
    "Tech",
    "Finance",
    "Hospitality",
    "Health",
    "Legal",
    "Construction",
    "Education",
    "CallCenter",
    "Auto",
    "Cleaning",
    "Other",
  ] as const
  export type JobCategoryValue = (typeof jobCategoryValues)[number]




  export const locationRequirementValues = [
    "in_office",
    "hybrid",
    "remote",
  ] as const
  export type LocationRequirementValue = (typeof locationRequirementValues)[number]
  
  export const experienceLevelValues = [
    "junior",
    "mid_level",
    "senior",
  ] as const
  export type ExperienceLevelValue = (typeof experienceLevelValues)[number]
  
  export const jobListingStatusValues = [
    "draft",
    "published",
    "delisted",
    "expired",
  ] as const
  export type JobListingStatusValue = (typeof jobListingStatusValues)[number]
  
  export const jobListingTypeValues = [
    "internship",
    "part_time",
    "full_time",
  ] as const
  export type JobListingTypeValue = (typeof jobListingTypeValues)[number]
  
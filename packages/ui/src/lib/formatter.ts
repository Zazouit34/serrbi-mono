import {
    ExperienceLevel,
    JobListingType,
    LocationRequirement,
    JobCategory,
  } from "../../../database/generated/prisma/client.js"
  
  // Category
  export function formatJobCategory(category: JobCategory) {
    switch (category) {
      case "Tech": return "Tech"
      case "Finance": return "Finance"
      case "Hospitality": return "Hospitality"
      case "Health": return "Health"
      case "Legal": return "Legal"
      case "Construction": return "Construction"
      case "Education": return "Education"
      case "CallCenter": return "Call Center"
      case "Auto": return "Automotive"
      case "Cleaning": return "Cleaning"
      case "Other": return "Other"
      default: throw new Error(`Unknown job category: ${category satisfies never}`)
    }
  }
  
  // Location Requirement
  export function formatLocationRequirement(location: LocationRequirement) {
    switch (location) {
      case "in_office": return "In Office"
      case "hybrid": return "Hybrid"
      case "remote": return "Remote"
      default: throw new Error(`Unknown location requirement: ${location satisfies never}`)
    }
  }
  
  // Experience Level
  export function formatExperienceLevel(level: ExperienceLevel) {
    switch (level) {
      case "junior": return "Junior"
      case "mid_level": return "Mid Level"
      case "senior": return "Senior"
      default: throw new Error(`Unknown experience level: ${level satisfies never}`)
    }
  }
  
  // Job Type
  export function formatJobType(type: JobListingType) {
    switch (type) {
      case "full_time": return "Full Time"
      case "part_time": return "Part Time"
      case "internship": return "Internship"
      default: throw new Error(`Unknown job type: ${type satisfies never}`)
    }
  }
  
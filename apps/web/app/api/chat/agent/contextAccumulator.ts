import type { JobIntentData } from "./intentExtractor";

export type AccumulatedContext = {
  category?: string;
  city?: string;
  locationRequirement?: string;
  experienceLevel?: string;
  skills?: string[];
  minWage?: number;
  maxWage?: number;
};

export function mergeIntentContext(
  previous: AccumulatedContext,
  current: Partial<JobIntentData>,
): AccumulatedContext {
  const merged: AccumulatedContext = { ...previous };

  if (current.category !== undefined && current.category !== null) {
    merged.category = current.category;
  }
  if (current.city !== undefined && current.city !== null) {
    merged.city = current.city;
  }
  if (current.locationRequirement !== undefined && current.locationRequirement !== null) {
    merged.locationRequirement = current.locationRequirement;
  }
  if (current.experienceLevel !== undefined && current.experienceLevel !== null) {
    merged.experienceLevel = current.experienceLevel;
  }
  if (current.minWage !== undefined && current.minWage !== null) {
    merged.minWage = current.minWage;
  }
  if (current.maxWage !== undefined && current.maxWage !== null) {
    merged.maxWage = current.maxWage;
  }

  if (Array.isArray(current.skills) && current.skills.length > 0) {
    const existingSkills = new Set(merged.skills ?? []);
    for (const skill of current.skills) {
      existingSkills.add(skill);
    }
    merged.skills = Array.from(existingSkills);
  }

  return merged;
}

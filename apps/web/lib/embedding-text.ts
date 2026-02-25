import type { ResumeProfile } from "@/app/api/chat/agent/intentExtractor";

function cleanPart(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  return str;
}

export function buildJobEmbeddingText(input: {
  title?: string | null;
  description?: string | null;
  tags?: string[] | null;
  city?: string | null;
  locationRequirement?: string | null;
  experienceLevel?: string | null;
  type?: string | null;
  wage?: number | null;
  companyName?: string | null;
  category?: string | null;
}): string {
  const parts = [
    cleanPart(input.title),
    cleanPart(input.companyName),
    cleanPart(input.description),
    cleanPart(input.category),
    cleanPart(input.city),
    input.locationRequirement ? `location:${input.locationRequirement}` : "",
    input.experienceLevel ? `experience:${input.experienceLevel}` : "",
    input.type ? `type:${input.type}` : "",
    input.wage != null ? `wage:${input.wage}` : "",
    ...((input.tags ?? []).filter(Boolean) as string[]).map(cleanPart),
  ];
  return parts.filter(Boolean).join(" | ");
}

export function buildServiceEmbeddingText(input: {
  title?: string | null;
  displayName?: string | null;
  description?: string | null;
  serviceCategory?: string | null;
  type?: string | null;
  city?: string | null;
  stateAbbreviation?: string | null;
  price?: number | null;
}): string {
  const parts = [
    cleanPart(input.title),
    cleanPart(input.displayName),
    cleanPart(input.description),
    cleanPart(input.serviceCategory),
    cleanPart(input.type),
    cleanPart(input.city),
    cleanPart(input.stateAbbreviation),
    input.price != null ? `price:${input.price}` : "",
  ];
  return parts.filter(Boolean).join(" | ");
}

export function buildResumeEmbeddingText(profile: ResumeProfile): string {
  const parts = [
    profile.job_title ? `role:${profile.job_title}` : "",
    profile.experience_level ? `experience_level:${profile.experience_level}` : "",
    profile.experience_years != null ? `experience_years:${profile.experience_years}` : "",
    profile.skills.length ? `skills:${profile.skills.join(", ")}` : "",
    profile.industries.length ? `industries:${profile.industries.join(", ")}` : "",
    profile.education_level ? `education:${profile.education_level}` : "",
    profile.locations_preferred.length ? `preferred_locations:${profile.locations_preferred.join(", ")}` : "",
    profile.remote_preference != null ? `remote:${profile.remote_preference ? "yes" : "no"}` : "",
    profile.salary_expectation.min != null ? `salary_min:${profile.salary_expectation.min}` : "",
    profile.career_summary ? `summary:${profile.career_summary}` : "",
  ];
  return parts.filter(Boolean).join(" | ");
}

import { clamp01, cosineSimilarity, tokenize } from "./rankingEngine";

type JobForResumeMatch = {
  id: string;
  title: string;
  embedding: number[];
  tags: string[];
  experienceLevel: string;
  finalScore: number;
};

type ResumeMatchInput = {
  resumeEmbedding: number[];
  resumeSkills?: string[];
  resumeExperienceLevel?: string | null;
};

function normalizeTokenSet(values: string[]): Set<string> {
  const tokens = values.flatMap((value) => tokenize(value));
  return new Set(tokens);
}

function computeSkillOverlap(resumeSkills: string[], jobSkills: string[]): number {
  if (!jobSkills.length || !resumeSkills.length) return 0;
  const resumeSet = normalizeTokenSet(resumeSkills);
  const jobSet = normalizeTokenSet(jobSkills);
  if (jobSet.size === 0 || resumeSet.size === 0) return 0;

  let matchingSkills = 0;
  for (const token of jobSet) {
    if (resumeSet.has(token)) matchingSkills += 1;
  }
  return clamp01(matchingSkills / Math.max(1, jobSet.size));
}

function computeSkillMatchDetails(resumeSkills: string[], jobSkills: string[]) {
  const resumeTokenSet = normalizeTokenSet(resumeSkills);
  const requiredSkills = (jobSkills ?? []).filter(Boolean);
  const matchedSkills = requiredSkills.filter((skill) => {
    const skillTokens = tokenize(skill);
    return skillTokens.some((token) => resumeTokenSet.has(token));
  });
  const requiredCount = requiredSkills.length;
  const matchedCount = matchedSkills.length;
  return {
    requiredSkills,
    matchedSkills,
    requiredCount,
    matchedCount,
  };
}

function mapExperienceLevel(level: string | null | undefined): number | null {
  if (!level) return null;
  const normalized = level.trim().toLowerCase();
  if (normalized === "junior") return 1;
  if (normalized === "mid" || normalized === "mid_level") return 2;
  if (normalized === "senior") return 3;
  return null;
}

function computeExperienceAlignment(
  resumeExperienceLevel: string | null | undefined,
  jobExperienceLevel: string | null | undefined,
): number {
  const resumeLevel = mapExperienceLevel(resumeExperienceLevel);
  const jobLevel = mapExperienceLevel(jobExperienceLevel);
  if (resumeLevel == null || jobLevel == null) return 0.5;
  const diff = Math.abs(resumeLevel - jobLevel);
  if (diff === 0) return 1;
  if (diff === 1) return 0.7;
  return 0.35;
}

export function rankJobsWithResumeMatch<T extends JobForResumeMatch>(
  jobs: T[],
  input: ResumeMatchInput,
): Array<
  T & {
    resumeMatchScore: number;
    semanticResumeScore: number;
    skillOverlapScore: number;
    experienceAlignmentScore: number;
    blendedScore: number;
    matchPercent: number;
    matchedSkills: string[];
    requiredSkillsCount: number;
    matchedSkillsCount: number;
  }
> {
  const resumeSkills = input.resumeSkills ?? [];
  const scored = jobs.map((job) => {
    const semanticResumeScore =
      input.resumeEmbedding.length > 0 && Array.isArray(job.embedding) && job.embedding.length > 0
        ? clamp01((cosineSimilarity(input.resumeEmbedding, job.embedding) + 1) / 2)
        : 0;
    const skillDetails = computeSkillMatchDetails(resumeSkills, job.tags ?? []);
    const skillOverlapScore =
      skillDetails.requiredCount > 0
        ? clamp01(skillDetails.matchedCount / skillDetails.requiredCount)
        : computeSkillOverlap(resumeSkills, job.tags ?? []);
    const experienceAlignmentScore = computeExperienceAlignment(
      input.resumeExperienceLevel ?? null,
      job.experienceLevel ?? null,
    );

    // Resume match formula
    const resumeMatchScore =
      0.6 * semanticResumeScore + 0.25 * skillOverlapScore + 0.15 * experienceAlignmentScore;

    // Blend query relevance from ranking engine with resume personalization.
    const blendedScore = 0.6 * clamp01(job.finalScore ?? 0) + 0.4 * resumeMatchScore;
    const matchPercent = Math.round(clamp01(resumeMatchScore) * 100);

    return {
      ...job,
      resumeMatchScore,
      semanticResumeScore,
      skillOverlapScore,
      experienceAlignmentScore,
      blendedScore,
      matchPercent,
      matchedSkills: skillDetails.matchedSkills,
      requiredSkillsCount: skillDetails.requiredCount,
      matchedSkillsCount: skillDetails.matchedCount,
    };
  });

  scored.sort((a, b) => b.blendedScore - a.blendedScore);
  return scored;
}

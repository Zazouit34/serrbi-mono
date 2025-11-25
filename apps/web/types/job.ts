export interface SerrbiJob {
  id: string;
  title: string;
  company: string;
  companyImage?: string | null;
  category?: any;
  type?: any;
  experienceLevel?: any;
  locationRequirement?: any;
  createdAt?: string;
  location?: string;
  description: string;
  tags?: string[];
}

export interface ScoredJob extends SerrbiJob {
  denseScore: number;
  finalScore: number;
}

export interface JobsSearchMeta {
  query: string;
  rewrittenQuery?: string;
  topKDense: number;
  topKFinal: number;
  denseModel: "text-embedding-v4";
}

export interface JobsSearchResponse {
  results: ScoredJob[];
  meta: JobsSearchMeta;
}

export interface SynthesizedJobsResponse {
  responseText: string;
  jobsUsed: {
    id: string;
    title?: string | null;
    company?: string | null;
    location?: string | null;
  }[];
}



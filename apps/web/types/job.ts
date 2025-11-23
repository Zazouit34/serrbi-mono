export interface SerrbiJob {
  id: string;
  title: string;
  company: string;
  location?: string;
  description: string;
  tags?: string[];
}

export interface ScoredJob extends SerrbiJob {
  denseScore: number;
  rerankScore: number;
  finalScore: number;
}

export interface JobsSearchMeta {
  query: string;
  topKDense: number;
  topKFinal: number;
  denseModel: "text-embedding-v4";
}

export interface JobsSearchResponse {
  results: ScoredJob[];
  meta: JobsSearchMeta;
}



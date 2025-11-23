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
  denseModel: "BAAI/bge-m3";
  rerankerModel: "BAAI/bge-reranker-v2-m3";
}

export interface JobsSearchResponse {
  results: ScoredJob[];
  meta: JobsSearchMeta;
}



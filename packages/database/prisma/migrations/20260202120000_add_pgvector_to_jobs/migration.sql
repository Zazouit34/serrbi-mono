-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add pgvector column with CORRECT dimension
ALTER TABLE "Job"
ADD COLUMN embedding_vector vector(1024);

-- Backfill from existing Float[] embeddings
UPDATE "Job"
SET embedding_vector = embedding::vector
WHERE embedding IS NOT NULL
  AND array_length(embedding, 1) = 1024;

-- Create IVFFlat index for vector search (cosine distance)
CREATE INDEX job_embedding_idx
ON "Job"
USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);

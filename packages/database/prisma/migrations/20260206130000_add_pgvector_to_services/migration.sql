-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add pgvector column with correct dimension
ALTER TABLE "Service"
ADD COLUMN embedding_vector vector(1024);

-- Backfill from existing Float[] embeddings
UPDATE "Service"
SET embedding_vector = embedding::vector
WHERE embedding IS NOT NULL
  AND array_length(embedding, 1) = 1024;

-- Create vector index
CREATE INDEX service_embedding_idx
ON "Service"
USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);

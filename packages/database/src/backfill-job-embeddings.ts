import { prisma } from "./client";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function callEmbeddingApi(
  texts: string[],
): Promise<number[][]> {
  const baseUrl = getRequiredEnv("EMBEDDING_API_URL");
  const apiKey = getRequiredEnv("DASHSCOPE_API_KEY");

  const url = baseUrl.includes("/services/embeddings/")
    ? baseUrl
    : `${baseUrl.replace(/\/$/, "")}/services/embeddings/text-embedding/text-embedding`;

  const body = {
    model: "text-embedding-v4",
    input: {
      texts,
    },
    parameters: {
      output_type: "dense",
      // dimension: 1024, // Optional: customize embedding dimension if desired.
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Embedding API error (${response.status}): ${
        text || response.statusText
      }`,
    );
  }

  const json: any = await response.json();

  if (
    !json ||
    typeof json !== "object" ||
    !json.output ||
    !Array.isArray(json.output.embeddings)
  ) {
    throw new Error("Unexpected embedding API response shape");
  }

  const embeddings: number[][] = json.output.embeddings.map(
    (item: any) => {
      if (
        !item ||
        !Array.isArray(item.embedding) ||
        !item.embedding.every((v: any) => typeof v === "number")
      ) {
        throw new Error("Invalid embedding vector in response");
      }
      return item.embedding as number[];
    },
  );

  return embeddings;
}

function buildJobText(job: {
  title: string;
  companyName: string | null;
  city: string | null;
  description: string;
  tags: string[];
}): string {
  const parts: string[] = [
    job.title,
    job.companyName ?? "",
    job.city ?? "",
    job.description,
    ...(job.tags ?? []),
  ];
  return parts.filter((p) => p && p.trim().length > 0).join(" | ");
}

async function main() {
  const BATCH_SIZE = 50;
  const EMBEDDING_BATCH_LIMIT = 10; // DashScope max batch size
  let totalUpdated = 0;

  // Keep backfilling in batches until there are no jobs left with empty embeddings.
  // Uses the scalar list filter `isEmpty` on the Float[] field.
  while (true) {
    const jobs = await prisma.job.findMany({
      where: {
        embedding: {
          isEmpty: true,
        },
      },
      select: {
        id: true,
        title: true,
        companyName: true,
        city: true,
        description: true,
        tags: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: BATCH_SIZE,
    });

    if (jobs.length === 0) {
      break;
    }

    // Process jobs in sub-batches to respect DashScope's batch size limit.
    for (let start = 0; start < jobs.length; start += EMBEDDING_BATCH_LIMIT) {
      const end = Math.min(start + EMBEDDING_BATCH_LIMIT, jobs.length);
      const slice = jobs.slice(start, end);

      const texts = slice.map((job) => buildJobText({
        title: job.title,
        companyName: job.companyName ?? null,
        city: job.city ?? null,
        description: job.description,
        tags: job.tags ?? [],
      }));

      const embeddings = await callEmbeddingApi(texts);

      if (embeddings.length !== slice.length) {
        throw new Error(
          `Expected ${slice.length} embeddings but got ${embeddings.length}`,
        );
      }

      for (let i = 0; i < slice.length; i += 1) {
        const job = slice[i]!;
        const embedding = embeddings[i]!;

        await prisma.job.update({
          where: { id: job.id },
          data: { embedding },
        });

        totalUpdated += 1;
      }

      console.log(
        `Updated embeddings for jobs ${start + 1}-${end} of ${jobs.length} in current batch; total updated so far: ${totalUpdated}`,
      );
    }
  }

  console.log(`Backfill complete. Total jobs updated: ${totalUpdated}`);
}

main()
  .catch((err) => {
    console.error("Error while backfilling job embeddings:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



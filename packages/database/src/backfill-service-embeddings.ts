import { prisma } from "./client";

const CATEGORY_CONTEXT: Record<string, string> = {
  HomeMaintenance: "home maintenance repairs electrician plumber cleaning locksmith carpenter painter",
  ConstructionInstallation: "construction installation architecture renovation masonry pool elevator security systems",
  HealthWellness: "health wellness doctor nurse therapist nutrition fitness clinic care",
  BeautyPersonalCare: "beauty personal care hairstylist barber makeup esthetician spa",
  EventsMedia: "events media planner wedding decoration photographer videographer dj",
  FoodCatering: "food catering chef meal prep bakery restaurant",
  DigitalCreative: "digital creative graphic design web developer social media marketing content",
  LegalFinance: "legal finance lawyer accounting tax advisory",
  EducationCoaching: "education coaching teacher tutor trainer learning",
  AutomotiveTransport: "automotive transport mechanic garage car service driver",
  Other: "miscellaneous services",
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function callEmbeddingApi(texts: string[]): Promise<number[][]> {
  const baseUrl = getRequiredEnv("EMBEDDING_API_URL");
  const apiKey = getRequiredEnv("DASHSCOPE_API_KEY");

  const url = baseUrl.includes("/services/embeddings/")
    ? baseUrl
    : `${baseUrl.replace(/\/$/, "")}/services/embeddings/text-embedding/text-embedding`;

  const body = {
    model: "text-embedding-v4",
    input: { texts },
    parameters: {
      output_type: "dense",
      // dimension: 1024, // Optional: customize embedding dimension if desired
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
    throw new Error(`Embedding API error (${response.status}): ${text || response.statusText}`);
  }

  const json: any = await response.json();
  if (!json || typeof json !== "object" || !json.output || !Array.isArray(json.output.embeddings)) {
    throw new Error("Unexpected embedding API response shape");
  }

  const embeddings: number[][] = json.output.embeddings.map((item: any) => {
    if (!item || !Array.isArray(item.embedding) || !item.embedding.every((v: any) => typeof v === "number")) {
      throw new Error("Invalid embedding vector in response");
    }
    return item.embedding as number[];
  });

  return embeddings;
}

function buildServiceText(service: {
  title: string;
  displayName: string | null;
  description: string;
  serviceCategory: string;
  type: string | null;
  price: number | null;
  city: string | null;
  stateAbbreviation: string | null;
  averageRating: number | null;
  numberOfReviews: number;
}): string {
  const normalizedCategory = service.serviceCategory ?? "Other";
  const categoryContext = CATEGORY_CONTEXT[normalizedCategory] ?? CATEGORY_CONTEXT.Other;
  const parts: string[] = [
    `title:${service.title}`,
    service.displayName ? `provider:${service.displayName}` : "",
    `description:${service.description}`,
    `service_category:${normalizedCategory}`,
    `category_context:${categoryContext}`,
    service.type ? `service_type:${service.type}` : "",
    service.city ? `city:${service.city}` : "",
    service.stateAbbreviation ? `state:${service.stateAbbreviation}` : "",
    service.price != null ? `price:${service.price}` : "",
    service.averageRating != null ? `rating:${service.averageRating}` : "",
    service.numberOfReviews > 0 ? `reviews:${service.numberOfReviews}` : "",
  ];
  return parts.filter((p) => p && p.trim().length > 0).join(" | ");
}

async function main() {
  const BATCH_SIZE = 50;
  const EMBEDDING_BATCH_LIMIT = 10; // DashScope max batch size
  const forceReembed = process.env.FORCE_REEMBED === "true";
  let totalUpdated = 0;

  while (true) {
    const services = await prisma.service.findMany({
      where: forceReembed ? undefined : { embedding: { isEmpty: true } },
      select: {
        id: true,
        title: true,
        displayName: true,
        description: true,
        serviceCategory: true,
        type: true,
        price: true,
        city: true,
        stateAbbreviation: true,
        averageRating: true,
        numberOfReviews: true,
      },
      orderBy: { createdAt: "asc" },
      skip: forceReembed ? totalUpdated : 0,
      take: BATCH_SIZE,
    });

    if (services.length === 0) break;

    for (let start = 0; start < services.length; start += EMBEDDING_BATCH_LIMIT) {
      const end = Math.min(start + EMBEDDING_BATCH_LIMIT, services.length);
      const slice = services.slice(start, end);

      const texts = slice.map((service) =>
        buildServiceText({
          title: service.title,
          displayName: service.displayName ?? null,
          description: service.description,
          serviceCategory: service.serviceCategory ?? "",
          type: service.type ?? null,
          price: service.price ?? null,
          city: service.city ?? null,
          stateAbbreviation: service.stateAbbreviation ?? null,
          averageRating: service.averageRating ?? null,
          numberOfReviews: service.numberOfReviews ?? 0,
        }),
      );

      const embeddings = await callEmbeddingApi(texts);
      if (embeddings.length !== slice.length) {
        throw new Error(`Expected ${slice.length} embeddings but got ${embeddings.length}`);
      }

      for (let i = 0; i < slice.length; i += 1) {
        const service = slice[i]!;
        const embedding = embeddings[i]!;

        await prisma.service.update({
          where: { id: service.id },
          data: {
            embedding,
          },
        });

        // Keep pgvector column in sync for semantic search.
        if (embedding.length === 1024) {
          await (prisma as any).$executeRawUnsafe(
            `UPDATE "Service" SET embedding_vector = embedding::vector WHERE id = $1`,
            service.id,
          );
        }

        totalUpdated += 1;
      }

      console.log(
        `Updated embeddings for services ${start + 1}-${end} of ${services.length} in current batch; total updated so far: ${totalUpdated}`,
      );
    }
  }

  console.log(`Backfill complete. Total services updated: ${totalUpdated}`);
}

main()
  .catch((err) => {
    console.error("Error while backfilling service embeddings:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

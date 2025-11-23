import { NextResponse } from "next/server";
import { embedText } from "@/lib/embedding";
import { hybridSearchJobs } from "@/lib/jobsStore";
import type { JobsSearchResponse } from "@/types/job";

interface JobsSearchRequestBody {
  query?: string;
  topKDense?: number;
  topKFinal?: number;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | JobsSearchRequestBody
      | null;

    const query = body?.query?.trim();
    if (!query) {
      return NextResponse.json(
        { error: "Missing or empty 'query' in request body" },
        { status: 400 },
      );
    }

    const topKDense =
      typeof body?.topKDense === "number" && body.topKDense > 0
        ? body.topKDense
        : 50;

    const topKFinal =
      typeof body?.topKFinal === "number" && body.topKFinal > 0
        ? body.topKFinal
        : 20;

    const queryEmbedding = await embedText(query);

    const results = await hybridSearchJobs(query, queryEmbedding, {
      topKDense,
      topKFinal,
    });

    const response: JobsSearchResponse = {
      results,
      meta: {
        query,
        topKDense,
        topKFinal,
        denseModel: "text-embedding-v4",
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      { error: "Failed to perform job search", details: message },
      { status: 500 },
    );
  }
}



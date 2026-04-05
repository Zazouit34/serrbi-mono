import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { trackAgentEvent } from "@/lib/agent/tracker";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: true });
    }

    const body = await req.json();
    const { sessionId, cardId, cardPosition, cardType, searchQuery, matchScore } = body;

    if (!sessionId || !cardId) {
      return NextResponse.json({ ok: true });
    }

    await trackAgentEvent({
      userId: session.user.id,
      sessionId,
      name: "CARD_CLICKED",
      intent:
        cardType === "job" ? "search_job"
        : cardType === "service" ? "search_service"
        : cardType === "task" ? "search_task"
        : null,
      data: {
        cardId,
        cardPosition,
        cardType,
        searchQuery,
        matchScore,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[events/route] Error:", err?.message);
    return NextResponse.json({ ok: true });
  }
}

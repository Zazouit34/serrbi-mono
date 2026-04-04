import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@workspace/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, intent, sessionId, data } = body;

    if (!name || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await (prisma as any).event.create({
      data: {
        userId: session.user.id,
        sessionId,
        name,
        intent: intent ?? null,
        source: "agent_chat",
        data: data ?? {},
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

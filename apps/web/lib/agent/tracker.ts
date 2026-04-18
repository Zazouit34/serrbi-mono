import { prisma } from "@workspace/db";

type TrackEventArgs = {
  userId?: string | null;
  sessionId: string;
  name: "AGENT_INTENT_TRIGGERED" | "AGENT_SEARCH_RESULTS_RETURNED" | "CARD_CLICKED";
  intent?: "conversation" | "search_job" | "search_service" | "search_task" | null;
  data?: Record<string, unknown>;
};

export async function trackAgentEvent(args: TrackEventArgs): Promise<void> {
  if (!args.userId) return;
  try {
    await (prisma as any).event.create({
      data: {
        userId: args.userId,
        sessionId: args.sessionId,
        name: args.name,
        intent: args.intent ?? null,
        source: "agent_chat",
        data: args.data ?? {},
      },
    });
  } catch (error) {
    console.error("Failed to track agent event", error);
  }
}

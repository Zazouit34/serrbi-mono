import { NextRequest, NextResponse } from "next/server";
import { PaddleService } from "@/lib/paddle-server";
import { prisma } from "@workspace/db";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("paddle-signature");
    if (!signature) {
      return new NextResponse("Missing signature", { status: 400 });
    }

    const rawBody = await req.text();
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) {
      return new NextResponse("Missing webhook secret", { status: 500 });
    }

    const verified = PaddleService.verifyWebhookSignature(signature, rawBody, secret);
    if (!verified) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(rawBody);

    // Basic event handling (extend as needed)
    switch (event.eventType) {
      case "transaction.completed": {
        const t = event.data;
        // Link to user/subscription by custom data if provided
        const userId: string | undefined = t.customData?.userId;
        const subscriptionId: string | undefined = t.subscriptionId;

        await prisma.payment.create({
          data: {
            userId: userId || undefined,
            paddleTransactionId: t.id,
            amount: t.totals?.grandTotal ?? 0,
            currency: t.currencyCode ?? "USD",
            status: "SUCCEEDED",
            subscriptionId: subscriptionId || undefined,
            raw: t,
          } as any,
        });
        break;
      }
      case "subscription.created":
      case "subscription.updated":
      case "subscription.canceled": {
        const s = event.data;
        const status = s.status?.toUpperCase();

        // Try to find subscription by Paddle ID
        const existing = await prisma.subscription.findFirst({
          where: { paddleSubscriptionId: s.id },
        });

        if (existing) {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: {
              status: status as any,
              currentPeriodStart: s.currentBillingPeriod?.startsAt || undefined,
              currentPeriodEnd: s.currentBillingPeriod?.endsAt || undefined,
              trialStart: s.trialPeriod?.startsAt || undefined,
              trialEnd: s.trialPeriod?.endsAt || undefined,
              canceledAt: event.eventType === "subscription.canceled" ? new Date() : null,
            },
          });
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Paddle webhook error", err);
    return new NextResponse("Webhook error", { status: 500 });
  }
}

export const dynamic = "force-dynamic";


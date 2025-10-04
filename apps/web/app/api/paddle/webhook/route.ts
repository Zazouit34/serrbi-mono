import { NextResponse } from "next/server";
import { getPaddleInstance } from "@/lib/paddle/server";
import { prisma, SubscriptionStatus } from "@workspace/db";

const paddle = getPaddleInstance();
const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET!;

// Map Paddle status to Prisma enum
function mapPaddleStatus(paddleStatus: string | undefined) {
  switch ((paddleStatus || "").toLowerCase()) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "canceled":
    case "cancelled":
      return SubscriptionStatus.CANCELED;
    case "paused":
      return SubscriptionStatus.PAUSED;
    case "past_due":
    case "past-due":
      return SubscriptionStatus.PAST_DUE;
    case "trialing":
    case "trial":
      return SubscriptionStatus.TRIALING;
    case "unpaid":
      return SubscriptionStatus.UNPAID;
    default:
      return SubscriptionStatus.ACTIVE;
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    // ✅ Get the Paddle signature header
    const signature = req.headers.get("paddle-signature");
    if (!signature) {
      console.error("Missing paddle-signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // ✅ Verify webhook & parse the event
    // In SDK >=1.4, unmarshal takes (rawBody, signature, webhookSecret)
    const event = await paddle.webhooks.unmarshal(rawBody, signature, webhookSecret);

    // ✅ Relax the strict typing to avoid “no overlap” errors
    const eventType = (event as any).eventType as string;
    const data = (event as any).data;

    console.log("🔔 Paddle webhook received:", eventType);

    // Helper: get Paddle IDs and user
    const getUserIdFromPayload = async (): Promise<string | null> => {
      const custom =
        data?.custom_data ?? data?.customData ?? data?.passthrough ?? {};
      let userId = custom?.userId ?? custom?.user_id ?? null;

      if (!userId) {
        const email =
          data?.customer?.email ??
          data?.customer_email ??
          data?.email ??
          data?.user_email ??
          null;
        if (email) {
          const user = await prisma.user.findUnique({ where: { email } });
          if (user) userId = user.id;
        }
      }
      return userId ?? null;
    };

    const getPaddleCustomerId = () =>
      data?.customer_id ?? data?.customer?.id ?? null;

    const getPaddleSubscriptionId = () =>
      data?.id ?? data?.subscription_id ?? data?.subscription?.id ?? null;

    const getPriceId = () =>
      data?.items?.[0]?.price?.id ??
      data?.items?.[0]?.price_id ??
      data?.price_id ??
      data?.plan_id ??
      null;

    // ✅ Handle subscription.created
    if (
      eventType === "subscription.created" ||
      eventType === "subscription_created"
    ) {
      const userId = await getUserIdFromPayload();
      if (!userId) return NextResponse.json({ received: true });

      const paddleCustomerId = String(getPaddleCustomerId() ?? "");
      const priceId = getPriceId();

      await prisma.customer.upsert({
        where: { paddleCustomerId },
        update: {
          userId,
          email: data?.customer?.email ?? data?.customer_email ?? undefined,
          name: data?.customer?.name ?? null,
        },
        create: {
          userId,
          paddleCustomerId,
          email: data?.customer?.email ?? data?.customer_email ?? undefined,
          name: data?.customer?.name ?? null,
        },
      });

      const plan = priceId
        ? await prisma.subscriptionPlanConfig.findFirst({
            where: { paddlePriceId: String(priceId) },
          })
        : null;

      const paddleSubscriptionId = String(getPaddleSubscriptionId() ?? "");
      await prisma.subscription.upsert({
        where: { paddleSubscriptionId },
        create: {
          userId,
          planId: plan?.id ?? "",
          paddleSubscriptionId,
          paddleCustomerId,
          status: mapPaddleStatus(data?.status),
          currentPeriodStart:
            data?.current_billing_period?.starts_at
              ? new Date(data.current_billing_period.starts_at)
              : null,
          currentPeriodEnd:
            data?.current_billing_period?.ends_at
              ? new Date(data.current_billing_period.ends_at)
              : null,
        },
        update: {
          planId: plan?.id ?? "",
          status: mapPaddleStatus(data?.status),
          currentPeriodStart:
            data?.current_billing_period?.starts_at
              ? new Date(data.current_billing_period.starts_at)
              : undefined,
          currentPeriodEnd:
            data?.current_billing_period?.ends_at
              ? new Date(data.current_billing_period.ends_at)
              : undefined,
        },
      });

      console.log("✅ subscription.created handled:", paddleSubscriptionId);
      return NextResponse.json({ received: true });
    }

    // ✅ Handle subscription.updated
    if (
      eventType === "subscription.updated" ||
      eventType === "subscription_updated"
    ) {
      const paddleSubscriptionId = String(getPaddleSubscriptionId() ?? "");
      const priceId = getPriceId();
      const plan = priceId
        ? await prisma.subscriptionPlanConfig.findFirst({
            where: { paddlePriceId: String(priceId) },
          })
        : null;

      await prisma.subscription.updateMany({
        where: { paddleSubscriptionId },
        data: {
          planId: plan?.id ?? undefined,
          status: mapPaddleStatus(data?.status),
          currentPeriodStart:
            data?.current_billing_period?.starts_at
              ? new Date(data.current_billing_period.starts_at)
              : undefined,
          currentPeriodEnd:
            data?.current_billing_period?.ends_at
              ? new Date(data.current_billing_period.ends_at)
              : undefined,
        },
      });

      console.log("🔄 subscription.updated handled:", paddleSubscriptionId);
      return NextResponse.json({ received: true });
    }

    // ✅ Handle subscription.canceled
    if (
      eventType === "subscription.canceled" ||
      eventType === "subscription_cancelled"
    ) {
      const paddleSubscriptionId = String(getPaddleSubscriptionId() ?? "");
      await prisma.subscription.updateMany({
        where: { paddleSubscriptionId },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
        },
      });

      console.log("❌ subscription.canceled handled:", paddleSubscriptionId);
      return NextResponse.json({ received: true });
    }

    console.log("Unhandled Paddle event:", eventType);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("❌ Paddle webhook error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}

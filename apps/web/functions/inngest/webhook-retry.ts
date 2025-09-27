import { inngest } from "./client";
import { prisma } from "@workspace/db";
import { PaddleService } from "@/lib/paddle-server";

// Process failed webhook events with retry logic
export const processFailedWebhooks = inngest.createFunction(
  { id: "process-failed-webhooks" },
  { cron: "0 */5 * * *" }, // Run every 5 minutes
  async ({ step }) => {
    return await step.run("process-failed-webhooks", async () => {
      // Get failed webhook events that haven't been processed and haven't exceeded max attempts
      const failedEvents = await prisma.webhookEvent.findMany({
        where: {
          processed: false,
          attempts: { lt: 5 }, // Max 5 attempts
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Only retry events from last 24 hours
        },
        orderBy: { createdAt: 'asc' },
        take: 10, // Process 10 at a time
      });

      const results = [];

      for (const event of failedEvents) {
        try {
          // Parse the event data
          const eventData = event.data as any;
          
          // Process the event based on its type
          await processWebhookEvent(eventData);
          
          // Mark as processed
          await prisma.webhookEvent.update({
            where: { id: event.id },
            data: {
              processed: true,
              processedAt: new Date(),
              lastError: null,
            },
          });
          
          results.push({ eventId: event.eventId, status: 'success' });
        } catch (error) {
          // Update error information
          await prisma.webhookEvent.update({
            where: { id: event.id },
            data: {
              attempts: { increment: 1 },
              lastError: error instanceof Error ? error.message : "Unknown error",
            },
          });
          
          results.push({ 
            eventId: event.eventId, 
            status: 'failed', 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        }
      }

      return {
        processed: results.length,
        results,
      };
    });
  }
);

// Process individual webhook event
async function processWebhookEvent(event: any) {
  const eventType = event.eventType;
  const data = event.data;

  switch (eventType) {
    case "transaction.completed": {
      await handleTransactionCompleted(data);
      break;
    }
    case "transaction.payment_failed": {
      await handlePaymentFailed(data);
      break;
    }
    case "transaction.refunded": {
      await handlePaymentRefunded(data);
      break;
    }
    case "subscription.created": {
      await handleSubscriptionCreated(data);
      break;
    }
    case "subscription.updated": {
      await handleSubscriptionUpdated(data);
      break;
    }
    case "subscription.canceled": {
      await handleSubscriptionCanceled(data);
      break;
    }
    case "subscription.paused": {
      await handleSubscriptionPaused(data);
      break;
    }
    case "subscription.resumed": {
      await handleSubscriptionResumed(data);
      break;
    }
    case "invoice.payment_succeeded": {
      await handleInvoicePaymentSucceeded(data);
      break;
    }
    case "invoice.payment_failed": {
      await handleInvoicePaymentFailed(data);
      break;
    }
    default:
      console.log(`Unhandled webhook event type: ${eventType}`);
  }
}

async function handleTransactionCompleted(data: any) {
  const userId = data.customData?.userId;
  const subscriptionId = data.subscriptionId;

  // Find subscription by Paddle ID if available
  let subscription = null;
  if (subscriptionId) {
    subscription = await prisma.subscription.findFirst({
      where: { paddleSubscriptionId: subscriptionId },
    });
  }

  // Create payment record
  await prisma.payment.create({
    data: {
      userId: userId || subscription?.userId,
      subscriptionId: subscription?.id,
      paddleTransactionId: data.id,
      amount: data.totals?.grandTotal ?? 0,
      currency: data.currencyCode ?? "USD",
      status: "SUCCEEDED",
      description: data.items?.[0]?.name || "Subscription payment",
      paymentMethod: data.paymentMethod?.type,
      paidAt: new Date(data.createdAt),
    },
  });
}

async function handlePaymentFailed(data: any) {
  const subscriptionId = data.subscriptionId;
  
  if (subscriptionId) {
    const subscription = await prisma.subscription.findFirst({
      where: { paddleSubscriptionId: subscriptionId },
    });

    if (subscription) {
      await prisma.payment.create({
        data: {
          userId: subscription.userId,
          subscriptionId: subscription.id,
          paddleTransactionId: data.id,
          amount: data.totals?.grandTotal ?? 0,
          currency: data.currencyCode ?? "USD",
          status: "FAILED",
          description: data.items?.[0]?.name || "Subscription payment",
          paymentMethod: data.paymentMethod?.type,
          failureReason: data.failureReason,
        },
      });
    }
  }
}

async function handlePaymentRefunded(data: any) {
  const payment = await prisma.payment.findFirst({
    where: { paddleTransactionId: data.id },
  });

  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(data.createdAt),
      },
    });
  }
}

async function handleSubscriptionCreated(data: any) {
  const subscription = await prisma.subscription.findFirst({
    where: { paddleSubscriptionId: data.id },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: data.status?.toUpperCase(),
        currentPeriodStart: data.currentBillingPeriod?.startsAt,
        currentPeriodEnd: data.currentBillingPeriod?.endsAt,
        trialStart: data.trialPeriod?.startsAt,
        trialEnd: data.trialPeriod?.endsAt,
      },
    });
  }
}

async function handleSubscriptionUpdated(data: any) {
  const subscription = await prisma.subscription.findFirst({
    where: { paddleSubscriptionId: data.id },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: data.status?.toUpperCase(),
        currentPeriodStart: data.currentBillingPeriod?.startsAt,
        currentPeriodEnd: data.currentBillingPeriod?.endsAt,
        trialStart: data.trialPeriod?.startsAt,
        trialEnd: data.trialPeriod?.endsAt,
      },
    });
  }
}

async function handleSubscriptionCanceled(data: any) {
  const subscription = await prisma.subscription.findFirst({
    where: { paddleSubscriptionId: data.id },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
      },
    });
  }
}

async function handleSubscriptionPaused(data: any) {
  const subscription = await prisma.subscription.findFirst({
    where: { paddleSubscriptionId: data.id },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "PAUSED",
        pausedAt: new Date(),
      },
    });
  }
}

async function handleSubscriptionResumed(data: any) {
  const subscription = await prisma.subscription.findFirst({
    where: { paddleSubscriptionId: data.id },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "ACTIVE",
        pausedAt: null,
      },
    });
  }
}

async function handleInvoicePaymentSucceeded(data: any) {
  const subscriptionId = data.subscriptionId;
  
  if (subscriptionId) {
    const subscription = await prisma.subscription.findFirst({
      where: { paddleSubscriptionId: subscriptionId },
    });

    if (subscription) {
      await prisma.payment.create({
        data: {
          userId: subscription.userId,
          subscriptionId: subscription.id,
          paddleTransactionId: data.id,
          amount: data.totals?.grandTotal ?? 0,
          currency: data.currencyCode ?? "USD",
          status: "SUCCEEDED",
          description: "Invoice payment",
          paidAt: new Date(data.createdAt),
        },
      });
    }
  }
}

async function handleInvoicePaymentFailed(data: any) {
  const subscriptionId = data.subscriptionId;
  
  if (subscriptionId) {
    const subscription = await prisma.subscription.findFirst({
      where: { paddleSubscriptionId: subscriptionId },
    });

    if (subscription) {
      await prisma.payment.create({
        data: {
          userId: subscription.userId,
          subscriptionId: subscription.id,
          paddleTransactionId: data.id,
          amount: data.totals?.grandTotal ?? 0,
          currency: data.currencyCode ?? "USD",
          status: "FAILED",
          description: "Invoice payment",
          failureReason: data.failureReason,
        },
      });
    }
  }
}

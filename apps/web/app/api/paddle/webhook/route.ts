import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@workspace/db';
import { SubscriptionStatus, PaymentStatus } from '@workspace/db';
import crypto from 'crypto';

/**
 * Verify Paddle webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  try {
    // Extract timestamp and signature from Paddle signature header
    const parts = signature.split(';').map(part => part.split('='));
    const ts = parts[0]?.[1];
    const h1 = parts[1]?.[1];
    
    if (!ts || !h1) {
      return false;
    }
    
    // Create expected signature
    const signedPayload = `${ts}:${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Compare signatures
    return crypto.timingSafeEqual(
      Buffer.from(h1),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Handle Paddle webhook events
 */
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('paddle-signature');
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('PADDLE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // Verify signature
    const isValid = signature ? verifyWebhookSignature(rawBody, signature, webhookSecret) : false;
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the event
    const event = JSON.parse(rawBody);
    const { event_type, data } = event;

    console.log(`📥 Received Paddle webhook: ${event_type}`);

    // Handle different event types
    switch (event_type) {
      case 'subscription.created':
        await handleSubscriptionCreated(data);
        break;

      case 'subscription.updated':
        await handleSubscriptionUpdated(data);
        break;

      case 'subscription.canceled':
        await handleSubscriptionCanceled(data);
        break;

      case 'subscription.paused':
        await handleSubscriptionPaused(data);
        break;

      case 'subscription.resumed':
        await handleSubscriptionResumed(data);
        break;

      case 'transaction.completed':
        await handleTransactionCompleted(data);
        break;

      case 'transaction.payment_failed':
        await handleTransactionFailed(data);
        break;

      default:
        console.log(`Unhandled event type: ${event_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle subscription.created event
 */
async function handleSubscriptionCreated(data: any) {
  try {
    const customData = data.custom_data || {};
    const userId = customData.userId;

    if (!userId) {
      console.error('No userId in custom_data');
      return;
    }

    // Get or create customer
    let customer = await prisma.customer.findFirst({
      where: { paddleCustomerId: data.customer_id },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          userId,
          paddleCustomerId: data.customer_id,
          email: data.customer?.email || '',
          name: data.customer?.name || null,
        },
      });
    }

    // Find the plan by paddle price ID
    const priceId = data.items?.[0]?.price?.id;
    const plan = await prisma.subscriptionPlanConfig.findFirst({
      where: { paddlePriceId: priceId },
    });

    if (!plan) {
      console.error(`No plan found for price ID: ${priceId}`);
      return;
    }

    // Create or update subscription
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: plan.id,
        paddleSubscriptionId: data.id,
        paddleCustomerId: data.customer_id,
        status: mapPaddleStatus(data.status),
        currentPeriodStart: new Date(data.current_billing_period?.starts_at),
        currentPeriodEnd: new Date(data.current_billing_period?.ends_at),
      },
      update: {
        planId: plan.id,
        paddleSubscriptionId: data.id,
        paddleCustomerId: data.customer_id,
        status: mapPaddleStatus(data.status),
        currentPeriodStart: new Date(data.current_billing_period?.starts_at),
        currentPeriodEnd: new Date(data.current_billing_period?.ends_at),
      },
    });

    console.log(`✅ Subscription created for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription.created:', error);
  }
}

/**
 * Handle subscription.updated event
 */
async function handleSubscriptionUpdated(data: any) {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { paddleSubscriptionId: data.id },
    });

    if (!subscription) {
      console.error(`No subscription found for Paddle ID: ${data.id}`);
      return;
    }

    // Find the plan by paddle price ID
    const priceId = data.items?.[0]?.price?.id;
    const plan = await prisma.subscriptionPlanConfig.findFirst({
      where: { paddlePriceId: priceId },
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: plan?.id || subscription.planId,
        status: mapPaddleStatus(data.status),
        currentPeriodStart: new Date(data.current_billing_period?.starts_at),
        currentPeriodEnd: new Date(data.current_billing_period?.ends_at),
      },
    });

    console.log(`✅ Subscription updated: ${data.id}`);
  } catch (error) {
    console.error('Error handling subscription.updated:', error);
  }
}

/**
 * Handle subscription.canceled event
 */
async function handleSubscriptionCanceled(data: any) {
  try {
    await prisma.subscription.updateMany({
      where: { paddleSubscriptionId: data.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      },
    });

    console.log(`✅ Subscription canceled: ${data.id}`);
  } catch (error) {
    console.error('Error handling subscription.canceled:', error);
  }
}

/**
 * Handle subscription.paused event
 */
async function handleSubscriptionPaused(data: any) {
  try {
    await prisma.subscription.updateMany({
      where: { paddleSubscriptionId: data.id },
      data: {
        status: SubscriptionStatus.PAUSED,
        pausedAt: new Date(),
      },
    });

    console.log(`✅ Subscription paused: ${data.id}`);
  } catch (error) {
    console.error('Error handling subscription.paused:', error);
  }
}

/**
 * Handle subscription.resumed event
 */
async function handleSubscriptionResumed(data: any) {
  try {
    await prisma.subscription.updateMany({
      where: { paddleSubscriptionId: data.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        pausedAt: null,
      },
    });

    console.log(`✅ Subscription resumed: ${data.id}`);
  } catch (error) {
    console.error('Error handling subscription.resumed:', error);
  }
}

/**
 * Handle transaction.completed event
 */
async function handleTransactionCompleted(data: any) {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { paddleSubscriptionId: data.subscription_id },
    });

    if (!subscription) {
      console.error(`No subscription found for transaction: ${data.id}`);
      return;
    }

    // Create payment record
    await prisma.payment.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        paddlePaymentId: data.payments?.[0]?.id || data.id,
        paddleTransactionId: data.id,
        amount: parseInt(data.details?.totals?.total || '0'),
        currency: data.currency_code || 'USD',
        status: PaymentStatus.SUCCEEDED,
        paymentMethod: data.payments?.[0]?.method_details?.type || 'unknown',
        paidAt: new Date(data.billed_at || data.created_at),
      },
    });

    console.log(`✅ Payment recorded for transaction: ${data.id}`);
  } catch (error) {
    console.error('Error handling transaction.completed:', error);
  }
}

/**
 * Handle transaction.payment_failed event
 */
async function handleTransactionFailed(data: any) {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { paddleSubscriptionId: data.subscription_id },
    });

    if (!subscription) {
      console.error(`No subscription found for failed transaction: ${data.id}`);
      return;
    }

    // Create failed payment record
    await prisma.payment.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        paddleTransactionId: data.id,
        amount: parseInt(data.details?.totals?.total || '0'),
        currency: data.currency_code || 'USD',
        status: PaymentStatus.FAILED,
        paymentMethod: data.payments?.[0]?.method_details?.type || 'unknown',
      },
    });

    console.log(`⚠️ Payment failed for transaction: ${data.id}`);
  } catch (error) {
    console.error('Error handling transaction.payment_failed:', error);
  }
}

/**
 * Map Paddle subscription status to our internal status
 */
function mapPaddleStatus(paddleStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    canceled: SubscriptionStatus.CANCELED,
    paused: SubscriptionStatus.PAUSED,
    past_due: SubscriptionStatus.PAST_DUE,
    trialing: SubscriptionStatus.TRIALING,
  };

  return statusMap[paddleStatus] || SubscriptionStatus.ACTIVE;
}

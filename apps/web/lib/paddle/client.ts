import { initializePaddle, Paddle } from '@paddle/paddle-js';

/**
 * Paddle Client SDK for frontend checkout and price preview
 */
let paddleInstance: Paddle | null = null;

export interface PaddleConfig {
  token: string;
  environment?: 'sandbox' | 'production';
  eventCallback?: (event: any) => void;
}

/**
 * Initialize Paddle.js on the client side
 */
export async function getPaddleInstance(config: PaddleConfig): Promise<Paddle> {
  if (paddleInstance) {
    return paddleInstance;
  }

  try {
    const instance = await initializePaddle({
      token: config.token,
      environment: config.environment || 'sandbox',
      eventCallback: config.eventCallback,
      pwCustomer: undefined,
    });

    if (!instance) {
      throw new Error('Failed to initialize Paddle');
    }

    paddleInstance = instance;
    return paddleInstance;
  } catch (error) {
    console.error('Error initializing Paddle:', error);
    throw error;
  }
}

/**
 * Open Paddle checkout overlay
 */
export async function openCheckout(
  paddle: Paddle,
  params: {
    items: Array<{ priceId: string; quantity?: number }>;
    customData?: Record<string, any>;
    customer?: {
      email?: string;
    };
    successUrl?: string;
  }
) {
  try {
    await paddle.Checkout.open({
      items: params.items.map((item) => ({
        priceId: item.priceId,
        quantity: item.quantity || 1,
      })),
      customData: params.customData,
      customer: params.customer?.email ? { email: params.customer.email } : undefined,
      settings: {
        successUrl: params.successUrl,
      },
    });
  } catch (error) {
    console.error('Error opening Paddle checkout:', error);
    throw error;
  }
}

/**
 * Get price preview on the client side with localized pricing
 */
export async function getPricePreview(
  paddle: Paddle,
  params: {
    items: Array<{ priceId: string; quantity?: number }>;
  }
) {
  try {
    const preview = await paddle.PricePreview({
      items: params.items.map((item) => ({
        priceId: item.priceId,
        quantity: item.quantity || 1,
      })),
    });
    return preview;
  } catch (error) {
    // Log full error object (not just message) so we can see Paddle error details
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      try {
        console.warn('Paddle PricePreview failed:', error);
      } catch {
        const message = (error as any)?.message || (error as any)?.error?.message || 'Unknown error';
        console.warn('Paddle PricePreview failed:', message);
      }
    }
    return null as any;
  }
}

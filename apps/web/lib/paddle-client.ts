'use client';

import { initializePaddle, Paddle, CurrencyCode } from '@paddle/paddle-js';

let paddleInstance: Paddle | undefined;

export interface PaddleConfig {
  environment?: 'sandbox' | 'production';
  token: string; // Client token from Paddle
  pwCustomer?: {
    email?: string;
    id?: string;
  };
  eventCallback?: (event: any) => void;
}

export async function getPaddleInstance(config: PaddleConfig): Promise<Paddle> {
  if (paddleInstance) {
    return paddleInstance;
  }

  const instance = await initializePaddle({
    environment: config.environment || 'sandbox',
    token: config.token,
    pwCustomer: config.pwCustomer,
    eventCallback: config.eventCallback,
  });

  if (!instance) {
    throw new Error('Failed to initialize Paddle');
  }

  paddleInstance = instance;
  return instance;
}

export class PaddleClient {
  private paddle: Paddle | null = null;

  async initialize(config: PaddleConfig) {
    this.paddle = await getPaddleInstance(config);
    return this.paddle;
  }

  /**
   * Open checkout overlay
   */
  async openCheckout(options: {
    items: Array<{
      priceId: string;
      quantity?: number;
    }>;
    customer?: {
      email?: string;
      id?: string;
    };
    customData?: Record<string, any>;
    successUrl?: string;
  }) {
    if (!this.paddle) {
      throw new Error('Paddle not initialized. Call initialize() first.');
    }

    // Fix customer type to match Paddle's expected format
    let customer: any = undefined;
    if (options.customer) {
      if (options.customer.email && !options.customer.id) {
        customer = { email: options.customer.email };
      } else if (options.customer.id && !options.customer.email) {
        customer = { id: options.customer.id };
      } else if (options.customer.email && options.customer.id) {
        customer = { id: options.customer.id };
      }
    }

    return this.paddle.Checkout.open({
      items: options.items.map(item => ({
        priceId: item.priceId,
        quantity: item.quantity || 1,
      })),
      customer,
      customData: options.customData,
      settings: {
        successUrl: options.successUrl,
      },
    });
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(options: {
    subscriptionId: string;
    transactionId: string;
  }) {
    if (!this.paddle) {
      throw new Error('Paddle not initialized. Call initialize() first.');
    }

    return this.paddle.Checkout.open({
      transactionId: options.transactionId,
    });
  }

  /**
   * Get price preview
   */
  async getPricePreview(options: {
    items: Array<{
      priceId: string;
      quantity?: number;
    }>;
    customerId?: string;
    address?: {
      countryCode: string;
      postalCode?: string;
    };
    currencyCode?: CurrencyCode; // fix: use Paddle's union type
  }) {
    if (!this.paddle) {
      throw new Error('Paddle not initialized. Call initialize() first.');
    }

    return this.paddle.PricePreview({
      items: options.items.map(item => ({
        priceId: item.priceId,
        quantity: item.quantity || 1,
      })),
      customerId: options.customerId,
      address: options.address,
      currencyCode: options.currencyCode,
    });
  }

  /**
   * Close any open checkout
   */
  closeCheckout() {
    if (this.paddle) {
      this.paddle.Checkout.close();
    }
  }

  /**
   * Get the Paddle instance
   */
  getInstance(): Paddle | null {
    return this.paddle;
  }
}

// Create a singleton instance
export const paddleClient = new PaddleClient();
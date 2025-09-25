'use client';

import { initializePaddle, Paddle } from '@paddle/paddle-js';

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

  paddleInstance = await initializePaddle({
    environment: config.environment || 'sandbox',
    token: config.token,
    pwCustomer: config.pwCustomer,
    eventCallback: config.eventCallback,
  });

  return paddleInstance;
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

    return this.paddle.Checkout.open({
      items: options.items.map(item => ({
        priceId: item.priceId,
        quantity: item.quantity || 1,
      })),
      customer: options.customer,
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
    currencyCode?: string;
  }) {
    if (!this.paddle) {
      throw new Error('Paddle not initialized. Call initialize() first.');
    }

    return this.paddle.PricePreview(options);
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
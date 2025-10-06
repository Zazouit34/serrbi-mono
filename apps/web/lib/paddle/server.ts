import { Paddle, Environment } from '@paddle/paddle-node-sdk';

/**
 * Paddle Server SDK Singleton
 * Handles all server-side Paddle API interactions
 */
let paddleInstance: Paddle | null = null;

export function getPaddleInstance(): Paddle {
  if (!paddleInstance) {
    if (!process.env.PADDLE_API_KEY) {
      throw new Error('PADDLE_API_KEY environment variable is required');
    }

    const environment = (process.env.PADDLE_ENVIRONMENT || 'sandbox') as Environment;
    
    paddleInstance = new Paddle(process.env.PADDLE_API_KEY, {
      environment,
    });
  }
  
  return paddleInstance;
}

/**
 * Service class for Paddle operations
 */
export class PaddleService {
  private static paddle = getPaddleInstance();

  /**
   * Get subscription details from Paddle
   */
  static async getSubscription(subscriptionId: string) {
    try {
      const subscription = await this.paddle.subscriptions.get(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error fetching subscription from Paddle:', error);
      throw error;
    }
  }

  /**
   * Create a new customer in Paddle
   */
  static async createCustomer(email: string, name?: string | null) {
    try {
      const customer = await this.paddle.customers.create({
        email,
        name: name || undefined,
      });
      return customer;
    } catch (error) {
      console.error('Error creating Paddle customer:', error);
      throw error;
    }
  }

  /**
   * Create a new subscription in Paddle
   * Note: Using Checkout.open() is the recommended approach for creating subscriptions
   * This method is kept for reference but may not work with current Paddle SDK
   */
  static async createSubscription(params: {
    customerId: string;
    items: Array<{ priceId: string; quantity: number }>;
    trialPeriod?: { frequency: number; interval: string };
  }) {
    // Creating subscriptions via API is deprecated
    // Use Paddle Checkout instead
    throw new Error('Use Paddle Checkout to create subscriptions. This method is not supported by the current SDK.');
  }

  /**
   * Update an existing subscription
   */
  static async updateSubscription(params: {
    subscriptionId: string;
    items: Array<{ priceId: string; quantity: number }>;
  }) {
    try {
      const subscription = await this.paddle.subscriptions.update(
        params.subscriptionId,
        {
          items: params.items,
          prorationBillingMode: 'prorated_immediately',
        }
      );
      return subscription;
    } catch (error) {
      console.error('Error updating subscription in Paddle:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(
    subscriptionId: string,
    effectiveFrom: 'immediately' | 'next_billing_period' = 'next_billing_period'
  ) {
    try {
      const subscription = await this.paddle.subscriptions.cancel(
        subscriptionId,
        {
          effectiveFrom: 'immediately',
        }
      );
      return subscription;
    } catch (error) {
      console.error('Error canceling subscription in Paddle:', error);
      throw error;
    }
  }

  /**
   * Pause a subscription
   */
  static async pauseSubscription(subscriptionId: string) {
    try {
      const subscription = await this.paddle.subscriptions.pause(
        subscriptionId,
        {
          effectiveFrom: 'immediately',
        }
      );
      return subscription;
    } catch (error) {
      console.error('Error pausing subscription in Paddle:', error);
      throw error;
    }
  }

  /**
   * Resume a paused subscription
   */
  static async resumeSubscription(subscriptionId: string) {
    try {
      const subscription = await this.paddle.subscriptions.resume(
        subscriptionId,
        {
          effectiveFrom: 'immediately',
        }
      );
      return subscription;
    } catch (error) {
      console.error('Error resuming subscription in Paddle:', error);
      throw error;
    }
  }

  /**
   * Get price preview with localized pricing and taxes
   * Note: Use client-side PricePreview() method instead for better performance
   */
  static async getPricePreview(params: {
    priceIds: string[];
    customerIpAddress?: string;
    address?: {
      countryCode: string;
      postalCode?: string;
    };
  }) {
    // Price preview should be done client-side using Paddle.js
    // This method is kept for reference
    throw new Error('Use client-side Paddle.PricePreview() method instead.');
  }
}

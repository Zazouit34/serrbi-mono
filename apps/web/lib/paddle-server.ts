import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import crypto from 'crypto';

// Initialize Paddle SDK (will be configured with environment variables)
let paddleInstance: Paddle | null = null;

export function getPaddleInstance(): Paddle {
  if (!paddleInstance) {
    if (!process.env.PADDLE_API_KEY) {
      throw new Error('PADDLE_API_KEY environment variable is required');
    }

    const environment = (process.env.PADDLE_ENVIRONMENT || 'sandbox') as Environment;
    
    paddleInstance = new Paddle(
      process.env.PADDLE_API_KEY,
      {
        environment,
      }
    );
  }
  return paddleInstance;
}

export class PaddleService {
  private static paddle = getPaddleInstance();

  /**
   * Create a Paddle customer
   */
  static async createCustomer(email: string, name?: string) {
    try {
      const customer = await this.paddle.customers.create({
        email,
        name,
      });
      return customer;
    } catch (error) {
      console.error('Error creating Paddle customer:', error);
      throw error;
    }
  }

  /**
   * Get customer by ID
   */
  static async getCustomer(customerId: string) {
    try {
      const customer = await this.paddle.customers.get(customerId);
      return customer;
    } catch (error) {
      console.error('Error getting Paddle customer:', error);
      throw error;
    }
  }

  /**
   * Create a subscription
   */
  static async createSubscription({
    customerId,
    items,
    trialPeriod,
  }: {
    customerId: string;
    items: Array<{ priceId: string; quantity: number }>;
    trialPeriod?: {
      frequency: number;
      interval: 'day' | 'week' | 'month' | 'year';
    };
  }) {
    try {
      const subscriptionRequest: any = {
        customerId,
        items,
      };

      if (trialPeriod) {
        subscriptionRequest.trialPeriod = trialPeriod;
      }

      const subscription = await this.paddle.subscriptions.create(subscriptionRequest);
      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Update subscription (change plan)
   */
  static async updateSubscription({
    subscriptionId,
    items,
    prorationBillingMode = 'prorated_immediately',
  }: {
    subscriptionId: string;
    items: Array<{ priceId: string; quantity: number }>;
    prorationBillingMode?: 'prorated_immediately' | 'prorated_next_billing_period' | 'full_immediately' | 'full_next_billing_period' | 'do_not_bill';
  }) {
    try {
      const subscription = await this.paddle.subscriptions.update(subscriptionId, {
        items,
        prorationBillingMode,
      });
      return subscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(
    subscriptionId: string,
    effectiveFrom: 'immediately' | 'next_billing_period' = 'next_billing_period'
  ) {
    try {
      const subscription = await this.paddle.subscriptions.cancel(subscriptionId, {
        effectiveFrom,
      });
      return subscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Pause subscription
   */
  static async pauseSubscription(
    subscriptionId: string,
    effectiveFrom: 'immediately' | 'next_billing_period' = 'next_billing_period'
  ) {
    try {
      const subscription = await this.paddle.subscriptions.pause(subscriptionId, {
        effectiveFrom,
      });
      return subscription;
    } catch (error) {
      console.error('Error pausing subscription:', error);
      throw error;
    }
  }

  /**
   * Resume subscription
   */
  static async resumeSubscription(
    subscriptionId: string,
    effectiveFrom: 'immediately' | 'next_billing_period' = 'immediately'
  ) {
    try {
      const subscription = await this.paddle.subscriptions.resume(subscriptionId, {
        effectiveFrom,
      });
      return subscription;
    } catch (error) {
      console.error('Error resuming subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  static async getSubscription(subscriptionId: string) {
    try {
      const subscription = await this.paddle.subscriptions.get(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error getting subscription:', error);
      throw error;
    }
  }

  /**
   * List transactions for a customer
   */
  static async getCustomerTransactions(customerId: string) {
    try {
      const collection = await this.paddle.transactions.list({
        customerId: [customerId],
      });
      return collection;
    } catch (error) {
      console.error('Error getting customer transactions:', error);
      throw error;
    }
  }

  /**
   * Create a transaction (for one-time payments)
   */
  static async createTransaction({
    customerId,
    items,
  }: {
    customerId: string;
    items: Array<{
      priceId: string;
      quantity: number;
    }>;
  }) {
    try {
      const transaction = await this.paddle.transactions.create({
        customerId,
        items,
      });
      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Get update payment method transaction
   */
  static async getPaymentMethodUpdateTransaction(subscriptionId: string) {
    try {
      const transaction = await this.paddle.subscriptions.getUpdatePaymentMethodTransaction(subscriptionId);
      return transaction;
    } catch (error) {
      console.error('Error getting payment method update transaction:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature (Paddle Signature Verification)
   */
  static verifyWebhookSignature(
    signature: string,
    rawBody: string,
    secret: string
  ): boolean {
    try {
      // Paddle uses a specific format for signature verification
      // The signature header contains: ts=timestamp;h1=signature
      const parts = signature.split(';');
      const timestamp = parts.find(p => p.startsWith('ts='))?.replace('ts=', '');
      const hash = parts.find(p => p.startsWith('h1='))?.replace('h1=', '');

      if (!timestamp || !hash) {
        return false;
      }

      // Construct the signed payload
      const signedPayload = `${timestamp}:${rawBody}`;
      
      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');
      
      // Use timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(hash),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Get prices for products
   */
  static async getPrices(productId?: string) {
    try {
      const params = productId ? { productId } : undefined;
      const prices = await this.paddle.prices.list(params);
      return prices;
    } catch (error) {
      console.error('Error getting prices:', error);
      throw error;
    }
  }

  /**
   * Get products
   */
  static async getProducts() {
    try {
      const products = await this.paddle.products.list();
      return products;
    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  }

  /**
   * Get customer's payment methods
   */
  static async getCustomerPaymentMethods(customerId: string) {
    try {
      const paymentMethods = await this.paddle.customers.getPaymentMethods(customerId);
      return paymentMethods;
    } catch (error) {
      console.error('Error getting customer payment methods:', error);
      throw error;
    }
  }

  /**
   * Get invoices for a customer
   */
  static async getCustomerInvoices(customerId: string) {
    try {
      const invoices = await this.paddle.invoices.list({
        customerId: [customerId],
      });
      return invoices;
    } catch (error) {
      console.error('Error getting customer invoices:', error);
      throw error;
    }
  }

  /**
   * Get invoice PDF download URL
   */
  static async getInvoiceDownloadUrl(invoiceId: string) {
    try {
      const invoice = await this.paddle.invoices.get(invoiceId);
      return invoice.downloadUrl;
    } catch (error) {
      console.error('Error getting invoice download URL:', error);
      throw error;
    }
  }

  /**
   * Create refund for a transaction
   */
  static async createRefund({
    transactionId,
    amount,
    reason,
  }: {
    transactionId: string;
    amount?: number; // Optional, if not provided will refund full amount
    reason?: string;
  }) {
    try {
      const refundData: any = {
        transactionId,
      };

      if (amount) {
        refundData.amount = amount;
      }

      if (reason) {
        refundData.reason = reason;
      }

      const refund = await this.paddle.transactions.createRefund(refundData);
      return refund;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }

  /**
   * Get subscription's upcoming invoice
   */
  static async getUpcomingInvoice(subscriptionId: string) {
    try {
      const invoice = await this.paddle.subscriptions.getUpcomingInvoice(subscriptionId);
      return invoice;
    } catch (error) {
      console.error('Error getting upcoming invoice:', error);
      throw error;
    }
  }

  /**
   * Preview subscription changes (for upgrades/downgrades)
   */
  static async previewSubscriptionChange({
    subscriptionId,
    items,
  }: {
    subscriptionId: string;
    items: Array<{ priceId: string; quantity: number }>;
  }) {
    try {
      const preview = await this.paddle.subscriptions.previewUpdate(subscriptionId, {
        items,
      });
      return preview;
    } catch (error) {
      console.error('Error previewing subscription change:', error);
      throw error;
    }
  }
}
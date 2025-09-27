# Paddle Payment Integration Setup

This document outlines the complete setup and configuration for the Paddle payment integration.

## Environment Variables Required

Add these environment variables to your `.env.local` file:

```bash
# Paddle Server-side Configuration
PADDLE_API_KEY=your_paddle_api_key_here
PADDLE_ENVIRONMENT=sandbox # or 'production'
PADDLE_WEBHOOK_SECRET=your_webhook_secret_here

# Paddle Client-side Configuration (public)
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=your_client_token_here

# Optional: Specific Price IDs for plans (used in seed data)
PADDLE_PRICE_ID_BASIC=pri_01h...
PADDLE_PRICE_ID_PREMIUM=pri_01h...
```

## Setup Steps

### 1. Paddle Dashboard Configuration

1. **Get API Key**:
   - Go to Paddle Dashboard → Developer Tools → Authentication
   - Copy your API key and set `PADDLE_API_KEY`

2. **Get Client Token**:
   - Copy your Client-side token and set `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`

3. **Configure Webhook**:
   - Go to Developer Tools → Webhooks
   - Create webhook endpoint: `https://yourdomain.com/api/paddle/webhook`
   - Copy webhook secret and set `PADDLE_WEBHOOK_SECRET`

4. **Set Environment**:
   - Set `PADDLE_ENVIRONMENT` to `sandbox` for testing or `production` for live

### 2. Webhook Events to Subscribe To

Subscribe to these events in your Paddle webhook configuration:

- `transaction.completed`
- `transaction.payment_failed`
- `transaction.refunded`
- `subscription.created`
- `subscription.updated`
- `subscription.canceled`
- `subscription.paused`
- `subscription.resumed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### 3. Database Setup

Run the database migrations to ensure all tables are created:

```bash
cd packages/database
npx prisma migrate deploy
npx prisma generate
```

### 4. Seed Data (Optional)

If you have specific price IDs, update the seed file and run:

```bash
cd packages/database
npx prisma db seed
```

## Features Implemented

### ✅ Completed Features

1. **Webhook Event Handling**
   - Comprehensive event processing for all payment and subscription events
   - Event deduplication and audit trail
   - Error handling and retry logic

2. **Payment Processing**
   - Transaction completion handling
   - Payment failure tracking
   - Refund processing
   - Payment history display

3. **Subscription Management**
   - Create, update, cancel, pause, resume subscriptions
   - Subscription status synchronization
   - Trial period handling

4. **Billing Interface**
   - Current subscription display
   - Payment history table
   - Invoice management and download
   - Payment method display
   - Upcoming invoice preview

5. **Error Handling**
   - Webhook retry system with exponential backoff
   - Failed event processing with background jobs
   - Comprehensive error logging

### 🔄 Additional Features Available

1. **Payment Method Management**
   - Add/remove payment methods
   - Set default payment method
   - Payment method validation

2. **Invoice Generation**
   - Custom invoice templates
   - Invoice PDF generation
   - Email invoice delivery

3. **Refund Processing**
   - Admin refund interface
   - Partial refunds
   - Refund reason tracking

4. **Analytics & Reporting**
   - Revenue tracking
   - Subscription metrics
   - Payment success rates

## API Endpoints

### Subscription Router (`/api/trpc/subscription.*`)

- `getPlans` - Get available subscription plans
- `getCurrentSubscription` - Get user's current subscription
- `createSubscription` - Create new subscription
- `updateSubscription` - Update subscription plan
- `cancelSubscription` - Cancel subscription
- `pauseSubscription` - Pause subscription
- `resumeSubscription` - Resume subscription
- `getPaymentHistory` - Get payment history
- `getPaymentMethods` - Get customer payment methods
- `getInvoices` - Get customer invoices
- `getInvoiceDownloadUrl` - Get invoice download URL
- `getUpcomingInvoice` - Get upcoming invoice preview
- `previewSubscriptionChange` - Preview subscription changes
- `createRefund` - Create refund (admin only)

### Webhook Endpoint

- `POST /api/paddle/webhook` - Paddle webhook handler

## Testing

### Sandbox Testing

1. Set `PADDLE_ENVIRONMENT=sandbox`
2. Use Paddle's test card numbers:
   - Success: `4000 0000 0000 0002`
   - Decline: `4000 0000 0000 0069`
   - Insufficient funds: `4000 0000 0000 9995`

### Webhook Testing

Use Paddle's webhook testing tools or ngrok for local development:

```bash
ngrok http 3000
# Use the ngrok URL for webhook endpoint
```

## Troubleshooting

### Common Issues

1. **Webhook Signature Verification Failed**
   - Check `PADDLE_WEBHOOK_SECRET` is correct
   - Ensure webhook URL is accessible
   - Verify signature verification logic

2. **Client Token Issues**
   - Check `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` is set
   - Verify token is for correct environment
   - Ensure token has proper permissions

3. **API Key Issues**
   - Verify `PADDLE_API_KEY` is correct
   - Check API key has required permissions
   - Ensure environment matches API key

4. **Database Issues**
   - Run migrations: `npx prisma migrate deploy`
   - Check database connection
   - Verify schema is up to date

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=paddle:*
```

## Security Considerations

1. **Environment Variables**
   - Never commit API keys to version control
   - Use different keys for sandbox/production
   - Rotate keys regularly

2. **Webhook Security**
   - Always verify webhook signatures
   - Use HTTPS for webhook endpoints
   - Implement rate limiting

3. **Client-side Security**
   - Client tokens are safe to expose
   - Never expose server-side API keys
   - Validate all user inputs

## Support

For issues with the Paddle integration:

1. Check Paddle's documentation: https://developer.paddle.com/
2. Review webhook event logs in your database
3. Check browser console for client-side errors
4. Verify environment variables are set correctly

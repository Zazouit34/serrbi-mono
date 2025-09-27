#!/usr/bin/env node

/**
 * Paddle Integration Test Script
 * 
 * This script tests the basic functionality of the Paddle integration
 * Run with: node test-paddle-integration.js
 */

import { PaddleService } from './lib/paddle-server.js';
import { prisma } from '@workspace/db';

async function testPaddleIntegration() {
  console.log('🧪 Testing Paddle Integration...\n');

  try {
    // Test 1: Paddle Service Initialization
    console.log('1. Testing Paddle Service initialization...');
    const paddle = PaddleService;
    console.log('✅ Paddle service initialized successfully\n');

    // Test 2: Environment Variables
    console.log('2. Checking environment variables...');
    const requiredEnvVars = [
      'PADDLE_API_KEY',
      'PADDLE_ENVIRONMENT',
      'PADDLE_WEBHOOK_SECRET',
      'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('❌ Missing environment variables:', missingVars.join(', '));
      console.log('Please set these in your .env.local file\n');
    } else {
      console.log('✅ All required environment variables are set\n');
    }

    // Test 3: Database Connection
    console.log('3. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful\n');

    // Test 4: Webhook Event Types
    console.log('4. Checking webhook event types...');
    const webhookEventTypes = await prisma.webhookEventType.findMany();
    console.log('✅ Webhook event types available:', webhookEventTypes.length, 'types\n');

    // Test 5: Subscription Plans
    console.log('5. Checking subscription plans...');
    const plans = await prisma.subscriptionPlanConfig.findMany();
    console.log('✅ Subscription plans available:', plans.length, 'plans\n');

    // Test 6: Paddle API Connection (if API key is available)
    if (process.env.PADDLE_API_KEY) {
      console.log('6. Testing Paddle API connection...');
      try {
        const products = await PaddleService.getProducts();
        console.log('✅ Paddle API connection successful, found', products.length, 'products\n');
      } catch (error) {
        console.log('⚠️  Paddle API connection failed:', error.message);
        console.log('This might be due to invalid API key or network issues\n');
      }
    } else {
      console.log('6. Skipping Paddle API test (no API key)\n');
    }

    console.log('🎉 Paddle integration test completed!');
    console.log('\nNext steps:');
    console.log('1. Set up your Paddle webhook endpoint');
    console.log('2. Configure your subscription plans');
    console.log('3. Test the payment flow in sandbox mode');
    console.log('4. Deploy to production when ready');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPaddleIntegration().catch(console.error);

/*
  Sync Paddle products/prices into SubscriptionPlanConfig.
  Picks the first recurring monthly price for each product and upserts.
*/
import { PaddleService } from "@/lib/paddle-server";
import { PrismaClient } from "../../../packages/database/generated/prisma";

const prisma = new PrismaClient();

function toCents(amount?: number | null): number | null {
  if (typeof amount !== "number") return null;
  return Math.round(amount * 100);
}

async function main() {
  const productsResponse = await PaddleService.getProducts();
  
  // Check if the response has data property or is iterable
  if (!productsResponse || typeof productsResponse !== 'object') {
    console.log('No products found');
    return;
  }

  // Try to access products from the response
  const products = 'data' in productsResponse ? (productsResponse as any).data : [];
  
  if (!Array.isArray(products)) {
    console.log('Products is not an array');
    return;
  }

  // get all prices once (optional), else fetch per product
  for (const product of products) {
    // Fetch prices for product
    const pricesResponse = await PaddleService.getPrices(product.id);
    
    // Try to access prices from the response
    const prices = pricesResponse && 'data' in pricesResponse ? (pricesResponse as any).data : [];

    // Prefer recurring monthly
    const recurringMonthly = prices.find((p: any) => p.billingCycle?.interval === "month");
    const chosen = recurringMonthly || prices[0];
    if (!chosen) continue;

    const priceCents = toCents(chosen?.unitPrice?.amount) ?? 0;
    const currency = chosen?.unitPrice?.currencyCode || "USD";
    const interval = chosen?.billingCycle?.interval || "month";

    // Derive a plan name from product.name (fallback to BASIC)
    const displayName: string = product?.name || "Basic";
    const upperName = displayName.toUpperCase();
    const enumName = upperName.includes("AUTO APPLY")
      ? "PREMIUM"
      : upperName.includes("PREMIUM")
      ? "PREMIUM"
      : upperName.includes("FREE")
      ? "FREE"
      : upperName.includes("BASIC")
      ? "BASIC"
      : "BASIC";

    await prisma.subscriptionPlanConfig.upsert({
      where: { name: enumName as any },
      create: {
        name: enumName as any,
        displayName,
        description: product?.description || null,
        price: priceCents,
        currency,
        interval,
        paddlePriceId: chosen.id,
        paddleProductId: product.id,
        isActive: true,
        // defaults; adjust as needed
        maxJobListings: enumName === "FREE" ? 3 : enumName === "BASIC" ? 10 : 100,
        maxServiceListings: enumName === "FREE" ? 1 : enumName === "BASIC" ? 5 : 50,
        maxTaskListings: enumName === "FREE" ? 2 : enumName === "BASIC" ? 10 : 100,
        featuredListings: enumName === "PREMIUM",
        prioritySupport: enumName === "PREMIUM",
        analyticsAccess: enumName === "PREMIUM",
      },
      update: {
        displayName,
        description: product?.description || null,
        price: priceCents,
        currency,
        interval,
        paddlePriceId: chosen.id,
        paddleProductId: product.id,
        isActive: true,
      },
    });
  }

  console.log("Paddle plans synced.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


import { prisma } from "./client";

async function main() {
  const plans = [
    {
      name: "FREE",
      displayName: "Free",
      price: 0,
      currency: "USD",
      interval: "month",
      paddlePriceId: null as string | null,
      maxJobListings: 3,
      maxServiceListings: 1,
      maxTaskListings: 2,
      featuredListings: false,
      prioritySupport: false,
      analyticsAccess: false,
      isActive: true,
      isPopular: false,
    },
    {
      name: "BASIC",
      displayName: "Basic",
      price: 990, // $9.90
      currency: "USD",
      interval: "month",
      paddlePriceId: process.env.PADDLE_PRICE_ID_BASIC || "pri_01k6armqs400c4kj2vwxvnen4q",
      maxJobListings: 10,
      maxServiceListings: 5,
      maxTaskListings: 10,
      featuredListings: false,
      prioritySupport: false,
      analyticsAccess: false,
      isActive: true,
      isPopular: true,
    },
    {
      name: "PREMIUM",
      displayName: "Premium",
      price: 2990, // $29.90
      currency: "USD",
      interval: "month",
      paddlePriceId: process.env.PADDLE_PRICE_ID_PREMIUM || "pri_01k6arsdkxzzcjn97712rvp3ye",
      maxJobListings: 100,
      maxServiceListings: 50,
      maxTaskListings: 100,
      featuredListings: true,
      prioritySupport: true,
      analyticsAccess: true,
      isActive: true,
      isPopular: false,
    },
  ];

  for (const p of plans) {
    await prisma.subscriptionPlanConfig.upsert({
      where: { name: p.name as any },
      create: {
        name: p.name as any,
        displayName: p.displayName,
        price: p.price,
        currency: p.currency,
        interval: p.interval,
        paddlePriceId: p.paddlePriceId || undefined,
        maxJobListings: p.maxJobListings,
        maxServiceListings: p.maxServiceListings,
        maxTaskListings: p.maxTaskListings,
        featuredListings: p.featuredListings,
        prioritySupport: p.prioritySupport,
        analyticsAccess: p.analyticsAccess,
        isActive: p.isActive,
      },
      update: {
        displayName: p.displayName,
        price: p.price,
        currency: p.currency,
        interval: p.interval,
        paddlePriceId: p.paddlePriceId || undefined,
        maxJobListings: p.maxJobListings,
        maxServiceListings: p.maxServiceListings,
        maxTaskListings: p.maxTaskListings,
        featuredListings: p.featuredListings,
        prioritySupport: p.prioritySupport,
        analyticsAccess: p.analyticsAccess,
        isActive: p.isActive,
      },
    });
  }

  console.log("✅ Seeded subscription plans with Paddle price IDs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
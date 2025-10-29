import { prisma } from "./client";


async function main() {
  console.log("🌱 Starting database seeding...");


  // Subscription plans
  const plans = [
    {
      name: "FREE",
      displayName: "Free",
      price: 0,
      currency: "USD",
      interval: "month",
      paddlePriceId: null as string | null,
      // application-based features
      monthlyApplyLimit: null,
      autoApplyMonthlyLimit: null,
      jobBoardAccess: true,
      smartMatchAccess: false,
      resumeAtsScoreAccess: true,
      autoApplyAccess: false,
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
      monthlyApplyLimit: null,
      autoApplyMonthlyLimit: 100,
      jobBoardAccess: true,
      smartMatchAccess: true,
      resumeAtsScoreAccess: true,
      autoApplyAccess: true,
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
      monthlyApplyLimit: null,
      autoApplyMonthlyLimit: 300,
      jobBoardAccess: true,
      smartMatchAccess: true,
      resumeAtsScoreAccess: true,
      autoApplyAccess: true,
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
        monthlyApplyLimit: (p as any).monthlyApplyLimit ?? null,
        autoApplyMonthlyLimit: (p as any).autoApplyMonthlyLimit ?? null,
        jobBoardAccess: (p as any).jobBoardAccess ?? true,
        smartMatchAccess: (p as any).smartMatchAccess ?? false,
        resumeAtsScoreAccess: (p as any).resumeAtsScoreAccess ?? true,
        autoApplyAccess: (p as any).autoApplyAccess ?? false,
        isActive: p.isActive,
      },
      update: {
        displayName: p.displayName,
        price: p.price,
        currency: p.currency,
        interval: p.interval,
        paddlePriceId: p.paddlePriceId || undefined,
        monthlyApplyLimit: (p as any).monthlyApplyLimit ?? null,
        autoApplyMonthlyLimit: (p as any).autoApplyMonthlyLimit ?? null,
        jobBoardAccess: (p as any).jobBoardAccess ?? true,
        smartMatchAccess: (p as any).smartMatchAccess ?? false,
        resumeAtsScoreAccess: (p as any).resumeAtsScoreAccess ?? true,
        autoApplyAccess: (p as any).autoApplyAccess ?? false,
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
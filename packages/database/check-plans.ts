import { PrismaClient } from "./generated/prisma";

const prisma = new PrismaClient();

async function checkPlans() {
  console.log("Checking subscription plans...\n");
  
  const plans = await prisma.subscriptionPlanConfig.findMany({
    orderBy: { price: 'asc' }
  });

  plans.forEach(plan => {
    console.log(`📋 ${plan.displayName} (${plan.name})`);
    console.log(`   Price: $${(plan.price / 100).toFixed(2)}/${plan.interval}`);
    console.log(`   Paddle Price ID: ${plan.paddlePriceId || '❌ Not set'}`);
    console.log(`   Status: ${plan.isActive ? '✅ Active' : '❌ Inactive'}`);
    console.log('');
  });

  const paidPlansWithoutPriceId = plans.filter(p => p.price > 0 && !p.paddlePriceId);
  
  if (paidPlansWithoutPriceId.length > 0) {
    console.log('⚠️  Warning: Some paid plans are missing Paddle price IDs:');
    paidPlansWithoutPriceId.forEach(plan => {
      console.log(`   - ${plan.displayName}`);
    });
  } else {
    console.log('✅ All paid plans have Paddle price IDs configured!');
  }
}

checkPlans()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

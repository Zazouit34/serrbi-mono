import { PrismaClient } from "./generated/prisma";

const prisma = new PrismaClient();

async function updatePlansWithPriceIds() {
  console.log("Updating subscription plans with Paddle price IDs...\n");

  try {
    // Update Basic plan
    const basicPlan = await prisma.subscriptionPlanConfig.update({
      where: { name: "BASIC" },
      data: {
        paddlePriceId: "pri_01k5xsmx8wzxee6faz8v3bvhtn",
      },
    });
    console.log(`✅ Updated Basic plan: ${basicPlan.displayName}`);

    // Update Premium plan
    const premiumPlan = await prisma.subscriptionPlanConfig.update({
      where: { name: "PREMIUM" },
      data: {
        paddlePriceId: "pri_01k65p74m9sprdcbh8pwfekp27",
      },
    });
    console.log(`✅ Updated Premium plan: ${premiumPlan.displayName}`);

    console.log("\n🎉 All paid plans now have Paddle price IDs configured!");
    console.log("You can now test the subscription flow.");
  } catch (error) {
    console.error("Error updating plans:", error);
  }
}

updatePlansWithPriceIds()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

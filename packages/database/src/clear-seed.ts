import { prisma } from "./client";

async function main() {
  console.log("🗑️  Starting database cleanup...");

  try {
    // Delete in correct order to avoid foreign key constraints
    console.log("Deleting job applications...");
    const jobAppsDeleted = await prisma.jobApplication.deleteMany({});
    console.log(`✅ Deleted ${jobAppsDeleted.count} job applications`);

    console.log("Deleting service bookings...");
    const serviceBookingsDeleted = await prisma.serviceBooking.deleteMany({});
    console.log(`✅ Deleted ${serviceBookingsDeleted.count} service bookings`);

    console.log("Deleting favorites...");
    const favoritesDeleted = await prisma.favorite.deleteMany({});
    console.log(`✅ Deleted ${favoritesDeleted.count} favorites`);

    console.log("Deleting jobs...");
    const jobsDeleted = await prisma.job.deleteMany({});
    console.log(`✅ Deleted ${jobsDeleted.count} jobs`);

    console.log("Deleting services...");
    const servicesDeleted = await prisma.service.deleteMany({});
    console.log(`✅ Deleted ${servicesDeleted.count} services`);

    console.log("Deleting tasks...");
    const tasksDeleted = await prisma.task.deleteMany({});
    console.log(`✅ Deleted ${tasksDeleted.count} tasks`);

    console.log("Deleting proposals...");
    const proposalsDeleted = await prisma.proposal.deleteMany({});
    console.log(`✅ Deleted ${proposalsDeleted.count} proposals`);

    // Delete test users (by email pattern)
    console.log("Deleting test users...");
    const testUsersDeleted = await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "john.doe@example.com",
            "jane.smith@example.com", 
            "mike.johnson@example.com"
          ]
        }
      }
    });
    console.log(`✅ Deleted ${testUsersDeleted.count} test users`);

    console.log("\n🎉 Database cleanup completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   • Job Applications: ${jobAppsDeleted.count}`);
    console.log(`   • Service Bookings: ${serviceBookingsDeleted.count}`);
    console.log(`   • Favorites: ${favoritesDeleted.count}`);
    console.log(`   • Jobs: ${jobsDeleted.count}`);
    console.log(`   • Services: ${servicesDeleted.count}`);
    console.log(`   • Tasks: ${tasksDeleted.count}`);
    console.log(`   • Proposals: ${proposalsDeleted.count}`);
    console.log(`   • Test Users: ${testUsersDeleted.count}`);

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

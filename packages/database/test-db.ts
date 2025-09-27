import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing database connection...');
    
    // Try to create a simple table first
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)`;
    console.log('Test table created');
    
    // Insert test data
    await prisma.$executeRaw`INSERT INTO test (name) VALUES ('hello')`;
    console.log('Test data inserted');
    
    // Query test data
    const result = await prisma.$queryRaw`SELECT * FROM test`;
    console.log('Test query result:', result);
    
    // Now try the subscription plans
    const plans = await prisma.subscriptionPlanConfig.findMany();
    console.log('Plans found:', plans.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();

const { PrismaClient } = require('./packages/backend/src/generated/client/index.js');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing connection to Supabase...');
    const count = await prisma.product.count();
    console.log('Connection successful! Product count:', count);
  } catch (e) {
    console.error('Connection failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'salihielmehdi2019@gmail.com' } });
  if (user) {
    console.log('User Found:', { email: user.email, isVerified: user.isVerified });
  } else {
    console.log('User not found');
  }
  await prisma.$disconnect();
}

main();

import { PrismaClient } from './src/generated/client/index.js';
const prisma = new PrismaClient();

async function main() {
    // Attempt to update existing admin user
    const updated = await prisma.user.updateMany({
        where: { email: 'admin@mohasib.com' },
        data: { email: 'admin@mohassibe.com' }
    });

    console.log(`Updated ${updated.count} users.`);

    // Log the current DB users.
    const users = await prisma.user.findMany();
    console.log('Current DB Users:', users.map(u => ({ email: u.email, role: u.role })));

    await prisma.$disconnect();
}

main().catch(console.error);

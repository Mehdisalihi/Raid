import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
    try {
        console.log('Finding test users to delete...');
        
        const deleted = await prisma.user.deleteMany({
            where: {
                OR: [
                    { email: { startsWith: 'test_' } },
                    { email: { endsWith: '@example.com' } },
                    { email: { contains: 'test' } }
                ]
            }
        });
        
        console.log(`Successfully deleted ${deleted.count} dummy/test users from database.`);
    } catch (e) {
        console.error('Failed to cleanup users:', e);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();

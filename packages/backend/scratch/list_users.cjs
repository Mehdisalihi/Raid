const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
            id: true,
            name: true,
            email: true,
            verificationCode: true,
            isVerified: true,
            createdAt: true
        }
    });
    console.log(JSON.stringify(users, null, 2));
    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

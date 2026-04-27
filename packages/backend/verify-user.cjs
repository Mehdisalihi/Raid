const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.user.update({
            where: { email: 'salihielmehdi2019@gmail.com' },
            data: { isVerified: true }
        });
        console.log('User salihielmehdi2019@gmail.com has been verified!');
    } catch (error) {
        console.error('Error verifying user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    console.log(users);
    
    // Hard delete all test emails found in output
    for (const u of users) {
        if (u.email.includes('test') || u.email.includes('example.com')) {
           await prisma.user.delete({ where: { id: u.id } });
           console.log(`Deleted ${u.email}`);
        }
    }
}
run();

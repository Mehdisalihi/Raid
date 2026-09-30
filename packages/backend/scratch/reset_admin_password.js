import { PrismaClient } from '../src/generated/client/index.js';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash('password123', 12);
    
    // Update admin user to set password and ensure verification
    const result = await prisma.user.update({
        where: { email: 'admin@mohassibe.com' },
        data: {
            passwordHash,
            isVerified: true
        }
    });

    console.log('Admin user updated:', result.email, 'isVerified:', result.isVerified);
    await prisma.$disconnect();
}

main().catch(console.error);

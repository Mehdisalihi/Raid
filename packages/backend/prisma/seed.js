import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash('admin123', 12);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@raid.com' },
        update: { passwordHash: passwordHash, isVerified: true, isActive: true },
        create: {
            email: 'admin@raid.com',
            name: 'Admin Raid',
            passwordHash: passwordHash,
            role: 'ADMIN',
            isVerified: true,
            isActive: true,
            canAccessSales: true,
            canCreateInvoices: true,
            canManageInventory: true,
            canViewReports: true,
            canManageCustomers: true,
            canManageExpenses: true,
            canAccessSettings: true,
        },
    });

    console.log({ admin });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

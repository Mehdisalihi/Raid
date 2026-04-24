import { PrismaClient } from './src/generated/client/index.js';
const prisma = new PrismaClient();

async function check() {
    try {
        const customers = await prisma.customer.findMany();
        console.log('Customers found:', customers.length);
        customers.forEach(c => {
            console.log(`- ${c.name}: Balance = ${c.balance}`);
        });

        const invoices = await prisma.invoice.findMany({
            where: { type: 'SALE' },
            include: { customer: true }
        });
        console.log('\nSale Invoices:', invoices.length);
        invoices.forEach(i => {
            console.log(`- Inv ${i.invoiceNo}: Customer=${i.customer?.name}, Amount=${i.finalAmount}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();

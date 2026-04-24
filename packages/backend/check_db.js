
import { PrismaClient } from './src/generated/client/index.js';
const prisma = new PrismaClient();

async function main() {
    const counts = {
        products: await prisma.product.count(),
        customers: await prisma.customer.count(),
        suppliers: await prisma.supplier.count(),
        invoices: await prisma.invoice.count(),
        expenses: await prisma.expense.count(),
        saleItems: await prisma.saleItem.count(),
    };
    console.log(JSON.stringify(counts, null, 2));
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});

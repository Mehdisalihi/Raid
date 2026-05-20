const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const productCount = await prisma.product.count();
    const customerCount = await prisma.customer.count();
    const supplierCount = await prisma.supplier.count();
    const invoiceCount = await prisma.invoice.count();
    const userCount = await prisma.user.count();

    console.log({
        productCount,
        customerCount,
        supplierCount,
        invoiceCount,
        userCount
    });
}

main().finally(() => prisma.$disconnect());

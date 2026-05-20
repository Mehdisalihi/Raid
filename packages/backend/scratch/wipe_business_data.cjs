const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting data wipe...');

    // Order matters because of foreign key constraints
    try { await prisma.saleItem.deleteMany(); } catch(e) { console.log('saleItem skip'); }
    try { await prisma.invoice.deleteMany(); } catch(e) { console.log('invoice skip'); }
    try { await prisma.salaryTransaction.deleteMany(); } catch(e) { console.log('salaryTransaction skip'); }
    try { await prisma.staff.deleteMany(); } catch(e) { console.log('staff skip'); }
    try { await prisma.warehouseInventory.deleteMany(); } catch(e) { console.log('warehouseInventory skip'); }
    try { await prisma.stockMovement.deleteMany(); } catch(e) { console.log('stockMovement skip'); }
    try { await prisma.product.deleteMany(); } catch(e) { console.log('product skip'); }
    try { await prisma.warehouse.deleteMany(); } catch(e) { console.log('warehouse skip'); }
    try { await prisma.customer.deleteMany(); } catch(e) { console.log('customer skip'); }
    try { await prisma.supplier.deleteMany(); } catch(e) { console.log('supplier skip'); }
    try { await prisma.expense.deleteMany(); } catch(e) { console.log('expense skip'); }
    try { await prisma.expenseCategory.deleteMany(); } catch(e) { console.log('expenseCategory skip'); }

    console.log('✅ Business data wiped successfully.');

    const counts = {
        productCount: await prisma.product.count(),
        customerCount: await prisma.customer.count(),
        invoiceCount: await prisma.invoice.count(),
        userCount: await prisma.user.count(),
    };
    console.log('Current counts:', counts);
}

main()
    .catch(e => console.error('❌ Wipe failed:', e))
    .finally(() => prisma.$disconnect());

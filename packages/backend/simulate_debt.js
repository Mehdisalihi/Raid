import { PrismaClient } from './src/generated/client/index.js';
const prisma = new PrismaClient();

async function run() {
    const c = await prisma.customer.findFirst();
    console.log(`CUSTOMER_NAME: ${c.name}`);

    // Simulate a sale via POST /v1/sales
    const saleData = {
        customerName: c.name,
        cart: [{ id: 'some-id', qty: 1, sellPrice: 150 }],
        totalAmount: 150,
        discount: 0,
        finalAmount: 150,
        isDebt: true
    };

    console.log('Simulating debt sale...');
    const fetch = (await import('node-fetch')).default;
    const res = await fetch('http://localhost:4000/v1/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
    });
    const result = await res.json();
    console.log('Sale Result:', result);

    const updatedC = await prisma.customer.findUnique({ where: { id: c.id } });
    console.log(`Updated Balance: ${updatedC.balance}`);

    await prisma.$disconnect();
}
run();

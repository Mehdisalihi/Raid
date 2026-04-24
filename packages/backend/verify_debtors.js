import { PrismaClient } from './src/generated/client/index.js';
const prisma = new PrismaClient();

async function run() {
    const c = await prisma.customer.findFirst();
    if (!c) {
        console.log('No customer found!');
        return;
    }

    console.log(`Setting balance for ${c.name} to 1250...`);
    await prisma.customer.update({
        where: { id: c.id },
        data: { balance: 1250 }
    });

    console.log('Verifying /v1/debts/debtors...');
    const fetch = (await import('node-fetch')).default;
    const res = await fetch('http://localhost:4000/v1/debts/debtors');
    const debtors = await res.json();
    console.log('Debtors result:', JSON.stringify(debtors, null, 2));

    await prisma.$disconnect();
}
run();

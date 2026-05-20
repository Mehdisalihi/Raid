const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const user = await prisma.user.findFirst();
    const product = await prisma.product.findFirst({ where: { userId: user.id } });
    if (!product) return console.log('no product');
    const id = product.id;
    const req = { userId: user.id, body: { stockQty: 10 } };
    const targetWarehouseId = (await prisma.warehouse.findFirst({ where: { userId: req.userId } })).id;
    
    await prisma.$transaction(async (tx) => {
        const oldInv = await tx.warehouseInventory.findUnique({
            where: { productId_warehouseId: { productId: id, warehouseId: targetWarehouseId } }
        });
        console.log('oldInv', oldInv);
        await tx.warehouseInventory.upsert({
            where: { productId_warehouseId: { productId: id, warehouseId: targetWarehouseId } },
            update: { qty: 10 },
            create: { productId: id, warehouseId: targetWarehouseId, qty: 10 }
        });
        console.log('upsert done');
    });
    console.log('SUCCESS');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}
test();

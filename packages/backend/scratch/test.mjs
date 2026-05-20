import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function test() {
  try {
    const product = await prisma.product.findFirst();
    if (!product) return console.log('no product');
    const id = product.id;
    
    // Test the warehouse logic
    const defaultWarehouse = await prisma.warehouse.findFirst();
    if (!defaultWarehouse) return console.log('no warehouse');
    const targetWarehouseId = defaultWarehouse.id;
    
    console.log('Testing upsert for product', id, 'warehouse', targetWarehouseId);
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

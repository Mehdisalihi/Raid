import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Create Return
router.post('/', async (req, res) => {
    const { saleId, items, total, date, warehouseId } = req.body;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Find original sale
            const sale = await tx.invoice.findUnique({
                where: { id: saleId },
                include: { customer: true }
            });

            if (!sale) throw new Error('Original sale not found');

            // 2. Create Return Invoice
            const returnInvoice = await tx.invoice.create({
                data: {
                    invoiceNo: `RET-${Date.now()}`,
                    customerId: sale.customerId,
                    totalAmount: parseFloat(total),
                    discount: 0,
                    finalAmount: parseFloat(total),
                    type: 'RETURN',
                    items: {
                        create: items.map(item => ({
                            productId: item.productId,
                            qty: parseInt(item.quantity),
                            price: 0, // In returns we usually don't track item price as it's a refund
                            total: 0
                        }))
                    }
                }
            });

            // 3. Update stock (Global and Warehouse specific)
            let targetWarehouseId = warehouseId;
            if (!targetWarehouseId) {
                const defaultWarehouse = await tx.warehouse.findFirst({ where: { isActive: true } });
                targetWarehouseId = defaultWarehouse?.id;
            }

            for (const item of items) {
                // Update Global Stock
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stockQty: { increment: parseInt(item.quantity) }
                    }
                });

                if (targetWarehouseId) {
                    // Update Warehouse Inventory
                    await tx.warehouseInventory.upsert({
                        where: {
                            productId_warehouseId: {
                                productId: item.productId,
                                warehouseId: targetWarehouseId
                            }
                        },
                        update: { qty: { increment: parseInt(item.quantity) } },
                        create: {
                            productId: item.productId,
                            warehouseId: targetWarehouseId,
                            qty: parseInt(item.quantity)
                        }
                    });

                    // Record Stock Movement
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            destinationId: targetWarehouseId,
                            qty: parseInt(item.quantity),
                            type: 'RETURN',
                            notes: `Return to Sale: ${sale.invoiceNo}`
                        }
                    });
                }
            }

            // 4. Update customer balance (decrement because we owe them money back if it was debt)
            if (sale.customerId) {
                await tx.customer.update({
                    where: { id: sale.customerId },
                    data: { balance: { decrement: parseFloat(total) } }
                });
            }

            return returnInvoice;
        });

        res.json(result);
    } catch (error) {
        console.error('Return error:', error);
        res.status(500).json({ error: 'error processing return: ' + error.message });
    }
});

// Get all returns
router.get('/', async (req, res) => {
    try {
        const returns = await prisma.invoice.findMany({
            where: { type: 'RETURN' },
            include: { customer: true, supplier: true, items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(returns);
    } catch (error) {
        res.status(500).json({ error: 'error fetching returns' });
    }
});

// Delete Return - Reverses stock increment and balance decrement
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.$transaction(async (tx) => {
            const returnInvoice = await tx.invoice.findUnique({
                where: { id },
                include: { items: true }
            });

            if (!returnInvoice || returnInvoice.type !== 'RETURN') {
                throw new Error('Return invoice not found');
            }

            // 1. Reverse stock changes (Decrement because return originally incremented it)
            for (const item of returnInvoice.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stockQty: { decrement: item.qty } }
                });
            }

            // 2. Restore customer balance (Increment because return originally decremented it)
            if (returnInvoice.customerId) {
                await tx.customer.update({
                    where: { id: returnInvoice.customerId },
                    data: { balance: { increment: returnInvoice.finalAmount } }
                });
            }

            // 3. Delete items and return invoice
            await tx.saleItem.deleteMany({ where: { invoiceId: id } });
            await tx.invoice.delete({ where: { id: id } });
        });
        res.status(204).send();
    } catch (error) {
        console.error('Delete return error:', error);
        res.status(500).json({ error: 'error deleting return: ' + error.message });
    }
});

export default router;

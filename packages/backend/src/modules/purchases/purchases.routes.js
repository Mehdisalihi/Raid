import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Create Creditor Invoice (Purchase from Customer/Supplier)
router.post('/', async (req, res) => {
    const { customerId, supplierId, items, total, date, warehouseId } = req.body;
    const invoiceDate = date ? new Date(date) : new Date();
    const sId = supplierId || customerId; // Support both for backward compatibility

    try {
        const result = await prisma.$transaction(async (tx) => {
            const processedItems = [];

            if (items && Array.isArray(items)) {
                for (const item of items) {
                    let productId = item.id;
                    if (!productId) {
                        const existing = await tx.product.findFirst({
                            where: { name: { equals: item.name } }
                        });
                        if (existing) {
                            productId = existing.id;
                        } else {
                            const newProduct = await tx.product.create({
                                data: {
                                    name: item.name,
                                    buyPrice: parseFloat(item.purchasePrice || 0),
                                    sellPrice: parseFloat(item.purchasePrice || 0) * 1.2,
                                    stockQty: 0
                                }
                            });
                            productId = newProduct.id;
                        }
                    }
                    processedItems.push({
                        productId,
                        qty: parseInt(item.qty || 0),
                        price: parseFloat(item.purchasePrice || 0),
                        total: parseFloat((item.purchasePrice || 0) * (item.qty || 0))
                    });
                }
            }

            // 1. Create Invoice
            const invoice = await tx.invoice.create({
                data: {
                    invoiceNo: `PUR-${Date.now()}`,
                    customerId: (!supplierId && customerId) ? customerId : null,
                    supplierId: supplierId || null,
                    totalAmount: parseFloat(total || 0),
                    discount: 0,
                    finalAmount: parseFloat(total || 0),
                    type: "PURCHASE",
                    createdAt: invoiceDate,
                    items: {
                        create: processedItems.map(item => ({
                            productId: item.productId,
                            qty: item.qty,
                            price: item.price,
                            total: item.total
                        }))
                    }
                }
            });

            // 1.5 Ensure Warehouse exists or use default
            let targetWarehouseId = warehouseId;
            if (!targetWarehouseId) {
                const defaultWarehouse = await tx.warehouse.findFirst({ where: { isActive: true } });
                if (defaultWarehouse) {
                    targetWarehouseId = defaultWarehouse.id;
                } else {
                    const newWarehouse = await tx.warehouse.create({
                        data: { name: 'المخزن الرئيسي', location: 'Default', manager: 'System', isActive: true }
                    });
                    targetWarehouseId = newWarehouse.id;
                }
            }

            // 2. Add Stock (Global and Warehouse specific) and update prices
            for (const item of processedItems) {
                // Update Global Stock
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stockQty: { increment: item.qty },
                        buyPrice: item.price
                    }
                });

                // Update Warehouse Inventory
                await tx.warehouseInventory.upsert({
                    where: {
                        productId_warehouseId: {
                            productId: item.productId,
                            warehouseId: targetWarehouseId
                        }
                    },
                    update: { qty: { increment: item.qty } },
                    create: {
                        productId: item.productId,
                        warehouseId: targetWarehouseId,
                        qty: item.qty
                    }
                });

                // Record Stock Movement
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        destinationId: targetWarehouseId,
                        qty: item.qty,
                        type: 'PURCHASE',
                        notes: `Purchase Invoice: ${invoice.invoiceNo}`
                    }
                });
            }

            // 3. Update Supplier Balance (Decrement because shop owes supplier)
            if (supplierId) {
                await tx.supplier.update({
                    where: { id: supplierId },
                    data: {
                        balance: { decrement: parseFloat(total || 0) }
                    }
                });
            } else if (customerId) {
                // If it's a "purchase" from a customer (e.g. return buyback or credit)
                await tx.customer.update({
                    where: { id: customerId },
                    data: {
                        balance: { decrement: parseFloat(total || 0) }
                    }
                });
            }

            return invoice;
        });

        res.json(result);
    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({ error: 'error processing purchase: ' + error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const purchases = await prisma.invoice.findMany({
            where: { type: 'PURCHASE' },
            include: { customer: true, supplier: true, items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(purchases);
    } catch (error) {
        res.status(500).json({ error: 'error fetching purchases' });
    }
});

// Delete Purchase Invoice - Restores Stock
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.findUnique({
                where: { id: id },
                include: { items: true }
            });

            if (!invoice) throw new Error('Purchase invoice not found');

            // 1. Reverse stock changes
            for (const item of invoice.items) {
                // Decrement Global Stock
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stockQty: { decrement: item.qty } }
                });

                // Find original purchase movement to find warehouse
                const movement = await tx.stockMovement.findFirst({
                    where: { productId: item.productId, type: 'PURCHASE', notes: { contains: invoice.invoiceNo } }
                });

                if (movement) {
                    await tx.warehouseInventory.update({
                        where: {
                            productId_warehouseId: {
                                productId: item.productId,
                                warehouseId: movement.destinationId
                            }
                        },
                        data: { qty: { decrement: item.qty } }
                    });

                    // Record Reversal Movement
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            sourceId: movement.destinationId,
                            qty: item.qty,
                            type: 'REMOVE',
                            notes: `Reversed from deleted purchase: ${invoice.invoiceNo}`
                        }
                    });
                }
            }

            // 2. Restore Supplier Balance
            if (invoice.supplierId) {
                await tx.supplier.update({
                    where: { id: invoice.supplierId },
                    data: { balance: { increment: invoice.finalAmount } }
                });
            } else if (invoice.customerId) {
                await tx.customer.update({
                    where: { id: invoice.customerId },
                    data: { balance: { increment: invoice.finalAmount } }
                });
            }

            // 3. Delete items and invoice
            await tx.saleItem.deleteMany({ where: { invoiceId: id } });
            await tx.invoice.delete({ where: { id: id } });
        });
        res.status(204).send();
    } catch (error) {
        console.error('Delete purchase error:', error);
        res.status(500).json({ error: 'error deleting purchase: ' + error.message });
    }
});

export default router;

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all invoices with filtering
router.get('/', async (req, res) => {
    const { type, search, startDate, endDate } = req.query;
    try {
        const where = {};
        
        if (type && type !== 'ALL') {
            where.type = type;
        }

        if (search) {
            where.OR = [
                { invoiceNo: { contains: search } },
                { customer: { name: { contains: search } } },
                { supplier: { name: { contains: search } } }
            ];
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                customer: true,
                supplier: true,
                items: {
                    include: { product: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(invoices);
    } catch (error) {
        console.error('GET /invoices - error:', error);
        res.status(500).json({ error: 'error fetching invoices' });
    }
});

// Convert Quotation to Sale
router.post('/convert-quote/:id', async (req, res) => {
    const { id } = req.params;
    const { warehouseId, isDebt } = req.body;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Get the quotation
            const quote = await tx.invoice.findUnique({
                where: { id },
                include: { items: true, customer: true }
            });

            if (!quote || quote.type !== 'QUOTATION') {
                throw new Error('Valid quotation not found');
            }

            // 2. Update type to SALE/DEBT
            const updatedInvoice = await tx.invoice.update({
                where: { id },
                data: {
                    type: 'SALE',
                    isDebt: !!isDebt,
                    createdAt: new Date() // Reset date to conversion date
                }
            });

            // 3. Process Stock (Same logic as sales)
            let targetWarehouseId = warehouseId;
            if (!targetWarehouseId) {
                const defaultWarehouse = await tx.warehouse.findFirst({ where: { isActive: true } });
                targetWarehouseId = defaultWarehouse?.id;
                if (!targetWarehouseId) {
                    const newWarehouse = await tx.warehouse.create({
                        data: { name: 'المخزن الرئيسي', isActive: true }
                    });
                    targetWarehouseId = newWarehouse.id;
                }
            }

            for (const item of quote.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stockQty: { decrement: item.qty } }
                });

                await tx.warehouseInventory.upsert({
                    where: { productId_warehouseId: { productId: item.productId, warehouseId: targetWarehouseId } },
                    update: { qty: { decrement: item.qty } },
                    create: { productId: item.productId, warehouseId: targetWarehouseId, qty: -item.qty }
                });

                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        warehouseId: targetWarehouseId,
                        qty: item.qty,
                        type: 'SALE',
                        note: `Converted from Quote: ${quote.invoiceNo}`
                    }
                });
            }

            // 4. Update balance if debt
            if (isDebt && quote.customer) {
                await tx.customer.update({
                    where: { id: quote.customer.id },
                    data: { balance: { increment: quote.finalAmount } }
                });
            }

            return updatedInvoice;
        });

        res.json(result);
    } catch (error) {
        console.error('Convert Quote error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Delete Invoice
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.findUnique({
                where: { id },
                include: { items: true, customer: true, supplier: true }
            });

            if (!invoice) throw new Error('Invoice not found');

            // 1. Restore/Reverse Stock and Balances based on type
            for (const item of invoice.items) {
                if (invoice.type === 'SALE' || invoice.type === 'QUOTATION') {
                    // Only SALE affects stock (QUOTATION doesn't unless converted, but safety check)
                    if (invoice.type === 'SALE') {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stockQty: { increment: item.qty } }
                        });
                        
                        // Try to find and reverse warehouse stock
                        const movement = await tx.stockMovement.findFirst({
                            where: { productId: item.productId, type: 'SALE', notes: { contains: invoice.invoiceNo } }
                        });
                        if (movement && movement.sourceId) {
                            await tx.warehouseInventory.upsert({
                                where: { productId_warehouseId: { productId: item.productId, warehouseId: movement.sourceId } },
                                update: { qty: { increment: item.qty } },
                                create: { productId: item.productId, warehouseId: movement.sourceId, qty: item.qty }
                            });
                        }
                    }
                } else if (invoice.type === 'PURCHASE') {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stockQty: { decrement: item.qty } }
                    });

                    const movement = await tx.stockMovement.findFirst({
                        where: { productId: item.productId, type: 'PURCHASE', notes: { contains: invoice.invoiceNo } }
                    });
                    if (movement && movement.destinationId) {
                        await tx.warehouseInventory.update({
                            where: { productId_warehouseId: { productId: item.productId, warehouseId: movement.destinationId } },
                            data: { qty: { decrement: item.qty } }
                        });
                    }
                } else if (invoice.type === 'RETURN') {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stockQty: { decrement: item.qty } }
                    });
                    // Returns usually don't have complex warehouse tracking in current simplified version
                }
            }

            // 2. Reverse Balances
            if (invoice.isDebt || invoice.type === 'PURCHASE' || invoice.type === 'RETURN') {
                if (invoice.type === 'SALE' && invoice.customerId) {
                    await tx.customer.update({
                        where: { id: invoice.customerId },
                        data: { balance: { decrement: invoice.finalAmount } }
                    });
                } else if (invoice.type === 'PURCHASE') {
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
                } else if (invoice.type === 'RETURN' && invoice.customerId) {
                    await tx.customer.update({
                        where: { id: invoice.customerId },
                        data: { balance: { increment: invoice.finalAmount } }
                    });
                }
            }

            // 3. Delete Stock Movements associated with this invoice
            await tx.stockMovement.deleteMany({
                where: { notes: { contains: invoice.invoiceNo } }
            });

            // 4. Delete items and invoice
            await tx.saleItem.deleteMany({ where: { invoiceId: id } });
            await tx.invoice.delete({ where: { id } });
        });
        res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        console.error('Delete invoice error:', error);
        res.status(500).json({ error: 'error deleting invoice: ' + error.message });
    }
});

export default router;

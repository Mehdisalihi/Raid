import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all invoices with filtering
router.get('/', async (req, res) => {
    const { type, search, startDate, endDate } = req.query;
    try {
        const where = { userId: req.userId };
        
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
            const quote = await tx.invoice.findFirst({
                where: { id, userId: req.userId },
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
                const defaultWarehouse = await tx.warehouse.findFirst({ where: { isActive: true, userId: req.userId } });
                targetWarehouseId = defaultWarehouse?.id;
                if (!targetWarehouseId) {
                    const newWarehouse = await tx.warehouse.create({
                        data: { name: 'المخزن الرئيسي', isActive: true, userId: req.userId }
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
                        userId: req.userId,
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
            const invoice = await tx.invoice.findFirst({
                where: { id, userId: req.userId },
                include: { items: true, customer: true, supplier: true }
            });

            if (!invoice) throw new Error('Invoice not found');

            // 1. Restore/Reverse Stock and Balances based on type
            for (const item of invoice.items) {
                if (invoice.type === 'SALE' || invoice.type === 'QUOTATION') {
                    if (invoice.type === 'SALE') {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stockQty: { increment: item.qty } }
                        });
                        
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
                }
            }

            // 2. Reverse Balances
            if (invoice.isDebt || invoice.type === 'PURCHASE') {
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
                }
            }

            // 3. Delete items, movements and invoice
            await tx.stockMovement.deleteMany({ where: { notes: { contains: invoice.invoiceNo } } });
            await tx.saleItem.deleteMany({ where: { invoiceId: id } });
            await tx.invoice.delete({ where: { id } });
        });
        res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'error deleting invoice: ' + error.message });
    }
});

// Update Invoice (Universal)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { customerName, customerId, supplierId, items, cart, totalAmount, discount, taxRate, taxAmount, finalAmount, isDebt, paymentMethod, type, warehouseId } = req.body;
    
    const cleanCart = cart || items || [];

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Get Old Invoice
            const oldInv = await tx.invoice.findFirst({
                where: { id, userId: req.userId },
                include: { items: true }
            });
            if (!oldInv) throw new Error('Invoice not found');

            // 2. REVERSE OLD EFFECTS
            for (const item of oldInv.items) {
                if (oldInv.type === 'SALE') {
                    await tx.product.update({ where: { id: item.productId }, data: { stockQty: { increment: item.qty } } });
                    const mov = await tx.stockMovement.findFirst({ where: { productId: item.productId, type: 'SALE', notes: { contains: oldInv.invoiceNo } } });
                    if (mov?.sourceId) {
                        await tx.warehouseInventory.update({
                            where: { productId_warehouseId: { productId: item.productId, warehouseId: mov.sourceId } },
                            data: { qty: { increment: item.qty } }
                        });
                    }
                } else if (oldInv.type === 'PURCHASE') {
                    await tx.product.update({ where: { id: item.productId }, data: { stockQty: { decrement: item.qty } } });
                    const mov = await tx.stockMovement.findFirst({ where: { productId: item.productId, type: 'PURCHASE', notes: { contains: oldInv.invoiceNo } } });
                    if (mov?.destinationId) {
                        await tx.warehouseInventory.update({
                            where: { productId_warehouseId: { productId: item.productId, warehouseId: mov.destinationId } },
                            data: { qty: { decrement: item.qty } }
                        });
                    }
                }
            }
            if (oldInv.type === 'SALE' && oldInv.isDebt && oldInv.customerId) {
                await tx.customer.update({ where: { id: oldInv.customerId }, data: { balance: { decrement: oldInv.finalAmount } } });
            } else if (oldInv.type === 'PURCHASE') {
                if (oldInv.supplierId) await tx.supplier.update({ where: { id: oldInv.supplierId }, data: { balance: { increment: oldInv.finalAmount } } });
                else if (oldInv.customerId) await tx.customer.update({ where: { id: oldInv.customerId }, data: { balance: { increment: oldInv.finalAmount } } });
            }

            await tx.saleItem.deleteMany({ where: { invoiceId: id } });
            await tx.stockMovement.deleteMany({ where: { notes: { contains: oldInv.invoiceNo } } });

            // 3. APPLY NEW EFFECTS
            // Use provided warehouse or default
            let targetWH = warehouseId;
            if (!targetWH) {
                const def = await tx.warehouse.findFirst({ where: { isActive: true, userId: req.userId } });
                targetWH = def?.id;
            }

            // Update Invoice Header
            const updated = await tx.invoice.update({
                where: { id },
                data: {
                    customerId: customerId || oldInv.customerId,
                    supplierId: supplierId || oldInv.supplierId,
                    totalAmount: parseFloat(totalAmount || 0),
                    discount: parseFloat(discount || 0),
                    taxRate: parseFloat(taxRate || 0),
                    taxAmount: parseFloat(taxAmount || 0),
                    finalAmount: parseFloat(finalAmount || 0),
                    isDebt: !!isDebt,
                    paymentMethod: paymentMethod || 'cash',
                    type: type || oldInv.type,
                    items: {
                        create: cleanCart.map(item => ({
                            productId: item.id || item.productId,
                            qty: parseInt(item.qty || 0),
                            price: parseFloat(item.sellPrice || item.buyPrice || item.price || 0),
                            total: parseFloat((item.sellPrice || item.buyPrice || item.price || 0) * (item.qty || 0))
                        }))
                    }
                }
            });

            // Update Stock for new items
            for (const item of cleanCart) {
                const pid = item.id || item.productId;
                const qty = parseInt(item.qty || 0);
                const price = parseFloat(item.sellPrice || item.buyPrice || item.price || 0);

                if (updated.type === 'SALE') {
                    await tx.product.update({ where: { id: pid }, data: { stockQty: { decrement: qty } } });
                    if (targetWH) {
                        await tx.warehouseInventory.upsert({
                            where: { productId_warehouseId: { productId: pid, warehouseId: targetWH } },
                            update: { qty: { decrement: qty } },
                            create: { productId: pid, warehouseId: targetWH, qty: -qty }
                        });
                        await tx.stockMovement.create({
                            data: { productId: pid, sourceId: targetWH, qty, type: 'SALE', userId: req.userId, notes: `Updated Invoice: ${updated.invoiceNo}` }
                        });
                    }
                } else if (updated.type === 'PURCHASE') {
                    await tx.product.update({ where: { id: pid }, data: { stockQty: { increment: qty }, buyPrice: price } });
                    if (targetWH) {
                        await tx.warehouseInventory.upsert({
                            where: { productId_warehouseId: { productId: pid, warehouseId: targetWH } },
                            update: { qty: { increment: qty } },
                            create: { productId: pid, warehouseId: targetWH, qty }
                        });
                        await tx.stockMovement.create({
                            data: { productId: pid, destinationId: targetWH, qty, type: 'PURCHASE', userId: req.userId, notes: `Updated Invoice: ${updated.invoiceNo}` }
                        });
                    }
                }
            }

            // Update Balance for new state
            if (updated.type === 'SALE' && updated.isDebt && updated.customerId) {
                await tx.customer.update({ where: { id: updated.customerId }, data: { balance: { increment: updated.finalAmount } } });
            } else if (updated.type === 'PURCHASE') {
                if (updated.supplierId) await tx.supplier.update({ where: { id: updated.supplierId }, data: { balance: { decrement: updated.finalAmount } } });
                else if (updated.customerId) await tx.customer.update({ where: { id: updated.customerId }, data: { balance: { decrement: updated.finalAmount } } });
            }

            return updated;
        });
        res.json(result);
    } catch (error) {
        console.error('Update invoice error:', error);
        res.status(500).json({ error: 'error updating invoice: ' + error.message });
    }
});

export default router;

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

// Create Invoice (SALE, PURCHASE, QUOTATION, RETURN)
router.post('/', async (req, res) => {
    const {
        customerId, supplierId, items, cart,
        totalAmount, discount, taxRate, taxAmount, finalAmount,
        isDebt, paymentMethod, type, warehouseId, date, customerName
    } = req.body;

    const cleanCart = cart || items || [];
    const invoiceType = type || 'SALE';

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Auto-generate invoice number
            const count = await tx.invoice.count({ where: { userId: req.userId } });
            const invoiceNo = `INV-${String(count + 1).padStart(5, '0')}`;

            // 2. Resolve warehouse (use provided, find default, or create one)
            let targetWarehouseId = warehouseId;
            if (!targetWarehouseId) {
                const defaultWarehouse = await tx.warehouse.findFirst({
                    where: { isActive: true, userId: req.userId },
                    orderBy: { createdAt: 'asc' }
                });
                if (defaultWarehouse) {
                    targetWarehouseId = defaultWarehouse.id;
                } else {
                    // Create a default warehouse automatically
                    const newWarehouse = await tx.warehouse.create({
                        data: { name: 'المخزن الرئيسي', isActive: true, userId: req.userId }
                    });
                    targetWarehouseId = newWarehouse.id;
                }
            }

            // 3. Auto-create customer by name if none selected
            let resolvedCustomerId = customerId || null;
            if (!resolvedCustomerId && customerName && invoiceType !== 'PURCHASE') {
                const existing = await tx.customer.findFirst({
                    where: { name: { equals: customerName }, userId: req.userId }
                });
                if (existing) {
                    resolvedCustomerId = existing.id;
                } else {
                    const newCustomer = await tx.customer.create({
                        data: { name: customerName, userId: req.userId }
                    });
                    resolvedCustomerId = newCustomer.id;
                }
            }

            // 4. Pre-process items — auto-create missing products
            const processedItems = [];
            for (const item of cleanCart) {
                let productId = item.id || item.productId;
                if (!productId && item.name) {
                    const existing = await tx.product.findFirst({
                        where: { name: { equals: item.name }, userId: req.userId }
                    });
                    if (existing) {
                        productId = existing.id;
                    } else {
                        const newProduct = await tx.product.create({
                            data: {
                                name: item.name,
                                sellPrice: parseFloat(item.sellPrice || item.price || 0),
                                buyPrice: parseFloat(item.buyPrice || item.price || 0),
                                stockQty: 0,
                                userId: req.userId
                            }
                        });
                        productId = newProduct.id;
                    }
                }
                processedItems.push({
                    productId,
                    qty: parseInt(item.qty || 0),
                    price: parseFloat(item.sellPrice || item.buyPrice || item.price || 0),
                    total: parseFloat((item.sellPrice || item.buyPrice || item.price || 0) * (item.qty || 0))
                });
            }

            // 5. Create the Invoice
            const invoice = await tx.invoice.create({
                data: {
                    invoiceNo,
                    customerId: resolvedCustomerId,
                    supplierId: supplierId || null,
                    totalAmount: parseFloat(totalAmount || 0),
                    discount: parseFloat(discount || 0),
                    taxRate: parseFloat(taxRate || 0),
                    taxAmount: parseFloat(taxAmount || 0),
                    finalAmount: parseFloat(finalAmount || 0),
                    type: invoiceType,
                    isDebt: !!isDebt,
                    paymentMethod: paymentMethod || 'cash',
                    userId: req.userId,
                    createdAt: date ? new Date(date) : undefined,
                    items: { create: processedItems }
                },
                include: { items: true, customer: true, supplier: true }
            });

            // 6. Update stock based on invoice type
            for (const item of processedItems) {
                if (!item.productId || item.qty <= 0) continue;

                if (invoiceType === 'SALE' || invoiceType === 'RETURN_PURCHASE') {
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
                            productId: item.productId, sourceId: targetWarehouseId,
                            qty: item.qty, type: 'SALE', userId: req.userId,
                            notes: `فاتورة: ${invoiceNo}`
                        }
                    });
                } else if (invoiceType === 'PURCHASE' || invoiceType === 'RETURN_SALE') {
                    const price = parseFloat(item.price || 0);
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stockQty: { increment: item.qty }, ...(price > 0 ? { buyPrice: price } : {}) }
                    });
                    await tx.warehouseInventory.upsert({
                        where: { productId_warehouseId: { productId: item.productId, warehouseId: targetWarehouseId } },
                        update: { qty: { increment: item.qty } },
                        create: { productId: item.productId, warehouseId: targetWarehouseId, qty: item.qty }
                    });
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId, destinationId: targetWarehouseId,
                            qty: item.qty, type: 'PURCHASE', userId: req.userId,
                            notes: `فاتورة: ${invoiceNo}`
                        }
                    });
                }
                // QUOTATION — no stock movement
            }

            // 7. Update balances
            const finalAmt = parseFloat(finalAmount || 0);
            if (invoiceType === 'SALE' && isDebt && resolvedCustomerId) {
                await tx.customer.update({
                    where: { id: resolvedCustomerId },
                    data: { balance: { increment: finalAmt } }
                });
            } else if (invoiceType === 'PURCHASE') {
                if (supplierId) {
                    await tx.supplier.update({
                        where: { id: supplierId },
                        data: { balance: { decrement: finalAmt } }
                    });
                } else if (resolvedCustomerId) {
                    await tx.customer.update({
                        where: { id: resolvedCustomerId },
                        data: { balance: { decrement: finalAmt } }
                    });
                }
            }

            return invoice;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('POST /invoices - error:', error);
        res.status(500).json({ error: 'error creating invoice', details: error.message });
    }
});

// Get single invoice
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id, userId: req.userId },
            include: { customer: true, supplier: true, items: { include: { product: true } } }
        });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        res.json(invoice);
    } catch (error) {
        console.error('GET /invoices/:id - error:', error);
        res.status(500).json({ error: 'error fetching invoice' });
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
                            where: { 
                                productId: item.productId, 
                                type: 'SALE', 
                                userId: req.userId,
                                notes: { contains: invoice.invoiceNo } 
                            }
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
                        where: { 
                            productId: item.productId, 
                            type: 'PURCHASE', 
                            userId: req.userId,
                            notes: { contains: invoice.invoiceNo } 
                        }
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
    const { customerName, customerId, supplierId, items, cart, totalAmount, discount, taxRate, taxAmount, finalAmount, isDebt, paymentMethod, type, warehouseId, createdAt, date } = req.body;
    
    const cleanCart = cart || items || [];
    const invoiceDate = date || createdAt;

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
                    const mov = await tx.stockMovement.findFirst({ 
                        where: { 
                            productId: item.productId, 
                            type: 'SALE', 
                            userId: req.userId,
                            notes: { contains: oldInv.invoiceNo } 
                        } 
                    });
                    if (mov?.sourceId) {
                        await tx.warehouseInventory.update({
                            where: { productId_warehouseId: { productId: item.productId, warehouseId: mov.sourceId } },
                            data: { qty: { increment: item.qty } }
                        });
                    }
                } else if (oldInv.type === 'PURCHASE') {
                    await tx.product.update({ where: { id: item.productId }, data: { stockQty: { decrement: item.qty } } });
                    const mov = await tx.stockMovement.findFirst({ 
                        where: { 
                            productId: item.productId, 
                            type: 'PURCHASE', 
                            userId: req.userId,
                            notes: { contains: oldInv.invoiceNo } 
                        } 
                    });
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

            // Pre-process items to auto-create missing products
            let processedItems = [];
            for (const item of cleanCart) {
                let productId = item.id || item.productId;
                if (!productId && item.name) {
                    const existing = await tx.product.findFirst({
                        where: { name: { equals: item.name }, userId: req.userId }
                    });
                    if (existing) {
                        productId = existing.id;
                    } else {
                        const newProduct = await tx.product.create({
                            data: {
                                name: item.name,
                                sellPrice: parseFloat(item.sellPrice || item.price || 0),
                                buyPrice: parseFloat(item.buyPrice || item.price || 0),
                                stockQty: 0,
                                userId: req.userId
                            }
                        });
                        productId = newProduct.id;
                    }
                }
                // Override the id so subsequent stock updates use the correct product
                item.id = productId;
                processedItems.push({
                    productId,
                    qty: parseInt(item.qty || 0),
                    price: parseFloat(item.sellPrice || item.buyPrice || item.price || 0),
                    total: parseFloat((item.sellPrice || item.buyPrice || item.price || 0) * (item.qty || 0))
                });
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
                    createdAt: invoiceDate ? new Date(invoiceDate) : oldInv.createdAt,
                    items: {
                        create: processedItems
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

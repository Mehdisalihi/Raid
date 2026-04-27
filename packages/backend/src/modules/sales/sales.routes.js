import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 1. Create Sale
router.post('/', async (req, res) => {
    const { customerName, customerId, supplierId, cart, totalAmount, discount, taxRate, taxAmount, finalAmount, isDebt, paymentMethod, type, warehouseId, createdAt } = req.body;
    const cleanCustomerId = customerId && customerId !== '' ? customerId : null;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Find/Create Customer
            let customer = null;
            if (cleanCustomerId) {
                customer = await tx.customer.findUnique({ where: { id: cleanCustomerId } });
            } else if (customerName && customerName !== 'عميل نقدي') {
                customer = await tx.customer.findFirst({ where: { name: customerName } });
                if (!customer) customer = await tx.customer.create({ data: { name: customerName } });
            }

            // Create Invoice
            const invoice = await tx.invoice.create({
                data: {
                    invoiceNo: `INV-${Date.now()}`,
                    customerId: cleanCustomerId || customer?.id || null,
                    totalAmount: parseFloat(totalAmount || 0),
                    discount: parseFloat(discount || 0),
                    finalAmount: parseFloat(finalAmount || totalAmount || 0),
                    type: type || 'SALE',
                    isDebt: !!isDebt,
                    paymentMethod: paymentMethod || 'cash',
                    createdAt: createdAt ? new Date(createdAt) : new Date(),
                    items: {
                        create: cart.map(item => ({
                            productId: item.id,
                            qty: parseInt(item.qty || 0),
                            price: parseFloat(item.sellPrice || item.price || 0),
                            total: parseFloat((item.sellPrice || item.price || 0) * (item.qty || 0))
                        }))
                    }
                }
            });

            // Stock Deduction
            let targetWH = warehouseId;
            if (!targetWH) {
                const def = await tx.warehouse.findFirst({ where: { isActive: true } });
                targetWH = def?.id;
            }

            if (type !== 'QUOTATION') {
                for (const item of cart) {
                    await tx.product.update({
                        where: { id: item.id },
                        data: { stockQty: { decrement: parseInt(item.qty) } }
                    });
                    if (targetWH) {
                        await tx.warehouseInventory.upsert({
                            where: { productId_warehouseId: { productId: item.id, warehouseId: targetWH } },
                            update: { qty: { decrement: parseInt(item.qty) } },
                            create: { productId: item.id, warehouseId: targetWH, qty: -parseInt(item.qty) }
                        });
                        await tx.stockMovement.create({
                            data: { productId: item.id, sourceId: targetWH, qty: parseInt(item.qty), type: 'SALE', notes: `Sale: ${invoice.invoiceNo}` }
                        });
                    }
                }
                if (isDebt && customer) {
                    await tx.customer.update({
                        where: { id: customer.id },
                        data: { balance: { increment: parseFloat(finalAmount) } }
                    });
                }
            }
            return invoice;
        });
        res.json(result);
    } catch (error) {
        console.error('Sale Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Get Sales (with filters)
router.get('/', async (req, res) => {
    const { invoiceNo, date, paymentMethod } = req.query;
    console.log('--- FETCH SALES REQUEST ---');
    console.log('Query Params:', { invoiceNo, date, paymentMethod });
    
    try {
        const query = {
            include: { customer: true, items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' },
            where: { type: 'SALE' }
        };

        if (invoiceNo) query.where.invoiceNo = invoiceNo;
        if (paymentMethod && paymentMethod !== 'all') query.where.paymentMethod = paymentMethod;
        
        if (date) {
            // Precise local day range
            const dayStart = new Date(date);
            dayStart.setUTCHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setUTCHours(23, 59, 59, 999);
            
            query.where.createdAt = {
                gte: dayStart,
                lte: dayEnd
            };
            console.log('Date Filter Applied:', { dayStart, dayEnd });
        }

        const invoices = await prisma.invoice.findMany(query);
        console.log(`Found ${invoices.length} sales matching filters.`);
        res.json(invoices);
    } catch (error) {
        console.error('Fetch Sales Backend Error:', error);
        res.status(500).json({ error: 'Fetch failed' });
    }
});

// 3. Update Sale
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { customerName, cart, finalAmount, paymentMethod, warehouseId, createdAt } = req.body;
    try {
        const result = await prisma.$transaction(async (tx) => {
            const old = await tx.invoice.findUnique({ where: { id }, include: { items: true } });
            if (!old) throw new Error('Not found');

            // Reverse Stock
            for (const item of old.items) {
                const move = await tx.stockMovement.findFirst({ where: { notes: { contains: old.invoiceNo } } });
                await tx.product.update({ where: { id: item.productId }, data: { stockQty: { increment: item.qty } } });
                if (move) {
                    await tx.warehouseInventory.update({
                        where: { productId_warehouseId: { productId: item.productId, warehouseId: move.sourceId } },
                        data: { qty: { increment: item.qty } }
                    });
                }
            }
            if (old.isDebt && old.customerId) {
                await tx.customer.update({ where: { id: old.customerId }, data: { balance: { decrement: old.finalAmount } } });
            }
            await tx.saleItem.deleteMany({ where: { invoiceId: id } });
            await tx.stockMovement.deleteMany({ where: { notes: { contains: old.invoiceNo } } });

            // Apply New
            const updated = await tx.invoice.update({
                where: { id },
                data: {
                    finalAmount: parseFloat(finalAmount),
                    paymentMethod,
                    createdAt: createdAt ? new Date(createdAt) : old.createdAt,
                    items: {
                        create: cart.map(it => ({
                            productId: it.id || it.productId,
                            qty: parseInt(it.qty),
                            price: parseFloat(it.sellPrice || it.price),
                            total: parseFloat((it.sellPrice || it.price) * it.qty)
                        }))
                    }
                }
            });

            for (const it of cart) {
                const pid = it.id || it.productId;
                await tx.product.update({ where: { id: pid }, data: { stockQty: { decrement: it.qty } } });
                await tx.stockMovement.create({
                    data: { productId: pid, sourceId: warehouseId || (await tx.warehouse.findFirst({where:{isActive:true}}))?.id, qty: it.qty, type: 'SALE', notes: `Updated: ${updated.invoiceNo}` }
                });
            }
            return updated;
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Delete Sale
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.$transaction(async (tx) => {
            const inv = await tx.invoice.findUnique({ where: { id }, include: { items: true } });
            if (!inv) throw new Error('Not found');
            for (const it of inv.items) {
                await tx.product.update({ where: { id: it.productId }, data: { stockQty: { increment: it.qty } } });
            }
            await tx.saleItem.deleteMany({ where: { invoiceId: id } });
            await tx.invoice.delete({ where: { id } });
            await tx.stockMovement.deleteMany({ where: { notes: { contains: inv.invoiceNo } } });
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Create Invoice (Sale)
router.post('/', async (req, res) => {
    const { customerName, cart, totalAmount, discount, finalAmount, isDebt, paymentMethod, type, warehouseId } = req.body;

    try {
        // Start a transaction to ensure data integrity
        const result = await prisma.$transaction(async (tx) => {
            // 1. Find or Create Customer
            let customer = await tx.customer.findFirst({
                where: { name: customerName }
            });

            if (!customer && customerName !== 'عميل نقدي') {
                customer = await tx.customer.create({
                    data: { name: customerName }
                });
            }

            // 2. Create Invoice
            const invoice = await tx.invoice.create({
                data: {
                    invoiceNo: `INV-${Date.now()}`,
                    customerId: customer?.id || null,
                    totalAmount: parseFloat(totalAmount),
                    discount: parseFloat(discount || 0),
                    finalAmount: parseFloat(finalAmount),
                    type: type || 'SALE', // Default to SALE
                    isDebt: !!isDebt,
                    paymentMethod: paymentMethod || 'cash',
                    items: {
                        create: cart.map(item => ({
                            productId: item.id,
                            qty: parseInt(item.qty),
                            price: parseFloat(item.sellPrice),
                            total: parseFloat(item.sellPrice * item.qty)
                        }))
                    }
                }
            });

            // 2.5 Ensure Warehouse exists or use default
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

            // Skip stock deduction and balance updates for QUOTATIONS
            if (type !== 'QUOTATION') {
                // 3. Deduct Stock (Global and Warehouse specific)
                for (const item of cart) {
                    // Update Global Stock
                    await tx.product.update({
                        where: { id: item.id },
                        data: { stockQty: { decrement: parseInt(item.qty) } }
                    });

                    // Update Warehouse Inventory
                    await tx.warehouseInventory.upsert({
                        where: {
                            productId_warehouseId: {
                                productId: item.id,
                                warehouseId: targetWarehouseId
                            }
                        },
                        update: { qty: { decrement: parseInt(item.qty) } },
                        create: {
                            productId: item.id,
                            warehouseId: targetWarehouseId,
                            qty: -parseInt(item.qty)
                        }
                    });

                    // Record Stock Movement
                    await tx.stockMovement.create({
                        data: {
                            productId: item.id,
                            sourceId: targetWarehouseId,
                            qty: parseInt(item.qty),
                            type: 'SALE',
                            notes: `Sale Invoice: ${invoice.invoiceNo}`
                        }
                    });
                }

                // 4. Update Customer Balance if it's a debt
                if (isDebt && customer) {
                    await tx.customer.update({
                        where: { id: customer.id },
                        data: {
                            balance: {
                                increment: parseFloat(finalAmount)
                            }
                        }
                    });
                }
            }

            return invoice;
        });

        res.json(result);
    } catch (error) {
        console.error('Sale error:', error);
        res.status(500).json({ error: 'error processing sale' });
    }
});

// Get all invoices (with optional filtering)
router.get('/', async (req, res) => {
    const { invoiceNo } = req.query;
    try {
        const query = {
            include: { customer: true, supplier: true, items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' },
            where: { type: 'SALE' }
        };

        if (invoiceNo) {
            query.where.invoiceNo = invoiceNo;
        }

        const invoices = await prisma.invoice.findMany(query);
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: 'error fetching invoices' });
    }
});

// Delete Invoice (Sale) - Restores Stock
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.findUnique({
                where: { id: id },
                include: { items: true }
            });

            if (!invoice) throw new Error('Invoice not found');

            // Restore stock for all items
            for (const item of invoice.items) {
                // Restore Global Stock
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stockQty: { increment: item.qty } }
                });

                // Find the last SALE movement for this product and invoice to find which warehouse it came from
                // Or simply use a default if not tracked per item in Invoice (current schema doesn't track warehouse per invoice item)
                // For now, we'll look at the StockMovement table
                const movement = await tx.stockMovement.findFirst({
                    where: { productId: item.productId, type: 'SALE', notes: { contains: invoice.invoiceNo } }
                });

                if (movement) {
                    await tx.warehouseInventory.update({
                        where: {
                            productId_warehouseId: {
                                productId: item.productId,
                                warehouseId: movement.sourceId
                            }
                        },
                        data: { qty: { increment: item.qty } }
                    });

                    // Record Restore Movement
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            destinationId: movement.sourceId,
                            qty: item.qty,
                            type: 'RETURN',
                            notes: `Restored from deleted sale: ${invoice.invoiceNo}`
                        }
                    });
                }
            }

            // Delete invoice items and invoice
            await tx.saleItem.deleteMany({ where: { invoiceId: id } });
            await tx.invoice.delete({ where: { id: id } });
        });
        res.status(204).send();
    } catch (error) {
        console.error('Delete sale error:', error);
        res.status(500).json({ error: 'error deleting invoice' });
    }
});

export default router;

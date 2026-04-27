import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get Debtors (Customers who owe us)
router.get('/debtors', async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            where: {
                balance: { gt: 0 }
            },
            orderBy: { balance: 'desc' }
        });

        // Map to format expected by mobile app
        const debtors = customers.map(c => ({
            id: c.id,
            customerName: c.name,
            remaining: c.balance,
            date: new Date(c.createdAt).toISOString().split('T')[0],
        }));

        res.json(debtors);
    } catch (error) {
        console.error('Fetch debtors error:', error);
        res.status(500).json({ error: 'error fetching debtors' });
    }
});

// Get Creditors (Suppliers we owe)
router.get('/creditors', async (req, res) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            where: {
                balance: { lt: 0 }
            },
            orderBy: { balance: 'asc' }
        });

        // Map to format expected by mobile app
        const creditors = suppliers.map(s => ({
            id: s.id,
            supplierName: s.name,
            remaining: Math.abs(s.balance),
            date: new Date(s.createdAt).toISOString().split('T')[0],
        }));

        res.json(creditors);
    } catch (error) {
        console.error('Fetch creditors error:', error);
        res.status(500).json({ error: 'error fetching creditors' });
    }
});

// Record Payment
router.post('/:id/pay', async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Check if it's a customer
            let entity = await tx.customer.findUnique({ where: { id } });
            let type = 'CUSTOMER';

            if (!entity) {
                entity = await tx.supplier.findUnique({ where: { id } });
                type = 'SUPPLIER';
            }

            if (!entity) {
                throw new Error('Entity not found');
            }

            if (type === 'CUSTOMER') {
                await tx.customer.update({
                    where: { id },
                    data: { balance: { decrement: parseFloat(amount) } }
                });
            } else {
                await tx.supplier.update({
                    where: { id },
                    data: { balance: { increment: parseFloat(amount) } }
                });
            }

            // Create a PAYMENT invoice for history
            const invoice = await tx.invoice.create({
                data: {
                    invoiceNo: `PAY-${Date.now()}`,
                    customerId: type === 'CUSTOMER' ? id : null,
                    supplierId: type === 'SUPPLIER' ? id : null,
                    totalAmount: parseFloat(amount),
                    discount: 0,
                    finalAmount: parseFloat(amount),
                    type: 'PAYMENT'
                }
            });

            return invoice;
        });

        res.json(result);
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ error: 'error recording payment: ' + error.message });
    }
});

export default router;

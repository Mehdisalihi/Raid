import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all customers
router.get('/', async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            where: { userId: req.userId },
            orderBy: { name: 'asc' },
        });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: 'error fetching customers' });
    }
});

// Create customer
router.post('/', async (req, res) => {
    const { name, phone, email } = req.body;
    try {
        const customer = await prisma.customer.create({
            data: { name, phone, email, userId: req.userId },
        });
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: 'error creating customer' });
    }
});

// Update customer
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, balance } = req.body;
    try {
        const existing = await prisma.customer.findFirst({ where: { id, userId: req.userId } });
        if (!existing) return res.status(404).json({ error: 'Customer not found' });

        const customer = await prisma.customer.update({
            where: { id },
            data: { name, phone, email, balance: parseFloat(balance || 0) },
        });
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: 'error updating customer' });
    }
});

// Delete customer
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await prisma.customer.findFirst({ where: { id, userId: req.userId } });
        if (!existing) return res.status(404).json({ error: 'Customer not found' });

        await prisma.customer.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'error deleting customer' });
    }
});

// Get Customer Statement (History of all transactions)
router.get('/:id/statement', async (req, res) => {
    const { id } = req.params;
    try {
        const customer = await prisma.customer.findFirst({
            where: { id, userId: req.userId },
            include: {
                Invoices: {
                    select: {
                        id: true,
                        invoiceNo: true,
                        totalAmount: true,
                        finalAmount: true,
                        type: true,
                        isDebt: true,
                        createdAt: true,
                        items: {
                           select: {
                               id: true,
                               qty: true,
                               price: true,
                               total: true,
                               product: {
                                   select: { name: true }
                               }
                           }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 200 // Safety limit for extreme cases
                }
            }
        });

        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        res.json(customer);
    } catch (error) {
        console.error('Fetch statement error:', error);
        res.status(500).json({ error: 'error fetching statement' });
    }
});

export default router;

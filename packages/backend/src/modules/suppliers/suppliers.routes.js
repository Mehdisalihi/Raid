import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all suppliers
router.get('/', async (req, res) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            where: { userId: req.userId },
            orderBy: { name: 'asc' },
        });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: 'error fetching suppliers' });
    }
});

// Create supplier
router.post('/', async (req, res) => {
    const { name, phone, email, company } = req.body;
    try {
        const supplier = await prisma.supplier.create({
            data: { name, phone, email, company, userId: req.userId },
        });
        res.json(supplier);
    } catch (error) {
        res.status(500).json({ error: 'error creating supplier' });
    }
});

// Update supplier
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, contactPerson, company } = req.body;
    try {
        const existing = await prisma.supplier.findFirst({ where: { id, userId: req.userId } });
        if (!existing) return res.status(404).json({ error: 'Supplier not found' });

        const supplier = await prisma.supplier.update({
            where: { id },
            data: { name, phone, email, contactPerson, company },
        });
        res.json(supplier);
    } catch (error) {
        res.status(500).json({ error: 'error updating supplier' });
    }
});

// Delete supplier
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await prisma.supplier.findFirst({ where: { id, userId: req.userId } });
        if (!existing) return res.status(404).json({ error: 'Supplier not found' });

        await prisma.supplier.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'error deleting supplier' });
    }
});

// Get Supplier Statement (History of all transactions)
router.get('/:id/statement', async (req, res) => {
    const { id } = req.params;
    try {
        const supplier = await prisma.supplier.findFirst({
            where: { id, userId: req.userId },
            include: {
                Invoices: {
                    include: { items: { include: { product: true } } },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

        res.json(supplier);
    } catch (error) {
        console.error('Fetch supplier statement error:', error);
        res.status(500).json({ error: 'error fetching supplier statement' });
    }
});

export default router;

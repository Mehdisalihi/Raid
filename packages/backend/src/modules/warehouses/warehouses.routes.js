import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all warehouses
router.get('/', async (req, res) => {
    try {
        const warehouses = await prisma.warehouse.findMany({
            include: {
                _count: {
                    select: { Inventory: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(warehouses);
    } catch (error) {
        res.status(500).json({ error: 'error fetching warehouses' });
    }
});

// Create warehouse
router.post('/', async (req, res) => {
    const { name, location, manager } = req.body;
    try {
        const warehouse = await prisma.warehouse.create({
            data: { name, location, manager }
        });
        res.json(warehouse);
    } catch (error) {
        res.status(500).json({ error: 'error creating warehouse' });
    }
});

// Update warehouse
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, location, manager, isActive } = req.body;
    try {
        const warehouse = await prisma.warehouse.update({
            where: { id },
            data: { name, location, manager, isActive }
        });
        res.json(warehouse);
    } catch (error) {
        res.status(500).json({ error: 'error updating warehouse' });
    }
});

// Delete warehouse
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // We should check for inventory before deleting, but keeping it simple for now
        await prisma.warehouse.delete({ where: { id } });
        res.json({ message: 'warehouse deleted' });
    } catch (error) {
        res.status(500).json({ error: 'error deleting warehouse' });
    }
});

export default router;

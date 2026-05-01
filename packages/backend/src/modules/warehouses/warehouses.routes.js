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

// Transfer stock between warehouses
router.post('/transfer', async (req, res) => {
    const { productId, sourceWarehouseId, destinationWarehouseId, qty, notes } = req.body;
    
    if (!productId || !sourceWarehouseId || !destinationWarehouseId || !qty) {
        return res.status(400).json({ error: 'missing required fields' });
    }

    const transferQty = parseInt(qty);
    if (transferQty <= 0) {
        return res.status(400).json({ error: 'quantity must be greater than zero' });
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Check source inventory
            const sourceInventory = await tx.warehouseInventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId,
                        warehouseId: sourceWarehouseId
                    }
                }
            });

            if (!sourceInventory || sourceInventory.qty < transferQty) {
                throw new Error('insufficient stock in source warehouse');
            }

            // 2. Decrease from source
            await tx.warehouseInventory.update({
                where: { id: sourceInventory.id },
                data: { qty: { decrement: transferQty } }
            });

            // 3. Increase in destination
            await tx.warehouseInventory.upsert({
                where: {
                    productId_warehouseId: {
                        productId,
                        warehouseId: destinationWarehouseId
                    }
                },
                update: { qty: { increment: transferQty } },
                create: {
                    productId,
                    warehouseId: destinationWarehouseId,
                    qty: transferQty
                }
            });

            // 4. Record movement
            await tx.stockMovement.create({
                data: {
                    productId,
                    sourceId: sourceWarehouseId,
                    destinationId: destinationWarehouseId,
                    qty: transferQty,
                    type: 'TRANSFER',
                    notes: notes || `Transfer from ${sourceWarehouseId} to ${destinationWarehouseId}`
                }
            });
        });

        res.json({ message: 'transfer successful' });
    } catch (error) {
        console.error('Transfer Error:', error);
        res.status(500).json({ error: error.message || 'error processing transfer' });
    }
});

export default router;

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all warehouses
router.get('/', async (req, res) => {
    try {
        const warehouses = await prisma.warehouse.findMany({
            where: { userId: req.userId },
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
    // Basic validation
    if (!name || typeof name !== 'string' || !location || typeof location !== 'string') {
        return res.status(400).json({ error: 'Invalid name or location' });
    }
    try {
        const warehouse = await prisma.warehouse.create({
            data: { name: name.trim(), location: location.trim(), manager: manager?.trim(), userId: req.userId }
        });
        res.json(warehouse);
    } catch (error) {
        console.error('Create Warehouse Error:', error);
        res.status(500).json({ error: 'Error creating warehouse' });
    }
});

// Update warehouse
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, location, manager, isActive } = req.body;
    // Validate ID format
    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid warehouse ID' });
    }
    // Basic field validation
    if (name && typeof name !== 'string') {
        return res.status(400).json({ error: 'Invalid name' });
    }
    if (location && typeof location !== 'string') {
        return res.status(400).json({ error: 'Invalid location' });
    }
    try {
        const existing = await prisma.warehouse.findFirst({ where: { id, userId: req.userId } });
        if (!existing) return res.status(404).json({ error: 'Warehouse not found' });

        const warehouse = await prisma.warehouse.update({
            where: { id },
            data: { 
                name: name?.trim(),
                location: location?.trim(),
                manager: manager?.trim(),
                isActive
            }
        });
        res.json(warehouse);
    } catch (error) {
        console.error('Update Warehouse Error:', error);
        res.status(500).json({ error: 'Error updating warehouse' });
    }
});

// Delete warehouse
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await prisma.warehouse.findFirst({ where: { id, userId: req.userId } });
        if (!existing) return res.status(404).json({ error: 'Warehouse not found' });

        // Prevent deletion if inventory exists
        const inventoryCount = await prisma.warehouseInventory.count({ where: { warehouseId: id } });
        if (inventoryCount > 0) {
            return res.status(400).json({ error: 'Cannot delete warehouse with existing inventory' });
        }

        await prisma.warehouse.delete({ where: { id } });
        res.json({ message: 'warehouse deleted' });
    } catch (error) {
        console.error('Delete Warehouse Error:', error);
        res.status(500).json({ error: 'Error deleting warehouse' });
    }
});

// Transfer stock between warehouses
router.post('/transfer', async (req, res) => {
    const { productId, sourceWarehouseId, destinationWarehouseId, qty, notes } = req.body;
    
    // Validate required fields
    if (!productId || !sourceWarehouseId || !destinationWarehouseId || !qty) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const transferQty = parseInt(qty);
    if (isNaN(transferQty) || transferQty <= 0) {
        return res.status(400).json({ error: 'Quantity must be a positive integer' });
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
                throw new Error('Insufficient stock in source warehouse');
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
                create: { productId, warehouseId: destinationWarehouseId, qty: transferQty }
            });
            // 4. Record movement (sanitize notes)
            await tx.stockMovement.create({
                data: {
                    productId,
                    sourceId: sourceWarehouseId,
                    destinationId: destinationWarehouseId,
                    qty: transferQty,
                    type: 'TRANSFER',
                    userId: req.userId,
                    notes: notes ? notes.toString().substring(0, 200) : null
                }
            });
        });
        res.json({ message: 'Transfer successful' });
    } catch (error) {
        console.error('Transfer Error:', error);
        // Do not expose internal stack traces
        res.status(500).json({ error: error.message || 'Error processing transfer' });
    }
});

export default router;

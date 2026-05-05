import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get stock movements
router.get('/movements', async (req, res) => {
    try {
        const movements = await prisma.stockMovement.findMany({
            where: { userId: req.userId },
            include: {
                product: { select: { name: true, barcode: true } },
                source: { select: { name: true } },
                destination: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(movements);
    } catch (error) {
        res.status(500).json({ error: 'error fetching movements' });
    }
});

// Get inventory by warehouse
router.get('/warehouses/:warehouseId', async (req, res) => {
    const { warehouseId } = req.params;
    try {
        const inventory = await prisma.warehouseInventory.findMany({
            where: { 
                warehouseId,
                warehouse: { userId: req.userId }
            },
            include: {
                product: true
            }
        });
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ error: 'error fetching warehouse inventory' });
    }
});

// Transfer stock
router.post('/transfer', async (req, res) => {
    const { productId, fromWarehouseId, toWarehouseId, qty, notes } = req.body;
    
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Decrease from source
            const sourceInv = await tx.warehouseInventory.update({
                where: { productId_warehouseId: { productId, warehouseId: fromWarehouseId } },
                data: { qty: { decrement: qty } }
            });

            if (sourceInv.qty < 0) throw new Error('Insufficient stock in source warehouse');

            // 2. Increase in destination
            await tx.warehouseInventory.upsert({
                where: { productId_warehouseId: { productId, warehouseId: toWarehouseId } },
                create: { productId, warehouseId: toWarehouseId, qty },
                update: { qty: { increment: qty } }
            });

            // 3. Record movement
            await tx.stockMovement.create({
                data: {
                    productId,
                    sourceId: fromWarehouseId,
                    destinationId: toWarehouseId,
                    qty,
                    type: 'TRANSFER',
                    notes,
                    userId: req.userId
                }
            });
        });
        res.json({ message: 'Transfer successful' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add stock manually
router.post('/add', async (req, res) => {
    const { productId, warehouseId, qty, notes } = req.body;
    try {
        await prisma.$transaction(async (tx) => {
            await tx.warehouseInventory.upsert({
                where: { productId_warehouseId: { productId, warehouseId } },
                create: { productId, warehouseId, qty },
                update: { qty: { increment: qty } }
            });
            
            await tx.product.update({
                where: { id: productId },
                data: { stockQty: { increment: qty } }
            });

            await tx.stockMovement.create({
                data: {
                    productId,
                    destinationId: warehouseId,
                    qty,
                    type: 'ADD',
                    notes,
                    userId: req.userId
                }
            });
        });
        res.json({ message: 'Stock added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'error adding stock' });
    }
});

export default router;

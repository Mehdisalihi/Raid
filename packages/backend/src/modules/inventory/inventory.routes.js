import { Router } from 'express';
import prisma from '../../lib/prisma.js';

const router = Router();


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
            // 1. Verify ownership of product and both warehouses
            const [product, sourceWH, destWH] = await Promise.all([
                tx.product.findFirst({ where: { id: productId, userId: req.userId } }),
                tx.warehouse.findFirst({ where: { id: fromWarehouseId, userId: req.userId } }),
                tx.warehouse.findFirst({ where: { id: toWarehouseId, userId: req.userId } })
            ]);

            if (!product) throw new Error('Product not found or access denied');
            if (!sourceWH || !destWH) throw new Error('Warehouse not found or access denied');

            // 2. Decrease from source
            const sourceInv = await tx.warehouseInventory.update({
                where: { productId_warehouseId: { productId, warehouseId: fromWarehouseId } },
                data: { qty: { decrement: qty } }
            });

            if (sourceInv.qty < 0) throw new Error('Insufficient stock in source warehouse');

            // 3. Increase in destination
            await tx.warehouseInventory.upsert({
                where: { productId_warehouseId: { productId, warehouseId: toWarehouseId } },
                create: { productId, warehouseId: toWarehouseId, qty },
                update: { qty: { increment: qty } }
            });

            // 4. Record movement
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
            // Verify ownership
            const [product, warehouse] = await Promise.all([
                tx.product.findFirst({ where: { id: productId, userId: req.userId } }),
                tx.warehouse.findFirst({ where: { id: warehouseId, userId: req.userId } })
            ]);

            if (!product || !warehouse) throw new Error('Access denied to product or warehouse');

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
        res.status(500).json({ error: error.message || 'error adding stock' });
    }
});

export default router;

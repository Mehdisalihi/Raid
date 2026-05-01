import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all products
router.get('/', async (req, res) => {
    const { warehouseId } = req.query;
    console.log(`GET /v1/products - request received. Warehouse: ${warehouseId || 'ALL'}`);
    try {
        const query = {
            orderBy: { createdAt: 'desc' },
            include: {
                WarehouseInventory: true
            }
        };

        const products = await prisma.product.findMany(query);
        
        // If a warehouseId is provided, we map the stockQty to show ONLY that warehouse's qty
        const mappedProducts = products.map(p => {
            if (warehouseId) {
                const whInv = p.WarehouseInventory.find(wi => wi.warehouseId === warehouseId);
                return {
                    ...p,
                    stockQty: whInv ? whInv.qty : 0
                };
            }
            return p;
        });

        res.json(mappedProducts);
    } catch (error) {
        console.error('GET /v1/products - ERROR:', error);
        res.status(500).json({ error: 'error fetching products' });
    }
});

// Create product
router.post('/', async (req, res) => {
    const { name, barcode, buyPrice, sellPrice, stockQty, minStockAlert, warehouseId } = req.body;
    try {
        const product = await prisma.$transaction(async (tx) => {
            const newProduct = await tx.product.create({
                data: {
                    name,
                    barcode: barcode && barcode.trim() !== '' ? barcode.trim() : null,
                    buyPrice: parseFloat(buyPrice),
                    sellPrice: parseFloat(sellPrice),
                    stockQty: parseInt(stockQty || 0),
                    minStockAlert: parseInt(minStockAlert || 5),
                },
            });

            if (warehouseId && parseInt(stockQty || 0) > 0) {
                await tx.warehouseInventory.create({
                    data: {
                        productId: newProduct.id,
                        warehouseId: warehouseId,
                        qty: parseInt(stockQty)
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        productId: newProduct.id,
                        destinationId: warehouseId,
                        qty: parseInt(stockQty),
                        type: 'ADD',
                        notes: 'Initial stock'
                    }
                });
            }

            return newProduct;
        });
        res.json(product);
    } catch (error) {
        console.error('POST /products - error:', error);
        res.status(500).json({ error: 'error creating product' });
    }
});

// Update product
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, barcode, buyPrice, sellPrice, stockQty, minStockAlert } = req.body;
    try {
        const product = await prisma.product.update({
            where: { id },
            data: {
                name,
                barcode: barcode && barcode.trim() !== '' ? barcode.trim() : null,
                buyPrice: parseFloat(buyPrice),
                sellPrice: parseFloat(sellPrice),
                stockQty: parseInt(stockQty),
                minStockAlert: parseInt(minStockAlert),
            },
        });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'error updating product' });
    }
});

router.post('/import', async (req, res) => {
    const { products } = req.body;
    console.log(`POST /import - received ${products?.length || 0} products`);
    if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: 'No products provided' });
    }
    try {
        const data = products.map((p, index) => {
            try {
                return {
                    name: String(p.name || '').trim(),
                    barcode: p.barcode && String(p.barcode).trim() !== '' ? String(p.barcode).trim() : null,
                    buyPrice: parseFloat(p.buyPrice) || 0,
                    sellPrice: parseFloat(p.sellPrice) || 0,
                    stockQty: parseInt(p.stockQty) || 0,
                    minStockAlert: parseInt(p.minStockAlert) || 5,
                };
            } catch (e) {
                console.error(`Error processing product at index ${index}:`, p, e);
                throw e;
            }
        }).filter(p => p.name.length > 0);

        console.log(`POST /import - cleaned data size: ${data.length}`);
        
        // 1. Identify all barcodes in the incoming set
        const incomingBarcodes = data.map(p => p.barcode).filter(b => b !== null);
        
        // 2. Map incoming products by barcode for quick lookup
        // If duplicates exist in the file, the LAST ONE will win (intentional update)
        const productsByBarcode = {};
        const newProductsWithoutBarcode = [];
        for (const p of data) {
            if (p.barcode) productsByBarcode[p.barcode] = p;
            else newProductsWithoutBarcode.push(p);
        }

        // 3. Find which ones already exist in the database
        const existingProducts = await prisma.product.findMany({
            where: { barcode: { in: incomingBarcodes } },
            select: { id: true, barcode: true }
        });
        const existingBarcodesIds = {};
        existingProducts.forEach(p => { existingBarcodesIds[p.barcode] = p.id; });

        // 4. Categorize: Keep for CREATE or UPDATE
        const toUpdate = [];
        const toCreate = [...newProductsWithoutBarcode];

        Object.keys(productsByBarcode).forEach(bc => {
            if (existingBarcodesIds[bc]) {
                toUpdate.push({ id: existingBarcodesIds[bc], ...productsByBarcode[bc] });
            } else {
                toCreate.push(productsByBarcode[bc]);
            }
        });

        console.log(`POST /import - Upsert Plan: ${toUpdate.length} updates, ${toCreate.length} creations`);

        // 5. Execute within a transaction
        let createdCount = 0;
        let updatedCount = 0;

        await prisma.$transaction(async (tx) => {
            // Find default warehouse
            const defaultWarehouse = await tx.warehouse.findFirst({ orderBy: { createdAt: 'asc' } });
            
            // Bulk Create
            if (toCreate.length > 0) {
                for (const p of toCreate) {
                    const newProduct = await tx.product.create({ data: p });
                    createdCount++;
                    
                    if (defaultWarehouse && p.stockQty > 0) {
                        await tx.warehouseInventory.create({
                            data: {
                                productId: newProduct.id,
                                warehouseId: defaultWarehouse.id,
                                qty: p.stockQty
                            }
                        });
                        
                        await tx.stockMovement.create({
                            data: {
                                productId: newProduct.id,
                                destinationId: defaultWarehouse.id,
                                qty: p.stockQty,
                                type: 'IMPORT',
                                notes: 'Excel Import'
                            }
                        });
                    }
                }
            }

            // Sequential (but in tx) Updates
            for (const p of toUpdate) {
                try {
                    const { id, ...updateData } = p;
                    await tx.product.update({
                        where: { id },
                        data: updateData
                    });
                    
                    if (defaultWarehouse && updateData.stockQty !== undefined) {
                        // Use upsert to handle both create and update for inventory
                        await tx.warehouseInventory.upsert({
                            where: { 
                                productId_warehouseId: { 
                                    productId: id, 
                                    warehouseId: defaultWarehouse.id 
                                } 
                            },
                            update: { qty: updateData.stockQty },
                            create: {
                                productId: id,
                                warehouseId: defaultWarehouse.id,
                                qty: updateData.stockQty
                            }
                        });
                    }
                    updatedCount++;
                } catch (err) {
                    console.error(`Failed to update product ${p.barcode || p.name}:`, err);
                    // Continue with other products instead of crashing the whole transaction if one fails?
                    // Actually, it's in a transaction, so it will roll back.
                    throw err; 
                }
            }
        }, { timeout: 60000 }); // 60 seconds timeout for large imports

        console.log(`POST /import - SUCCESS: ${createdCount} created, ${updatedCount} updated`);
        res.json({ created: createdCount, updated: updatedCount });
    } catch (error) {
        console.error('POST /products/import - SERVER ERROR:', error);
        res.status(500).json({ error: 'error importing products', details: error.message });
    }
});

// Delete product
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Check if the product has any sales associated with it
        const saleCount = await prisma.saleItem.count({
            where: { productId: id }
        });

        if (saleCount > 0) {
            return res.status(400).json({ 
                error: 'cannot_delete_product_with_history',
                message: 'لا يمكن حذف المنتج لأنه مرتبط بسجلات مبيعات أو مشتريات في النظام. يمكنك تعديل بياناته أو تصفير مخزونه بدلاً من الحذف.'
            });
        }

        // 2. Delete related records in a transaction
        await prisma.$transaction(async (tx) => {
            // Delete from WarehouseInventory
            await tx.warehouseInventory.deleteMany({ where: { productId: id } });
            
            // Delete from StockMovement
            await tx.stockMovement.deleteMany({ where: { productId: id } });

            // Finally delete the product
            await tx.product.delete({ where: { id } });
        });

        res.json({ message: 'product deleted' });
    } catch (error) {
        console.error('DELETE /products/:id - error:', error);
        res.status(500).json({ error: 'error deleting product', details: error.message });
    }
});

export default router;

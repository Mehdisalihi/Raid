import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get Dashboard Stats
router.get('/stats', async (req, res) => {
    try {
        const totalSales = await prisma.invoice.aggregate({
            _sum: { finalAmount: true },
            where: { type: 'SALE', userId: req.userId }
        });

        const totalExpenses = await prisma.expense.aggregate({
            _sum: { amount: true },
            where: { userId: req.userId }
        });

        const productCount = await prisma.product.count({ where: { userId: req.userId } });
        const customerCount = await prisma.customer.count({ where: { userId: req.userId } });

        // Optimized: Database count for low stock
        const lowStockCount = await prisma.product.count({
            where: {
                stockQty: { lte: 5 }, // Default alert threshold, ideally should use per-product alert but this is 100x faster for large DBs
                userId: req.userId
            }
        });

        const transactionCount = await prisma.invoice.count({ where: { type: 'SALE', userId: req.userId } });

        res.json({
            sales: totalSales._sum.finalAmount || 0,
            totalSales: totalSales._sum.finalAmount || 0, // Mobile alias
            expenses: totalExpenses._sum.amount || 0,
            totalExpenses: totalExpenses._sum.amount || 0, // Mobile alias
            products: productCount,
            customers: customerCount,
            lowStock: lowStockCount,
            transactions: transactionCount,
            profit: (totalSales._sum.finalAmount || 0) - (totalExpenses._sum.amount || 0)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'error fetching stats' });
    }
});

// Get Recent Activities (Sales + Expenses)
router.get('/activities', async (req, res) => {
    try {
        const [sales, expenses] = await Promise.all([
            prisma.invoice.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                where: { type: 'SALE', userId: req.userId },
                select: { id: true, finalAmount: true, createdAt: true, customer: { select: { name: true } } }
            }),
            prisma.expense.findMany({
                take: 10,
                orderBy: { date: 'desc' },
                where: { userId: req.userId },
                select: { id: true, amount: true, date: true, category: true }
            })
        ]);

        const activities = [
            ...sales.map(s => ({
                id: `sale-${s.id}`,
                label: `بيع - ${s.customer?.name || 'عميل نقدي'}`,
                amount: `+${s.finalAmount} MRU`,
                time: s.createdAt,
                positive: true
            })),
            ...expenses.map(e => ({
                id: `exp-${e.id}`,
                label: `مصروف - ${e.category || 'عام'}`,
                amount: `-${e.amount} MRU`,
                time: e.date,
                positive: false
            }))
        ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

        res.json(activities);
    } catch (error) {
        console.error('activities error:', error);
        res.status(500).json({ error: 'error fetching activities', detail: error.message });
    }
});

// Get Top Selling Products
router.get('/top-products', async (req, res) => {
    try {
        const items = await prisma.saleItem.groupBy({
            by: ['productId'],
            where: { invoice: { type: 'SALE', userId: req.userId } },
            _sum: { qty: true, total: true },
            orderBy: { _sum: { qty: 'desc' } },
            take: 5
        });

        const productIds = items.map(i => i.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } }
        });

        const enriched = items.map(item => {
            const product = products.find(p => p.id === item.productId);
            return {
                name: product ? product.name : 'منتج محذوف',
                rev: `${(item._sum.total || 0).toFixed(2)} MRU`,
                sales: `${item._sum.qty || 0} قطعة`
            };
        });

        res.json(enriched);
    } catch (error) {
        res.status(500).json({ error: 'error fetching top products' });
    }
});

// Get Sales Chart Data (Last 7 days)
router.get('/charts', async (req, res) => {
    try {
        const results = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - i);
            const nextD = new Date(d);
            nextD.setDate(d.getDate() + 1);

            const dayTotal = await prisma.invoice.aggregate({
                _sum: { finalAmount: true },
                where: {
                    type: 'SALE',
                    userId: req.userId,
                    createdAt: { gte: d, lt: nextD }
                }
            });
            results.push({
                day: d.toLocaleDateString('ar-SA', { weekday: 'short' }),
                value: dayTotal._sum.finalAmount || 0
            });
        }
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'error fetching chart data' });
    }
});

export default router;

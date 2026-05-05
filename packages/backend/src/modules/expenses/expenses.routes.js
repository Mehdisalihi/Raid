import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all expenses
router.get('/', async (req, res) => {
    try {
        const expenses = await prisma.expense.findMany({
            where: { userId: req.userId },
            orderBy: { date: 'desc' },
        });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: 'error fetching expenses' });
    }
});

// Get expense categories (Dynamic from database)
router.get('/categories', async (req, res) => {
    try {
        let categories = await prisma.expenseCategory.findMany({
            where: { userId: req.userId },
            orderBy: { name: 'asc' }
        });

        // Seed default categories if none exist
        if (categories.length === 0) {
            const defaults = [
                { name: 'إيجار / Loyer', userId: req.userId },
                { name: 'فواتير / Factures', userId: req.userId },
                { name: 'رواتب / Salaires', userId: req.userId },
                { name: 'صيانة / Maintenance', userId: req.userId },
                { name: 'أخرى / Divers', userId: req.userId },
            ];
            await prisma.expenseCategory.createMany({ data: defaults });
            categories = await prisma.expenseCategory.findMany({ where: { userId: req.userId }, orderBy: { name: 'asc' } });
        }

        res.json(categories.map(c => ({ id: c.id, name: c.name })));
    } catch (error) {
        res.status(500).json({ error: 'error fetching categories' });
    }
});

// Create expense
router.post('/', async (req, res) => {
    const { title, amount, category, categoryId, description, date } = req.body;
    try {
        const expense = await prisma.expense.create({
            data: {
                title: title || description || 'مصروف عام',
                amount: parseFloat(amount),
                category: category || categoryId || 'عام',
                description: description || title,
                date: date ? new Date(date) : new Date(),
                userId: req.userId
            },
        });
        res.json(expense);
    } catch (error) {
        console.error('Create expense error:', error);
        res.status(500).json({ error: 'error creating expense' });
    }
});

// Update expense
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, amount, date, category, categoryId } = req.body;
    try {
        const existing = await prisma.expense.findFirst({ where: { id, userId: req.userId } });
        if (!existing) return res.status(404).json({ error: 'Expense not found' });

        const expense = await prisma.expense.update({
            where: { id },
            data: {
                title: title || undefined,
                description: description || undefined,
                amount: amount ? parseFloat(amount) : undefined,
                category: category || categoryId || undefined,
                date: date ? new Date(date) : undefined
            },
        });
        res.json(expense);
    } catch (error) {
        res.status(500).json({ error: 'error updating expense' });
    }
});

// Delete expense
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await prisma.expense.findFirst({ where: { id, userId: req.userId } });
        if (!existing) return res.status(404).json({ error: 'Expense not found' });

        await prisma.expense.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'error deleting expense' });
    }
});

export default router;

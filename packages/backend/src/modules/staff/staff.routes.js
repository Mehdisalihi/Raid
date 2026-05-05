import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all staff
router.get('/', async (req, res) => {
    try {
        const staff = await prisma.staff.findMany({
            where: { userId: req.userId },
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { Transactions: true }
                }
            }
        });
        res.json(staff);
    } catch (error) {
        console.error('Fetch staff error:', error);
        res.status(500).json({ error: 'error fetching staff' });
    }
});

// Create staff member
router.post('/', async (req, res) => {
    const { name, phone, role, baseSalary, joinedAt } = req.body;
    try {
        const staff = await prisma.staff.create({
            data: { 
                name, 
                phone, 
                role, 
                baseSalary: parseFloat(baseSalary || 0),
                joinedAt: joinedAt ? new Date(joinedAt) : new Date(),
                userId: req.userId
            },
        });
        res.json(staff);
    } catch (error) {
        console.error('Create staff error:', error);
        res.status(500).json({ error: 'error creating staff' });
    }
});

// Update staff member
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, role, baseSalary, isActive, joinedAt } = req.body;
    try {
        const existing = await prisma.staff.findFirst({ where: { id, userId: req.userId } });
        if (!existing) return res.status(404).json({ error: 'Staff not found' });

        const staff = await prisma.staff.update({
            where: { id },
            data: { 
                name, 
                phone, 
                role, 
                baseSalary: parseFloat(baseSalary || 0),
                isActive: isActive !== undefined ? isActive : true,
                joinedAt: joinedAt ? new Date(joinedAt) : undefined
            },
        });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ error: 'error updating staff' });
    }
});

// Add Salary Transaction (Payment, Advance, or Manual Salary Credit)
router.post('/:id/transactions', async (req, res) => {
    const { id } = req.params;
    const { type, amount, description, date } = req.body;
    
    try {
        const amt = parseFloat(amount || 0);
        
        // Transaction using Prisma transaction to ensure balance is updated
        const result = await prisma.$transaction(async (tx) => {
            // Get current staff record to find current balance
            const currentStaff = await tx.staff.findFirst({
                where: { id, userId: req.userId },
                select: { balance: true }
            });

            if (!currentStaff) throw new Error('Staff member not found');

            const amt = parseFloat(amount || 0);
            // SALARY (Credit) increases balance (money owed to employee)
            // PAYMENT/ADVANCE (Debit) decreases balance
            const balanceChange = type === 'SALARY' ? amt : -amt;
            const newBalance = currentStaff.balance + balanceChange;

            const transaction = await tx.salaryTransaction.create({
                data: {
                    staffId: id,
                    type, // "SALARY", "PAYMENT", "ADVANCE"
                    amount: amt,
                    balanceAfter: newBalance,
                    description,
                    date: date ? new Date(date) : new Date()
                }
            });

            const updatedStaff = await tx.staff.update({
                where: { id },
                data: {
                    balance: newBalance
                }
            });

            return { transaction, updatedStaff };
        });

        res.json(result);
    } catch (error) {
        console.error('Salary transaction error:', error);
        res.status(500).json({ error: 'error processing transaction' });
    }
});

// Get Staff Statement
router.get('/:id/statement', async (req, res) => {
    const { id } = req.params;
    try {
        const statement = await prisma.staff.findFirst({
            where: { id, userId: req.userId },
            include: {
                Transactions: {
                    orderBy: { date: 'desc' }
                }
            }
        });

        if (!statement) return res.status(404).json({ error: 'Staff member not found' });

        res.json(statement);
    } catch (error) {
        res.status(500).json({ error: 'error fetching statement' });
    }
});

// Delete staff
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await prisma.staff.findFirst({ where: { id, userId: req.userId } });
        if (!existing) return res.status(404).json({ error: 'Staff not found' });

        await prisma.staff.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'error deleting staff' });
    }
});

export default router;

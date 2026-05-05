import { Router } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all users
router.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { id: req.userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                isActive: true,
                canAccessSales: true,
                canCreateInvoices: true,
                canManageInventory: true,
                canViewReports: true,
                canManageCustomers: true,
                canManageExpenses: true,
                canAccessSettings: true,
                language: true,
                theme: true,
                primaryColor: true,
                storeName: true,
                storeTaxId: true,
                storeAddress: true,
                storePhone: true,
                storeEmail: true,
                currency: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'حدث خطأ في جلب المستخدمين' });
    }
});

// Create new user
router.post('/', async (req, res) => {
    const { 
        name, email, password, phone, role,
        canAccessSales, canCreateInvoices, canManageInventory,
        canViewReports, canManageCustomers, canManageExpenses, canAccessSettings,
        storeName, storeTaxId, storeAddress, storePhone, storeEmail, currency
    } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' });
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                phone,
                role: role || 'USER',
                canAccessSales: canAccessSales ?? true,
                canCreateInvoices: canCreateInvoices ?? true,
                canManageInventory: canManageInventory ?? true,
                canViewReports: canViewReports ?? false,
                canManageCustomers: canManageCustomers ?? true,
                canManageExpenses: canManageExpenses ?? false,
                canAccessSettings: canAccessSettings ?? false,
                storeName,
                storeTaxId,
                storeAddress,
                storePhone,
                storeEmail,
                currency
            }
        });

        res.status(201).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'حدث خطأ أثناء إنشاء المستخدم' });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    if (id !== req.userId) {
        return res.status(403).json({ error: 'غير مصرح لك بتعديل بيانات مستخدم آخر' });
    }
    const { 
        name, email, phone, role, isActive, password,
        canAccessSales, canCreateInvoices, canManageInventory,
        canViewReports, canManageCustomers, canManageExpenses, canAccessSettings,
        language, theme, primaryColor,
        storeName, storeTaxId, storeAddress, storePhone, storeEmail, currency
    } = req.body;

    try {
        const data = {
            name,
            email,
            phone,
            role,
            isActive,
            canAccessSales,
            canCreateInvoices,
            canManageInventory,
            canViewReports,
            canManageCustomers,
            canManageExpenses,
            canAccessSettings,
            language,
            theme,
            primaryColor,
            storeName,
            storeTaxId,
            storeAddress,
            storePhone,
            storeEmail,
            currency
        };

        if (password) {
            data.passwordHash = await bcrypt.hash(password, 12);
        }

        const user = await prisma.user.update({
            where: { id },
            data
        });

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث المستخدم' });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    if (id !== req.userId) {
        return res.status(403).json({ error: 'غير مصرح لك بحذف مستخدم آخر' });
    }
    try {
        await prisma.user.delete({ where: { id } });
        res.json({ message: 'تم حذف المستخدم بنجاح' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'حدث خطأ أثناء حذف المستخدم' });
    }
});

export default router;

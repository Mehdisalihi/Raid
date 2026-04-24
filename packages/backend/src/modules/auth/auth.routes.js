import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isActive: user.isActive,
                canAccessSales: user.canAccessSales,
                canCreateInvoices: user.canCreateInvoices,
                canManageInventory: user.canManageInventory,
                canViewReports: user.canViewReports,
                canManageCustomers: user.canManageCustomers,
                canManageExpenses: user.canManageExpenses,
                canAccessSettings: user.canAccessSettings,
                language: user.language,
                theme: user.theme,
                primaryColor: user.primaryColor,
                storeName: user.storeName,
                storeTaxId: user.storeTaxId,
                storeAddress: user.storeAddress,
                storePhone: user.storePhone,
                storeEmail: user.storeEmail,
                currency: user.currency
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'حدث خطأ في الخادم' });
    }
});

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'الرجاء إدخال جميع الحقول' });
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
                role: 'USER', // default role
            }
        });

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isActive: user.isActive,
                canAccessSales: user.canAccessSales,
                canCreateInvoices: user.canCreateInvoices,
                canManageInventory: user.canManageInventory,
                canViewReports: user.canViewReports,
                canManageCustomers: user.canManageCustomers,
                canManageExpenses: user.canManageExpenses,
                canAccessSettings: user.canAccessSettings,
                language: user.language,
                theme: user.theme,
                primaryColor: user.primaryColor,
                storeName: user.storeName,
                storeTaxId: user.storeTaxId,
                storeAddress: user.storeAddress,
                storePhone: user.storePhone,
                storeEmail: user.storeEmail,
                currency: user.currency
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'حدث خطأ في الخادم' });
    }
});

router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isActive: user.isActive,
            canAccessSales: user.canAccessSales,
            canCreateInvoices: user.canCreateInvoices,
            canManageInventory: user.canManageInventory,
            canViewReports: user.canViewReports,
            canManageCustomers: user.canManageCustomers,
            canManageExpenses: user.canManageExpenses,
            canAccessSettings: user.canAccessSettings,
            language: user.language,
            theme: user.theme,
            primaryColor: user.primaryColor,
            storeName: user.storeName,
            storeTaxId: user.storeTaxId,
            storeAddress: user.storeAddress,
            storePhone: user.storePhone,
            storeEmail: user.storeEmail,
            currency: user.currency
        });
    } catch (e) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

export default router;

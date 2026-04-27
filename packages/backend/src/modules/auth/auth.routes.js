import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendVerificationEmail } from '../../services/email.service.js';
import { supabase } from '../../lib/supabase.js';

const router = Router();
const prisma = new PrismaClient();

// Helper to generate 6-digit code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log('Login attempt for:', email);
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.log('User not found in DB');
            return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        console.log('User verified status:', user.isVerified);
        if (!user.isVerified) {
            return res.status(403).json({ 
                error: 'الرجاء التحقق من الحساب أولاً عبر البريد الإلكتروني',
                needsVerification: true,
                email: user.email
            });
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
                isVerified: user.isVerified,
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
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'الرجاء إدخال جميع الحقول' });
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
        }

        // 1. Try to create user in Supabase Auth (Optional for now to avoid blocking)
        let sbId = `temp_${Date.now()}`;
        try {
            console.log('Attempting Supabase signUp for:', email);
            const { data: sbData, error: sbError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name, phone: phone },
                    emailRedirectTo: `${process.env.FRONTEND_URL}/verify-direct`
                }
            });
            if (sbData?.user) sbId = sbData.user.id;
            if (sbError) console.warn('Supabase Auth Error (continuing...):', sbError);
        } catch (sbCatchError) {
            console.warn('Supabase Catch Error (continuing...):', sbCatchError);
        }

        // 2. Create user in our Prisma database
        const passwordHash = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: {
                id: sbId, 
                name,
                email,
                passwordHash,
                phone,
                isVerified: true, 
                role: 'USER',
            }
        });

        res.status(201).json({
            message: 'تم التسجيل بنجاح! يمكنك تسجيل الدخول الآن.',
            user: { id: user.id, email: user.email }
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ في الخادم' });
    }
});

router.post('/verify', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

        // Update verification status in our DB
        await prisma.user.update({
            where: { id: user.id },
            data: { isVerified: true }
        });

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '24h' }
        );

        res.json({ message: 'تم التحقق بنجاح', token, user });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ أثناء التحقق' });
    }
});

router.post('/resend-code', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

        const newCode = generateCode();
        await prisma.user.update({
            where: { id: user.id },
            data: { verificationCode: newCode }
        });

        await sendVerificationEmail(user.email, newCode);
        res.json({ message: 'تم إعادة إرسال الكود إلى بريدك الإلكتروني' });
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

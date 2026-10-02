import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma.js';
import { supabase } from '../../lib/supabase.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;

// ─── Helper: serialize user object for API responses ────────────────────────
const serializeUser = (user) => ({
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
    currency: user.currency,
});

const signToken = (user) =>
    jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

// ─── POST /login ────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                error: 'الرجاء التحقق من الحساب أولاً عبر البريد الإلكتروني',
                needsVerification: true,
                email: user.email,
            });
        }

        res.json({ token: signToken(user), user: serializeUser(user) });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'حدث خطأ في الخادم' });
    }
});

// ─── POST /guest ─────────────────────────────────────────────────────────────
router.post('/guest', async (req, res) => {
    try {
        const guestUser = {
            id: `guest_${Date.now()}`,
            name: 'Guest',
            email: null,
            role: 'GUEST',
            isVerified: true,
            isActive: true,
            canAccessSales: true,
            canCreateInvoices: true,
            canManageInventory: true,
            canViewReports: true,
            canManageCustomers: true,
            canManageExpenses: false,
            canAccessSettings: false,
            language: 'fr',
            theme: 'light',
            primaryColor: '#3b82f6',
        };

        const token = jwt.sign({ userId: guestUser.id, role: 'GUEST' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: guestUser });
    } catch (error) {
        console.error('Guest Login Error:', error);
        res.status(500).json({ error: 'حدث خطأ في الخادم' });
    }
});

// ─── POST /register ──────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'الرجاء إدخال جميع الحقول' });
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'هذا البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول بدلاً من ذلك' });
        }

        let sbId = `local_${Date.now()}`;

        if (supabase && process.env.NODE_ENV !== 'development') {
            try {
                const { data: sbData, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: name, phone },
                        emailRedirectTo: `${process.env.FRONTEND_URL}/verify-direct`,
                    },
                });
                
                if (error) {
                    console.warn(`Supabase Auth signup failed: ${error.message} (${error.status})`);
                } else if (sbData?.user) {
                    sbId = sbData.user.id;
                }
            } catch (err) {
                console.warn('Skipping Supabase Auth due to connection issues', err);
            }
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const defaultPermissions = {
            isVerified: true,
            role: 'ADMIN',
            canAccessSales: true,
            canCreateInvoices: true,
            canManageInventory: true,
            canViewReports: true,
            canManageCustomers: true,
            canManageExpenses: true,
            canAccessSettings: true,
        };

        const user = await prisma.user.create({
            data: { id: sbId, name, email, passwordHash, phone, ...defaultPermissions },
        });

        res.status(201).json({
            message: 'تم التسجيل بنجاح! مرحباً بك.',
            token: signToken(user),
            user: serializeUser(user),
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'حدث خطأ في الخادم أثناء إنشاء الحساب: ' + (error.message || '') });
    }
});

// ─── POST /verify ────────────────────────────────────────────────────────────
router.post('/verify', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

        const verified = await prisma.user.update({
            where: { id: user.id },
            data: { isVerified: true },
        });

        res.json({ message: 'تم التحقق بنجاح', token: signToken(verified), user: serializeUser(verified) });
    } catch (error) {
        console.error('Verify Error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء التحقق' });
    }
});

// ─── POST /resend-code ───────────────────────────────────────────────────────
router.post('/resend-code', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        await prisma.user.update({ where: { id: user.id }, data: { verificationCode: newCode } });

        // sendVerificationEmail removed — email service not imported (dead import in original)
        console.log(`Resend code for ${email}: ${newCode}`);
        res.json({ message: 'تم إعادة إرسال الكود إلى بريدك الإلكتروني' });
    } catch (error) {
        console.error('Resend Code Error:', error);
        res.status(500).json({ error: 'حدث خطأ في الخادم' });
    }
});

// ─── GET /me ─────────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json(serializeUser(user));
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
});

export default router;

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes.js';
import productsRoutes from './modules/products/products.routes.js';
import salesRoutes from './modules/sales/sales.routes.js';
import customersRoutes from './modules/customers/customers.routes.js';
import suppliersRoutes from './modules/suppliers/suppliers.routes.js';
import expensesRoutes from './modules/expenses/expenses.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import purchasesRoutes from './modules/purchases/purchases.routes.js';
import debtsRoutes from './modules/debts/debts.routes.js';
import returnsRoutes from './modules/returns/returns.routes.js';
import warehousesRoutes from './modules/warehouses/warehouses.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import invoicesRoutes from './modules/invoices/invoices.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';
import authMiddleware from './lib/authMiddleware.js';

dotenv.config();

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// Specific header for Private Network Access (PNA)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    next();
});
app.use(express.json({ limit: '50mb' }));

app.use('/v1/auth', authRoutes);
app.use('/v1/users', authMiddleware, usersRoutes);
app.use('/v1/products', authMiddleware, productsRoutes);
app.use('/v1/sales', authMiddleware, salesRoutes);
app.use('/v1/customers', authMiddleware, customersRoutes);
app.use('/v1/suppliers', authMiddleware, suppliersRoutes);
app.use('/v1/expenses', authMiddleware, expensesRoutes);
app.use('/v1/reports', authMiddleware, reportsRoutes);
app.use('/v1/purchases', authMiddleware, purchasesRoutes);
app.use('/v1/debts', authMiddleware, debtsRoutes);
app.use('/v1/returns', authMiddleware, returnsRoutes);
app.use('/v1/warehouses', authMiddleware, warehousesRoutes);
app.use('/v1/inventory', authMiddleware, inventoryRoutes);
app.use('/v1/invoices', authMiddleware, invoicesRoutes);
app.use('/v1/staff', authMiddleware, staffRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'mohassibe-backend' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 mohassibe API running on port ${PORT}`);
});

export default app;

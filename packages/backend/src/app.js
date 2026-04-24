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

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/v1/auth', authRoutes);
app.use('/v1/users', usersRoutes);
app.use('/v1/products', productsRoutes);
app.use('/v1/sales', salesRoutes);
app.use('/v1/customers', customersRoutes);
app.use('/v1/suppliers', suppliersRoutes);
app.use('/v1/expenses', expensesRoutes);
app.use('/v1/reports', reportsRoutes);
app.use('/v1/purchases', purchasesRoutes);
app.use('/v1/debts', debtsRoutes);
app.use('/v1/returns', returnsRoutes);
app.use('/v1/warehouses', warehousesRoutes);
app.use('/v1/inventory', inventoryRoutes);
app.use('/v1/invoices', invoicesRoutes);
app.use('/v1/staff', staffRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'mohassibe-backend' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 mohassibe API running on port ${PORT}`);
});

export default app;

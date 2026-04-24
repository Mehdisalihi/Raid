import React, { useState } from 'react';
import { useAppStore } from './hooks/useAppStore';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import Products from './pages/Products';
import Customers from './pages/Customers';
import DailyInvoice from './pages/DailyInvoice';
import CustomerInvoice from './pages/CustomerInvoice';
import DebtInvoice from './pages/DebtInvoice';
import Expenses from './pages/Expenses';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory';
import Returns from './pages/Returns';
import Archive from './pages/Archive';
import Debtors from './pages/Debtors';
import Creditors from './pages/Creditors';
import Purchases from './pages/Purchases';
import CustomerStatement from './pages/CustomerStatement';
import Settings from './pages/Settings';
import Invoices from './pages/Invoices';
import SalesManager from './pages/SalesManager';
import Layout from './components/layout/Layout';

import { translations } from './i18n/translations';

const App = () => {
    const { currentUser, language, activePage, setActivePage } = useAppStore();
    const t = translations[language];

    if (!currentUser) {
        return <Auth />;
    }

    const renderPage = () => {
        switch (activePage) {
            case 'dashboard': return <Dashboard />;
            case 'products': return <Products />;
            case 'customers': return <Customers />;
            case 'sales-invoice': return <SalesManager />;
            case 'invoices': return <Invoices />;
            case 'expenses': return <Expenses />;
            case 'sales': return <Sales />;
            case 'inventory': return <Inventory />;
            case 'returns': return <Returns />;
            case 'archive': return <Archive />;
            case 'debtors': return <Debtors />;
            case 'creditors': return <Creditors />;
            case 'statement': return <CustomerStatement />;
            case 'settings': return <Settings />;
            default: return <div className="card glass">{t.pageUnderDevelopment}</div>;
        }
    };

    return (
        <Layout>
            {renderPage()}
        </Layout>
    );
};

export default App;

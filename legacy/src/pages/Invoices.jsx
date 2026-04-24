import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { translations } from '../i18n/translations';
import DebtInvoice from './DebtInvoice';
import Purchases from './Purchases';
import { CreditCard, Truck } from 'lucide-react';
import { motion } from 'framer-motion';

const Invoices = () => {
    const { language, invoiceMode, setInvoiceMode } = useAppStore();
    const t = translations[language];
    const [mode, setMode] = useState(invoiceMode); // 'debt' or 'purchases'

    React.useEffect(() => {
        setMode(invoiceMode);
    }, [invoiceMode]);

    const handleModeChange = (newMode) => {
        setMode(newMode);
        setInvoiceMode(newMode);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
            <div className="no-print" style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '0.6rem',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
                borderRadius: '24px',
                width: 'fit-content',
                margin: '0 auto',
                boxShadow: 'var(--shadow-premium)'
            }}>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleModeChange('debt')}
                    style={{
                        padding: '1rem 2rem',
                        borderRadius: '18px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontWeight: 800,
                        fontSize: '1rem',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: mode === 'debt' ? 'var(--primary)' : 'transparent',
                        color: mode === 'debt' ? 'white' : 'var(--text-muted)',
                        boxShadow: mode === 'debt' ? '0 10px 20px var(--primary-glow)' : 'none'
                    }}
                >
                    <CreditCard size={20} />
                    <span>{t.debtInvoice}</span>
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleModeChange('purchases')}
                    style={{
                        padding: '1rem 2rem',
                        borderRadius: '18px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontWeight: 800,
                        fontSize: '1rem',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: mode === 'purchases' ? 'var(--primary)' : 'transparent',
                        color: mode === 'purchases' ? 'white' : 'var(--text-muted)',
                        boxShadow: mode === 'purchases' ? '0 10px 20px var(--primary-glow)' : 'none'
                    }}
                >
                    <Truck size={22} />
                    <span>{t.purchaseInvoice}</span>
                </motion.button>
            </div>

            <div style={{ flex: 1 }}>
                {mode === 'debt' ? <DebtInvoice /> : <Purchases />}
            </div>
        </div>
    );
};

export default Invoices;

import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { translations } from '../i18n/translations';
import DailyInvoice from './DailyInvoice';
import CustomerInvoice from './CustomerInvoice';
import { ShoppingCart, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

const SalesManager = () => {
    const { language } = useAppStore();
    const t = translations[language];
    const [mode, setMode] = useState('daily');

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="no-print"
                style={{
                    display: 'flex',
                    gap: '0.75rem',
                    padding: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '24px',
                    width: 'fit-content',
                    margin: '0 auto',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                }}
            >
                <button
                    onClick={() => setMode('daily')}
                    className="btn"
                    style={{
                        padding: '1rem 2rem',
                        borderRadius: '18px',
                        background: mode === 'daily' ? 'linear-gradient(135deg, var(--primary), #ea580c)' : 'transparent',
                        color: mode === 'daily' ? 'white' : 'var(--text-muted)',
                        boxShadow: mode === 'daily' ? '0 8px 16px var(--primary-glow)' : 'none',
                        border: 'none',
                        letterSpacing: '0.5px'
                    }}
                >
                    <ShoppingCart size={20} />
                    <span>{t.dailySale}</span>
                </button>
                <button
                    onClick={() => setMode('custom')}
                    className="btn"
                    style={{
                        padding: '1rem 2rem',
                        borderRadius: '18px',
                        background: mode === 'custom' ? 'linear-gradient(135deg, var(--primary), #ea580c)' : 'transparent',
                        color: mode === 'custom' ? 'white' : 'var(--text-muted)',
                        boxShadow: mode === 'custom' ? '0 8px 16px var(--primary-glow)' : 'none',
                        border: 'none',
                        letterSpacing: '0.5px'
                    }}
                >
                    <UserPlus size={20} />
                    <span>{t.customerSale}</span>
                </button>
            </motion.div>

            <motion.div
                key={mode}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                style={{ flex: 1 }}
            >
                {mode === 'daily' ? <DailyInvoice /> : <CustomerInvoice />}
            </motion.div>
        </div>
    );
};

export default SalesManager;

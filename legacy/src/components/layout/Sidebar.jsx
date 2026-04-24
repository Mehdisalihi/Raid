import React from 'react';
import {
    LayoutDashboard,
    Package,
    Warehouse,
    TrendingUp,
    FileText,
    Users,
    CreditCard,
    RotateCcw,
    Archive,
    LogOut,
    UserMinus,
    UserPlus,
    History,
    ShoppingCart,
    Settings as SettingsIcon,
    ChevronLeft,
    Truck
} from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { motion } from 'framer-motion';
import { translations } from '../../i18n/translations';

const Sidebar = () => {
    const { logout, language, activePage, setActivePage } = useAppStore();
    const t = translations[language];

    const menuItems = [
        { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
        { id: 'products', label: t.products, icon: Package },
        { id: 'inventory', label: t.inventory, icon: Warehouse },
        { id: 'sales-invoice', label: language === 'ar' ? "فاتورة بيع" : "Sales Invoice", icon: ShoppingCart },
        { id: 'invoices', label: t.invoices, icon: CreditCard },
        { id: 'sales', label: t.sales, icon: TrendingUp },
        { id: 'customers', label: t.customers, icon: Users },
        { id: 'statement', label: t.statement, icon: FileText },
        { id: 'debtors', label: t.debtors, icon: UserMinus },
        { id: 'creditors', label: t.creditors, icon: UserPlus },
        { id: 'expenses', label: t.expenses, icon: CreditCard },
        { id: 'returns', label: t.returns, icon: RotateCcw },
        { id: 'archive', label: t.archive, icon: Archive },
        { id: 'settings', label: t.settings, icon: SettingsIcon },
    ];

    return (
        <div className="sidebar no-print" style={{
            width: '280px',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-sidebar)',
            borderLeft: language === 'ar' ? '1px solid var(--glass-border)' : 'none',
            borderRight: language === 'ar' ? 'none' : '1px solid var(--glass-border)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            direction: language === 'ar' ? 'rtl' : 'ltr',
            boxShadow: '10px 0 30px rgba(0,0,0,0.1)'
        }}>
            <div style={{ padding: '2.5rem 1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '46px', height: '46px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 20px var(--primary-glow)'
                    }}>
                        <Package size={24} color="white" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '2px' }}>{t.appTitle}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>النسخة الاحترافية V2</span>
                        </div>
                    </div>
                </div>
            </div>

            <nav style={{ flex: 1, padding: '1.5rem 0.8rem', overflowY: 'auto' }} className="custom-scroll">
                <ul style={{ listStyle: 'none' }}>
                    {menuItems.map((item) => (
                        <li key={item.id} style={{ margin: '0.25rem 0' }}>
                            <motion.div
                                onClick={() => setActivePage(item.id)}
                                whileHover={{ x: language === 'ar' ? -4 : 4, background: 'rgba(255,255,255,0.03)' }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    padding: '0.85rem 1.25rem',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    transition: 'all 0.2s ease',
                                    background: activePage === item.id ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                    color: activePage === item.id ? 'var(--primary)' : 'var(--text-muted)',
                                    position: 'relative',
                                    border: activePage === item.id ? '1px solid rgba(99, 102, 241, 0.15)' : '1px solid transparent'
                                }}
                            >
                                {activePage === item.id && (
                                    <motion.div
                                        layoutId="active-nav-indicator"
                                        style={{
                                            position: 'absolute',
                                            [language === 'ar' ? 'right' : 'left']: '4px',
                                            top: '20%',
                                            bottom: '20%',
                                            width: '3px',
                                            background: 'var(--primary)',
                                            borderRadius: '4px',
                                            boxShadow: '0 0 12px var(--primary)'
                                        }}
                                    />
                                )}
                                <item.icon
                                    size={18}
                                    style={{
                                        color: activePage === item.id ? 'var(--primary)' : 'inherit',
                                        transition: 'all 0.2s ease',
                                        opacity: activePage === item.id ? 1 : 0.7
                                    }}
                                />
                                <span style={{
                                    fontSize: '0.9rem',
                                    fontWeight: activePage === item.id ? 700 : 500
                                }}>{item.label}</span>
                                {activePage === item.id && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        style={{ marginRight: language === 'ar' ? 'auto' : 0, marginLeft: language === 'ar' ? 0 : 'auto' }}
                                    >
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                                    </motion.div>
                                )}
                            </motion.div>
                        </li>
                    ))}
                </ul>
            </nav>

            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                <button
                    onClick={logout}
                    className="btn"
                    style={{
                        width: '100%',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.1)',
                        color: '#f87171',
                        borderRadius: '12px',
                        padding: '0.7rem'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#ef4444';
                        e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                        e.currentTarget.style.color = '#f87171';
                    }}
                >
                    <LogOut size={18} />
                    <span style={{ fontWeight: 600 }}>{t.logout}</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;

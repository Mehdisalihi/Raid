'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Bell, Settings, Search, Plus, X,
    Package, Users, Moon, Sun, Star, Trash2,
    ShoppingCart, Receipt, TrendingDown, CreditCard,
    Truck, BarChart3, ClipboardList, Archive, Undo2,
    Building2, ArrowLeftRight, LayoutDashboard, Check, LogOut, Printer
} from 'lucide-react';
import Link from 'next/link';
import { SyncService } from '@/lib/SyncService';

const ALL_SHORTCUTS = [
    { href: '/dashboard', label: 'لوحة التحكم', labelFr: 'Dashboard', icon: 'LayoutDashboard', color: 'text-primary' },
    { href: '/dashboard/invoices/new', label: 'فاتورة جديدة', labelFr: 'Facture', icon: 'Receipt', color: 'text-primary' },
    { href: '/dashboard/sales', label: 'المبيعات', labelFr: 'Ventes', icon: 'ShoppingCart', color: 'text-primary' },
    { href: '/dashboard/products', label: 'المنتجات', labelFr: 'Produits', icon: 'Package', color: 'text-primary' },
    { href: '/dashboard/customers', label: 'العملاء', labelFr: 'Clients', icon: 'Users', color: 'text-primary' },
    { href: '/dashboard/suppliers', label: 'الموردون', labelFr: 'Fournisseurs', icon: 'Truck', color: 'text-primary' },
    { href: '/dashboard/expenses', label: 'المصروفات', labelFr: 'Dépenses', icon: 'TrendingDown', color: 'text-primary' },
    { href: '/dashboard/debts', label: 'الديون', labelFr: 'Dettes', icon: 'CreditCard', color: 'text-primary' },
    { href: '/dashboard/returns', label: 'المرتجعات', labelFr: 'Retours', icon: 'Undo2', color: 'text-primary' },
    { href: '/dashboard/warehouses', label: 'المستودعات', labelFr: 'Entrepôts', icon: 'Building2', color: 'text-primary' },
    { href: '/dashboard/inventory', label: 'حركات المخزون', labelFr: 'Inventaire', icon: 'ArrowLeftRight', color: 'text-primary' },
    { href: '/dashboard/reports', label: 'التقارير', labelFr: 'Rapports', icon: 'BarChart3', color: 'text-primary' },
    { href: '/dashboard/archive', label: 'الأرشيف', labelFr: 'Archive', icon: 'Archive', color: 'text-primary' },
    { href: '/dashboard/statement', label: 'كشف الحساب', labelFr: 'Relevé', icon: 'ClipboardList', color: 'text-primary' },
    { href: '/dashboard/settings', label: 'الإعدادات', labelFr: 'Paramètres', icon: 'Settings', color: 'text-primary' },
];

const ICON_MAP = {
    LayoutDashboard, Receipt, ShoppingCart, Package, Users, Truck,
    TrendingDown, CreditCard, Undo2, Building2, ArrowLeftRight,
    BarChart3, Archive, ClipboardList, Settings
};

const DEFAULT_SHORTCUTS = [
    '/dashboard/invoices/new',
    '/dashboard/products',
    '/dashboard/customers',
];

export default function GlobalStatusBar({ t, isRTL, lang, theme, toggleTheme, onLogout }) {
    const [time, setTime] = useState(new Date());
    const [showShortcutManager, setShowShortcutManager] = useState(false);
    const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);
    const [pendingCount, setPendingCount] = useState(0);
    const [isOnline, setIsOnline] = useState(true);
    const panelRef = useRef(null);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        
        // Sync monitoring
        const checkSync = async () => {
            setIsOnline(navigator.onLine);
            const count = await SyncService.getPendingCount();
            setPendingCount(count);
        };
        
        checkSync();
        const syncTimer = setInterval(checkSync, 5000);
        
        return () => {
            clearInterval(timer);
            clearInterval(syncTimer);
        };
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('raid-shortcuts');
        if (saved) setShortcuts(JSON.parse(saved));
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setShowShortcutManager(false);
            }
        };
        if (showShortcutManager) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showShortcutManager]);

    const toggleShortcut = (href) => {
        const updated = shortcuts.includes(href)
            ? shortcuts.filter(s => s !== href)
            : [...shortcuts, href];
        setShortcuts(updated);
        localStorage.setItem('raid-shortcuts', JSON.stringify(updated));
    };

    const formatTime = () => {
        return time.toLocaleTimeString(lang === 'ar' ? 'ar-MA' : 'fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const handleSearch = () => {
        const input = document.getElementById('global-search-input');
        if (input) {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const handleNotifications = () => {
        window.dispatchEvent(new CustomEvent('toggle-notifications'));
    };

    const activeShortcuts = useMemo(() => 
        ALL_SHORTCUTS.filter(s => shortcuts.includes(s.href)),
    [shortcuts]);

    const btnBase = `flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all hover:scale-105 active:scale-95`;
    const btnDark = `hover:bg-white/10`;
    const btnLight = `hover:bg-black/5`;

    return (
        <div
            dir={isRTL ? 'rtl' : 'ltr'}
            className={`fixed bottom-0 left-0 right-0 h-11 flex items-center px-4 z-[100] select-none text-[11px] font-black tracking-tight backdrop-blur-xl transition-all duration-500 border-none print:hidden ${
                theme === 'dark'
                ? 'bg-[var(--surface-1)]/80 text-white shadow-[0_-8px_30px_rgba(0,0,0,0.2)]'
                : 'bg-white/80 text-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]'
            }`}>

            {/* START SECTION — Active shortcuts */}
            <div className="flex items-center gap-0.5">
                {/* Logout Icon — beginning of bar */}
                <button
                    onClick={() => {
                        onLogout?.();
                    }}
                    title={lang === 'ar' ? 'تسجيل الخروج' : 'Déconnexion'}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all hover:scale-110 active:scale-90 me-1 shrink-0"
                >
                    <LogOut size={15} strokeWidth={2.5} />
                </button>
                <div className="w-2" />

                {activeShortcuts.map((sc) => {
                    const Icon = ICON_MAP[sc.icon];
                    return (
                        <Link
                            key={sc.href}
                            href={sc.href}
                            className={`${btnBase} ${sc.color} ${theme === 'dark' ? btnDark : btnLight}`}
                            title={lang === 'ar' ? sc.label : sc.labelFr}
                        >
                            {Icon && <Icon size={14} />}
                            <span>{lang === 'ar' ? sc.label : sc.labelFr}</span>
                        </Link>
                    );
                })}

                {/* Add Shortcut Button */}
                <div className="relative" ref={panelRef}>
                    <button
                        onClick={() => setShowShortcutManager(v => !v)}
                        title={lang === 'ar' ? 'إضافة اختصار' : 'Ajouter un raccourci'}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all hover:scale-105 active:scale-95 ms-1 ${
                            showShortcutManager
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : theme === 'dark'
                                ? 'bg-white/10 text-white hover:bg-white/20'
                                : 'bg-black/5 text-slate-500 hover:bg-black/10 border-none'
                        }`}
                    >
                        <Star size={13} />
                        <Plus size={11} strokeWidth={3} />
                    </button>

                    {/* Shortcut Manager Panel */}
                    {showShortcutManager && (
                        <div className={`absolute bottom-full mb-3 ${isRTL ? 'right-0' : 'left-0'} w-72 bg-white shadow-2xl rounded-2xl overflow-hidden z-50 border-none`}>
                            <div className="flex items-center justify-between px-4 py-3 border-none bg-slate-50">
                                <div className="flex items-center gap-2">
                                    <Star size={14} className="text-primary" />
                                    <span className="text-[12px] font-black text-slate-700">
                                        {lang === 'ar' ? 'إدارة الاختصارات السريعة' : 'Raccourcis rapides'}
                                    </span>
                                </div>
                                <button onClick={() => setShowShortcutManager(false)} className="p-1 rounded-lg hover:bg-slate-200 text-slate-400">
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="max-h-72 overflow-y-auto p-2 space-y-0.5">
                                {ALL_SHORTCUTS.map((sc) => {
                                    const Icon = ICON_MAP[sc.icon];
                                    const isActive = shortcuts.includes(sc.href);
                                    return (
                                        <button
                                            key={sc.href}
                                            onClick={() => toggleShortcut(sc.href)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-start transition-all ${
                                                isActive
                                                    ? 'bg-primary/5'
                                                    : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-primary/10' : 'bg-slate-100'}`}>
                                                {Icon && <Icon size={14} className={isActive ? 'text-primary' : 'text-slate-400'} />}
                                            </div>
                                            <span className={`flex-1 text-[12px] font-bold text-start ${isActive ? 'text-primary' : 'text-slate-600'}`}>
                                                {lang === 'ar' ? sc.label : sc.labelFr}
                                            </span>
                                            {isActive && (
                                                <Check size={13} className="text-primary shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="px-4 py-2.5 border-none bg-slate-50 text-center">
                                <span className="text-[10px] text-slate-400">
                                    {lang === 'ar'
                                        ? `${shortcuts.length} اختصار محدد — يُحفظ تلقائياً`
                                        : `${shortcuts.length} raccourci(s) — sauvegardé automatiquement`}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MIDDLE SPACER — Sync Status */}
            <div className="flex-1 flex justify-center items-center">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    isOnline 
                        ? (pendingCount > 0 ? 'bg-amber-500/10 text-amber-500 animate-pulse' : 'bg-emerald-500/10 text-emerald-500')
                        : 'bg-red-500/10 text-red-500'
                }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                        isOnline 
                            ? (pendingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500')
                            : 'bg-red-500'
                    }`} />
                    <span>
                        {isOnline 
                            ? (pendingCount > 0 
                                ? (lang === 'ar' ? `جاري المزامنة (${pendingCount})` : `Syncing (${pendingCount})`)
                                : (lang === 'ar' ? 'متصل بالسحابة' : 'Cloud Connected'))
                            : (lang === 'ar' ? 'وضع الأوفلاين' : 'Offline Mode')}
                    </span>
                    {isOnline && pendingCount > 0 && (
                        <button 
                            onClick={() => SyncService.syncNow()}
                            className="ms-2 hover:scale-110 active:rotate-180 transition-all"
                        >
                            <Undo2 size={10} className="rotate-180" />
                        </button>
                    )}
                </div>
            </div>

            {/* RIGHT SECTION */}
            <div className="flex items-center gap-1">
                <div className="hidden sm:flex items-center gap-1 px-2">
                    <div className="w-2" />
                    <button
                        onClick={handleSearch}
                        className={`p-1.5 rounded transition-all hover:scale-110 active:scale-90 group ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                        title={t?.('search')}
                    >
                        <Search size={16} className="opacity-70 group-hover:opacity-100" />
                    </button>
                    <button
                        onClick={handleNotifications}
                        className={`p-1.5 rounded transition-all hover:scale-110 active:scale-90 group ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                        title={t?.('notifications')}
                    >
                        <Bell size={16} className="opacity-70 group-hover:opacity-100" />
                    </button>
                    <button
                        onClick={() => window.print()}
                        className={`p-1.5 rounded transition-all hover:scale-110 active:scale-90 group ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                        title={lang === 'ar' ? 'طباعة' : 'Imprimer'}
                    >
                        <Printer size={16} className="opacity-70 group-hover:opacity-100"  color="#10b981" />
                    </button>
                    <button
                        onClick={toggleTheme}
                        className={`p-1.5 rounded transition-all hover:scale-110 active:scale-90 group ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                        title={t?.('theme')}
                    >
                        {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                    <Link
                        href="/dashboard/settings"
                        className={`flex p-1.5 rounded transition-all hover:scale-110 active:scale-90 group ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                        title={t?.('settings')}
                    >
                        <Settings size={16} className="opacity-70 group-hover:opacity-100 group-hover:rotate-45 transition-transform" />
                    </Link>
                    <div className="w-2" />
                </div>

                <div className="flex items-center gap-3 ps-2 pe-1">
                    <div className="flex items-center gap-1.5 font-black uppercase text-[11px] tracking-widest opacity-90">
                        <span>RAID SMART</span>
                    </div>
                    <div className={`px-2.5 rounded font-mono text-[11px] py-1 ${theme === 'dark' ? 'bg-white/20' : 'bg-black/10'}`}>
                        {formatTime()}
                    </div>
                </div>
            </div>
        </div>
    );
}

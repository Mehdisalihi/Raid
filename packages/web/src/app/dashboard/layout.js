'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard, Package, ShoppingCart, Users, Truck, Search,
    CreditCard, FileText, LogOut, ShoppingBag, Bell, X,
    ChevronLeft, Activity, TrendingDown, Undo2, Archive, BarChart3,
    Receipt, History, Globe, ClipboardList, Building2, ArrowLeftRight, AlertTriangle, Settings as SettingsIcon
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import GlobalStatusBar from '@/components/GlobalStatusBar';
import RaidModal from '@/components/RaidModal';

const NAV_ITEMS = [
    { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard', color: 'primary' },
    { href: '/dashboard/sales', icon: ShoppingCart, labelKey: 'sales', color: 'secondary' },
    { href: '/dashboard/products', icon: Package, labelKey: 'products', color: 'primary' },
    { href: '/dashboard/warehouses', icon: Building2, labelKey: 'warehouses', color: 'primary' },
    { href: '/dashboard/inventory', icon: ArrowLeftRight, labelKey: 'movements', color: 'secondary' },
    { href: '/dashboard/invoices', icon: Receipt, labelKey: 'invoices', color: 'primary' },
    { href: '/dashboard/expenses', icon: TrendingDown, labelKey: 'expenses', color: 'error' },
    { href: '/dashboard/debts', icon: CreditCard, labelKey: 'debts', color: 'warning' },
    { href: '/dashboard/customers', icon: Users, labelKey: 'customers', color: 'primary' },
    { href: '/dashboard/suppliers', icon: Truck, labelKey: 'suppliers', color: 'primary' },
    { href: '/dashboard/returns', icon: Undo2, labelKey: 'returns', color: 'error' },
    { href: '/dashboard/archive', icon: Archive, labelKey: 'archive', color: 'primary' },
    { href: '/dashboard/reports', icon: BarChart3, labelKey: 'reports', color: 'secondary' },
    { href: '/dashboard/staff', icon: Users, labelKey: 'staff', color: 'primary' },
    { href: '/dashboard/statement', icon: ClipboardList, labelKey: 'statement', color: 'secondary' },
    { href: '/dashboard/settings', icon: SettingsIcon, labelKey: 'settings', color: 'primary' },
];

const PERMISSION_MAP = {
    '/dashboard/sales': 'canAccessSales',
    '/dashboard/products': 'canManageInventory',
    '/dashboard/warehouses': 'canManageInventory',
    '/dashboard/inventory': 'canManageInventory',
    '/dashboard/invoices': 'canCreateInvoices',
    '/dashboard/expenses': 'canManageExpenses',
    '/dashboard/customers': 'canManageCustomers',
    '/dashboard/suppliers': 'canManageInventory',
    '/dashboard/reports': 'canViewReports',
    '/dashboard/staff': 'canViewReports',
    '/dashboard/settings': 'canAccessSettings'
};

export default function DashboardLayout({ children }) {
    return (
        <DashboardContent>{children}</DashboardContent>
    );
}

function DashboardContent({ children }) {
    const [user, setUser] = useState(null);
    const [showNotif, setShowNotif] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const { lang, toggleLang, t, isRTL } = useLanguage();
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) {
            router.push('/login');
            return;
        }

        try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);

            // Permission Check
            const role = (parsedUser.role || '').toUpperCase();
            if (role !== 'ADMIN') {
                const permissionNeeded = PERMISSION_MAP[pathname];
                if (permissionNeeded && parsedUser[permissionNeeded] === false) {
                    router.push('/dashboard');
                }
            }
        } catch (e) {
            console.error("Failed to parse user data", e);
            localStorage.clear();
            router.push('/login');
            return;
        }

        const handleToggleNotif = () => {
            setShowNotif(prev => !prev);
            playNotificationSound();
        };
        window.addEventListener('toggle-notifications', handleToggleNotif);
        return () => window.removeEventListener('toggle-notifications', handleToggleNotif);
    }, [router, pathname]);

    const playNotificationSound = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.2);
        } catch (e) {
            console.log("Audio API not supported");
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        router.push('/login');
    };

    const confirmLogout = () => {
        setShowLogoutModal(true);
    };

    if (!user) return (
        <div className="min-h-screen bg-[--background] flex items-center justify-center">
            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="flex h-screen bg-[var(--background)] overflow-hidden print:h-auto print:overflow-visible pb-[40px]" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* ─── SIDEBAR ─── */}
            <aside className="w-72 h-full bg-gradient-to-b from-[var(--card-bg)] to-[var(--bg-secondary)]/30 flex flex-col shrink-0 z-20 relative transition-all duration-300 print:hidden no-print-force shadow-[var(--shadow-sidebar)] border-none">
                {/* Subtle primary tint overlay */}
                <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none" />
                
                {/* Logo Section */}
                <div className="pt-2 pb-5 flex items-start justify-center relative z-10">
                    <img src="/Raed.png" alt="Raid Logo" className="w-[68%] h-auto object-contain drop-shadow-sm" />
                </div>
                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scroll">
                    {NAV_ITEMS.filter(item => {
                        if (!user) return false;
                        const role = (user.role || '').toUpperCase();
                        if (role === 'ADMIN') return true;
                        
                        const permission = PERMISSION_MAP[item.href];
                        if (!permission) return true;
                        
                        return user[permission] !== false;
                    }).map((item) => (
                        <SidebarLink key={item.href} {...item} pathname={pathname} t={t} isRTL={isRTL} />
                    ))}
                </nav>
            </aside>

            {/* ═══ MAIN CONTENT ═══ */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative print:overflow-visible print:h-auto">
                <header className="h-16 px-6 flex justify-between items-center bg-[var(--card-bg)]/80 backdrop-blur-xl sticky top-0 z-30 shrink-0 print:hidden no-print-force shadow-[0_4px_30px_rgba(0,0,0,0.02)] border-none">
                    <div className="flex items-center gap-4">
                        {/* Back Button */}
                        {pathname !== '/dashboard' && (
                            <button
                                onClick={() => router.back()}
                                className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)]/80 flex items-center justify-center hover:bg-[var(--card-bg)] hover:shadow-md transition-all text-slate-400 hover:text-primary group border-none"
                                title={t('back')}
                            >
                                <ChevronLeft size={18} className={`transition-transform duration-200 group-hover:-translate-x-0.5 ${isRTL ? 'rotate-180 group-hover:translate-x-0.5' : ''}`} />
                            </button>
                        )}

                        <h1 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                            {t(NAV_ITEMS.find(n => n.href === pathname)?.labelKey || 'dashboard')}
                        </h1>
                        <p className="text-primary/40 text-[10px] font-black uppercase tracking-[0.2em] hidden sm:block opacity-40 ml-4">
                            {t('system_version')} 2.5
                        </p>
                    </div>

                    <div className="hidden md:flex items-center flex-1 max-w-lg px-8">
                        <div className="w-full relative group">
                            <div className={`absolute inset-y-0 ${isRTL ? 'right-3' : 'left-3'} flex items-center pointer-events-none text-[var(--primary)]/40 group-focus-within:text-primary transition-colors`}>
                                <Search size={16} />
                            </div>
                            <input
                                id="global-search-input"
                                type="text"
                                placeholder={t('search_placeholder')}
                                className={`w-full bg-[var(--bg-secondary)]/50 rounded-xl ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 text-sm text-[var(--text-main)] border-none focus:outline-none focus:border-primary/20 focus:bg-[var(--card-bg)] focus:ring-4 focus:ring-primary/5 transition-all font-bold`}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Language Selection */}
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-secondary)]/50 border-none">
                            <button
                                onClick={() => toggleLang('ar')}
                                className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition-all ${lang === 'ar' ? 'bg-[var(--card-bg)] text-primary shadow-sm' : 'text-[var(--primary)]/40 hover:text-primary'}`}
                            >
                                AR
                            </button>
                            <button
                                onClick={() => toggleLang('fr')}
                                className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition-all ${lang === 'fr' ? 'bg-[var(--card-bg)] text-primary shadow-sm' : 'text-[var(--primary)]/40 hover:text-primary'}`}
                            >
                                FR
                            </button>
                        </div>

                        <div className="w-4" />

                        <div className="relative">
                            <button
                                onClick={() => {
                                    if(!showNotif) playNotificationSound();
                                    setShowNotif(!showNotif);
                                }}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative border-none ${showNotif ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-[var(--bg-secondary)]/50 text-[var(--primary)]/40 hover:bg-[var(--card-bg)] hover:text-primary'}`}
                            >
                                <Bell size={18} />
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 border-2 border-[var(--card-bg)] animate-pulse" />
                            </button>

                            {/* Notifications Dropdown */}
                            {showNotif && (
                                <div className={`absolute top-full mt-3 w-80 bg-[var(--card-bg)] border border-[var(--border-color)]/30 shadow-2xl rounded-2xl p-4 z-50 ${isRTL ? 'left-0' : 'right-0'} origin-top-right animate-in fade-in zoom-in duration-200 backdrop-blur-xl`}>
                                    <div className="flex items-center justify-between mb-3 border-b border-[var(--border-color)]/50 pb-3">
                                        <div className="font-black text-[13px] text-[var(--text-main)] uppercase tracking-wider">{t('notifications')}</div>
                                        <div className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black">2 {t('new')}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <NotifItem icon={<Activity size={16} className="text-blue-500"/>} title={t('new_activity')} desc={t('new_sales_invoice')} bg="bg-blue-50/20" />
                                        <NotifItem icon={<AlertTriangle size={16} className="text-amber-500"/>} title={t('stock_alert')} desc={t('low_stock_reached')} bg="bg-amber-50/20" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Profile in Topbar */}
                        <div className={`flex items-center gap-3 ${isRTL ? 'mr-4 pr-4' : 'ml-4 pl-4'}`}>
                            <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                                <div className="font-black text-[13px] text-[var(--text-main)] leading-tight">{user.name}</div>
                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.1em] mt-0.5 opacity-60">{user.role || (lang === 'ar' ? 'زائر' : 'GUEST')}</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-primary/10 shadow-sm border border-primary/20 flex items-center justify-center font-black text-primary shrink-0 transition-transform hover:scale-105">
                                {user.name?.charAt(0)?.toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 custom-scroll print:overflow-visible print:p-0">
                    <div className="max-w-7xl mx-auto space-y-6 animate-fade-up print:space-y-0 print:max-w-none print:w-full">
                        {children}
                    </div>
                </div>
            </main>
            <GlobalStatusBar t={t} isRTL={isRTL} lang={lang} theme={theme} toggleTheme={toggleTheme} onLogout={confirmLogout} />

            <RaidModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                title={t('logout_confirmation') || (lang === 'ar' ? 'تأكيد تسجيل الخروج' : 'Confirmation de déconnexion')}
                maxWidth="max-w-md"
            >
                <div className="text-center py-4">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 shadow-inner">
                        <LogOut size={36} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-3">
                        {lang === 'ar' ? 'هل أنت متأكد من الخروج؟' : 'Êtes-vous sûr de vouloir quitter ?'}
                    </h3>
                    <p className="text-slate-500 font-bold text-sm mb-8">
                        {lang === 'ar' ? 'ستحتاج إلى إدخال بياناتك مرة أخرى للدخول.' : 'Vous devrez saisir à nouveau vos identifiants pour vous connecter.'}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setShowLogoutModal(false)}
                            className="h-14 rounded-2xl bg-slate-100 text-slate-600 font-black hover:bg-slate-200 transition-all active:scale-95"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="h-14 rounded-2xl bg-red-500 text-white font-black shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95"
                        >
                            {t('logout')}
                        </button>
                    </div>
                </div>
            </RaidModal>
        </div>
    );
}

function SidebarLink({ href, icon: Icon, labelKey, pathname, t, isRTL }) {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 group/link ${isActive
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-[var(--text-muted)] hover:bg-primary/5 hover:text-primary'
                }`}
        >
            <div className={`transition-all duration-200 ${isActive ? 'text-primary scale-110' : 'text-[var(--primary)]/40 group-hover/link:text-primary'}`}>
                <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`font-bold text-[13.5px] flex-1 select-none`}>
                {t(labelKey)}
            </span>
            {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary-glow)]" />
            )}
        </Link>
    );
}

function NotifItem({ icon, title, desc, bg }) {
    return (
        <div className={`flex items-start gap-3 p-3 rounded-xl ${bg}`}>
            <div className="p-1.5 bg-white/5 rounded-lg shrink-0">{icon}</div>
            <div>
                <div className="text-sm font-bold">{title}</div>
                <div className="text-xs text-[--text-muted] mt-0.5">{desc}</div>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    User, Shield, Palette, Bell, Database,
    Save, Moon, Sun, Smartphone, Download,
    Upload, Trash2, Mail, Phone, Lock, Eye, EyeOff,
    CheckCircle2, AlertCircle, Globe, Camera,
    ChevronRight, Zap, RefreshCw, ShieldCheck, Settings,
    Store, FileText, Package, Percent, Users, BarChart3,
    Cloud, Info, Layout, Type, Receipt, Check,
    LayoutDashboard, UserCog, Edit2, FileDown, FileSpreadsheet, LogOut, HardDrive, ScrollText, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { authService } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import RaidModal from '@/components/RaidModal';

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState('profile');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [usersList, setUsersList] = useState([]);
    const [showUserModal, setShowUserModal] = useState(false);
    const [currentUserEdit, setCurrentUserEdit] = useState(null);
    const [userFormData, setUserFormData] = useState({
        name: '', email: '', password: '', phone: '', role: 'USER',
        canAccessSales: true, canCreateInvoices: true, canManageInventory: true,
        canViewReports: false, canManageCustomers: true, canManageExpenses: false, canAccessSettings: false
    });

    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [isExporting, setIsExporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const { lang, toggleLang, t, isRTL } = useLanguage();
    const { theme, toggleTheme, primaryColor, updatePrimaryColor, fontSize, updateFontSize } = useTheme();
    const [currentTime, setCurrentTime] = useState(new Date());
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    const confirmLogout = () => {
        setShowLogoutConfirm(true);
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                // Try fetching latest data from backend
                const userData = await authService.getMe();
                setUser(userData);
                setProfileData({
                    name: userData.name || '',
                    email: userData.email || '',
                    phone: userData.phone || '',
                    username: userData.username || ''
                });
                setStoreData({
                    name: userData.storeName || 'My Store',
                    taxId: userData.storeTaxId || '',
                    address: userData.storeAddress || '',
                    phone: userData.storePhone || '',
                    email: userData.storeEmail || '',
                    currency: userData.currency || 'MRU',
                    logo: userData.storeLogo || null
                });
                
                // Update local storage to keep it in sync
                localStorage.setItem('user', JSON.stringify(userData));
                
                if (userData.theme) {
                    // document.documentElement.classList.toggle('dark', userData.theme === 'dark');
                }
            } catch (err) {
                console.error('Failed to fetch user data, using local storage:', err);
                const savedUser = localStorage.getItem('user');
                if (savedUser) {
                    const parsed = JSON.parse(savedUser);
                    setUser(parsed);
                    setProfileData({
                        name: parsed.name || '',
                        email: parsed.email || '',
                        phone: parsed.phone || '',
                        username: parsed.username || ''
                    });
                    const savedStore = localStorage.getItem('store_settings');
                    if (savedStore) setStoreData(JSON.parse(savedStore));
                }
            }

            // Load other client-side only settings
            const savedTaxes = localStorage.getItem('tax_settings');
            if (savedTaxes) setTaxSettings(JSON.parse(savedTaxes));

            const savedNotifs = localStorage.getItem('notif_settings');
            if (savedNotifs) setNotifSettings(JSON.parse(savedNotifs));

            const savedAlerts = localStorage.getItem('alert_settings');
            if (savedAlerts) setAlertSettings(JSON.parse(savedAlerts));

            const savedReports = localStorage.getItem('report_settings');
            if (savedReports) setReportSettings(JSON.parse(savedReports));

            const savedSecurity = localStorage.getItem('security_options');
            if (savedSecurity) setSecurityOptions(JSON.parse(savedSecurity));

            fetchUsers();
            setLoading(false);
        };

        loadInitialData();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsersList(res.data);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };


    const [profileData, setProfileData] = useState({ name: '', email: '', phone: '', username: '' });
    const [storeData, setStoreData] = useState({ name: 'My Store', taxId: '', address: '', phone: '', email: '', currency: 'MRU' });
    const [invoiceSettings, setInvoiceSettings] = useState({ taxEnabled: true, format: 'INV-{NUMBER}', showLogo: true, notes: 'شكرا لثقتكم بنا.' });
    const [inventorySettings, setInventorySettings] = useState({ trackStock: true, allowNegative: false, lowStockThreshold: 10, valuation: 'FIFO' });
    const [taxSettings, setTaxSettings] = useState({ rate: '15', method: 'tax_added', applyProducts: true, applyServices: true });
    const [notifSettings, setNotifSettings] = useState({ invoices: true, expenses: true, stock: true, debts: false });
    const [alertSettings, setAlertSettings] = useState({ debt: true, highExpenses: true, minStock: true, unpaidInvoices: true });
    const [reportSettings, setReportSettings] = useState({ period: 'month', format: 'pdf' });
    const [securityOptions, setSecurityOptions] = useState({ appLock: false, sensitiveConfirm: true });

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        setMessage('');

        try {
            const dataToUpdate = {};
            
            if (activeSection === 'profile') {
                Object.assign(dataToUpdate, profileData);
            }
            
            if (activeSection === 'store') {
                localStorage.setItem('store_settings', JSON.stringify(storeData));
                Object.assign(dataToUpdate, {
                    storeName: storeData.name,
                    storeTaxId: storeData.taxId,
                    storeAddress: storeData.address,
                    storePhone: storeData.phone,
                    storeEmail: storeData.email,
                    currency: storeData.currency,
                    storeLogo: storeData.logo
                });
            }

            if (activeSection === 'appearance') {
                dataToUpdate.theme = theme;
                dataToUpdate.primaryColor = primaryColor;
                dataToUpdate.language = lang;
            }

            // Perform local update first for immediate response
            if (Object.keys(dataToUpdate).length > 0) {
                const updatedUser = { ...user, ...dataToUpdate };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                
                // Then try to sync with API if we have a user ID
                if (user?.id && user.id !== 'guest') {
                    try {
                        await api.put(`/users/${user.id}`, dataToUpdate);
                    } catch (err) {
                        console.error('Failed to sync settings to cloud, saved locally:', err);
                    }
                }
            }

            // Save other sections to local storage
            if (activeSection === 'invoices') {
                localStorage.setItem('invoice_settings', JSON.stringify(invoiceSettings));
            }

            if (activeSection === 'inventory') {
                localStorage.setItem('inventory_settings', JSON.stringify(inventorySettings));
            }

            if (activeSection === 'taxes') {
                localStorage.setItem('tax_settings', JSON.stringify(taxSettings));
            }

            if (activeSection === 'notifications') {
                localStorage.setItem('notif_settings', JSON.stringify(notifSettings));
            }

            if (activeSection === 'smart_alerts') {
                localStorage.setItem('alert_settings', JSON.stringify(alertSettings));
            }

            if (activeSection === 'reports') {
                localStorage.setItem('report_settings', JSON.stringify(reportSettings));
            }

            if (activeSection === 'security') {
                localStorage.setItem('security_options', JSON.stringify(securityOptions));
            }

            setMessage(isRTL ? 'تم حفظ الإعدادات بنجاح ✅' : 'Paramètres enregistrés avec succès ✅');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error('Error saving settings:', err);
            setMessage(isRTL ? 'حدث خطأ أثناء الحفظ ❌' : 'Erreur lors de l\'enregistrement ❌');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (currentUserEdit) {
                await api.put(`/users/${currentUserEdit.id}`, userFormData);
            } else {
                await api.post('/users', userFormData);
            }
            fetchUsers();
            setShowUserModal(false);
            setCurrentUserEdit(null);
            setUserFormData({
                name: '', email: '', password: '', phone: '', role: 'USER',
                canAccessSales: true, canCreateInvoices: true, canManageInventory: true,
                canViewReports: false, canManageCustomers: true, canManageExpenses: false, canAccessSettings: false
            });
            setMessage(isRTL ? 'تم حفظ المستخدم بنجاح ✅' : 'Utilisateur enregistré ✅');
        } catch (err) {
            setMessage(isRTL ? 'خطأ في العملية ❌' : 'Erreur ❌');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!confirm(isRTL ? 'هل أنت متأكد؟' : 'Êtes-vous sûr?')) return;
        try {
            await api.delete(`/users/${id}`);
            fetchUsers();
            setMessage(isRTL ? 'تم الحذف بنجاح ✅' : 'Supprimé avec succès ✅');
        } catch (err) {
            setMessage(isRTL ? 'خطأ في الحذف ❌' : 'Erreur de suppression ❌');
        }
    };

    const handleUpdatePassword = async (e) => {
        if (e) e.preventDefault();
        if (passwordData.new !== passwordData.confirm) {
            setMessage(isRTL ? 'كلمات المرور غير متطابقة ❌' : 'Les mots de passe ne correspondent pas ❌');
            return;
        }
        setIsSaving(true);
        try {
            await api.put('/users/profile/password', {
                currentPassword: passwordData.current,
                newPassword: passwordData.new
            });
            setMessage(isRTL ? 'تم تغيير كلمة المرور بنجاح ✅' : 'Mot de passe changé avec succès ✅');
            setPasswordData({ current: '', new: '', confirm: '' });
        } catch (err) {
            setMessage(err.response?.data?.error || (isRTL ? 'فشل تغيير كلمة المرور ❌' : 'Échec du changement ❌'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportData = () => {
        setIsExporting(true);
        try {
            const data = {
                store: JSON.parse(localStorage.getItem('store_settings') || '{}'),
                taxes: JSON.parse(localStorage.getItem('tax_settings') || '{}'),
                timestamp: new Date().toISOString(),
                version: '2.5.0'
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `raid_backup_${new Date().toLocaleDateString()}.json`;
            a.click();
            setMessage(isRTL ? 'تم تصدير البيانات بنجاح 📂' : 'Données exportées 📂');
        } catch (err) {
            setMessage(isRTL ? 'خطأ في التصدير ❌' : 'Erreur d\'exportation ❌');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportData = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.store) localStorage.setItem('store_settings', JSON.stringify(data.store));
                if (data.taxes) localStorage.setItem('tax_settings', JSON.stringify(data.taxes));
                setMessage(isRTL ? 'تم استيراد البيانات بنجاح 🔄' : 'Données importées 🔄');
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                setMessage(isRTL ? 'ملف غير صالح ❌' : 'Fichier invalide ❌');
            }
        };
        reader.readAsText(file);
    };

    const handleSyncNow = async () => {
        setIsSyncing(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            setMessage(isRTL ? 'تمت المزامنة بنجاح ☁️' : 'Synchronisation terminée ☁️');
        } catch (err) {
            setMessage(isRTL ? 'فشلت المزامنة ❌' : 'Échec de la synchronisation ❌');
        } finally {
            setIsSyncing(false);
        }
    };



    const changeColor = (color) => {
        updatePrimaryColor(color);
    };

    const navItems = [
        { id: 'profile', icon: User, label: t('profile'), color: 'bg-primary/20' },
        { id: 'store', icon: Store, label: t('store_settings'), color: 'bg-primary/20' },
        { id: 'inventory', icon: Package, label: t('inventory_settings'), color: 'bg-primary/20' },
        { id: 'invoices', icon: FileText, label: t('invoice_settings'), color: 'bg-primary/20' },
        { id: 'taxes', icon: Percent, label: t('tax_settings'), color: 'bg-primary/20' },
        { id: 'users', icon: Users, label: t('users_permissions'), color: 'bg-primary/20' },
        { id: 'notifications', icon: Bell, label: t('notifications'), color: 'bg-primary/20' },
        { id: 'smart_alerts', icon: Zap, label: t('smart_alerts'), color: 'bg-primary/20' },
        { id: 'appearance', icon: Palette, label: t('appearance'), color: 'bg-primary/20' },
        { id: 'language', icon: Globe, label: t('language'), color: 'bg-primary/20' },
        { id: 'security', icon: Shield, label: t('security'), color: 'bg-primary/20' },
        { id: 'data', icon: Database, label: t('data_mgmt'), color: 'bg-primary/20' },
        { id: 'sync', icon: Cloud, label: t('sync_settings'), color: 'bg-primary/20' },
        { id: 'reports', icon: BarChart3, label: t('reports_settings'), color: 'bg-primary/20' },
        { id: 'info', icon: Info, label: t('app_info'), color: 'bg-primary/20' },
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 opacity-60">
            <div className="w-14 h-14 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-lg font-black animate-pulse text-[var(--text-primary)]">{t('syncing')}</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header Card */}
            <div className="card-premium p-6 rounded-3xl overflow-hidden relative shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/10">
                            <Settings size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-[var(--text-primary)]">{t('settings')}</h1>
                            <p className="text-[var(--text-faint)] text-xs font-bold uppercase tracking-wider">{t('system_version')} 2.5</p>
                        </div>
                    </div>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-500/20 flex items-center gap-2"
                        >
                            <CheckCircle2 size={16} />
                            {message}
                        </motion.div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-4 xl:col-span-3">
                    <div className="glass-premium rounded-3xl border border-white/40 p-3 sticky top-4 space-y-1">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 group ${activeSection === item.id ? 'bg-primary shadow-md' : 'text-[var(--text-muted)] hover:bg-white/5 hover:shadow-sm'}`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${activeSection === item.id ? 'bg-white/20' : 'bg-[var(--surface-2)] group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                    <item.icon size={16} />
                                </div>
                                <span className={`text-xs font-black tracking-wide ${activeSection === item.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>{item.label}</span>
                                {activeSection === item.id && (
                                    <ChevronRight size={16} className={`ml-auto ${isRTL ? 'rotate-180' : ''}`} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-8 xl:col-span-9">
                    <div className="card-premium min-h-[700px] rounded-[2.5rem] p-6 lg:p-10 relative overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeSection}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="h-full"
                            >
                                {activeSection === 'profile' && (
                                    <SectionWrapper title={t('profile')} icon={<User className="text-blue-500" />}>
                                        <div className="flex items-center gap-6 mb-10 p-6 bg-[var(--surface-2)] rounded-3xl border border-[var(--glass-border)]">
                                            <div className="relative group">
                                                <div className="w-24 h-24 rounded-3xl bg-[var(--surface-1)] shadow-md border border-[var(--glass-border)] flex items-center justify-center text-3xl font-black text-primary overflow-hidden">
                                                    {user?.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                                                    <Camera size={14} />
                                                </button>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-[var(--text-primary)]">{user?.name}</h3>
                                                <p className="text-[var(--text-faint)] text-sm font-bold uppercase">{user?.role || 'Administrator'}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField label={t('username')} icon={Shield} value={profileData.username} onChange={v => setProfileData({...profileData, username: v})} isRTL={isRTL} />
                                            <FormField label={t('email_address')} icon={Mail} value={profileData.email} onChange={v => setProfileData({...profileData, email: v})} isRTL={isRTL} />
                                            <FormField label={t('phone')} icon={Phone} value={profileData.phone} onChange={v => setProfileData({...profileData, phone: v})} isRTL={isRTL} />
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black uppercase text-[var(--text-faint)] tracking-widest pl-1">{t('user_permissions')}</label>
                                                <div className="h-12 bg-[var(--bg-secondary)] rounded-xl px-4 flex items-center border border-[var(--border-color)] text-xs font-bold text-[var(--text-muted)]">
                                                    {user?.role === 'admin' ? t('admin_full_access') || 'Admin Full Access' : t('limited_access') || 'Limited Access'}
                                                </div>
                                            </div>
                                        </div>
                                        <SectionActions onSave={handleSave} isSaving={isSaving} t={t} isRTL={isRTL} />
                                    </SectionWrapper>
                                )}

                                {activeSection === 'store' && (
                                    <SectionWrapper title={t('store_settings')} icon={<Store className="text-[var(--text-primary)]" />}>
                                        {/* Logo Upload Section */}
                                        <div className="flex flex-col items-center gap-4 mb-10 p-6 bg-primary/5 rounded-[2.5rem] border border-primary/10">
                                            <div className="relative group">
                                                <div className="w-32 h-32 rounded-3xl bg-[var(--surface-1)] shadow-xl border-2 border-white/50 flex items-center justify-center overflow-hidden transition-all group-hover:scale-[1.02]">
                                                    {storeData.logo ? (
                                                        <img src={storeData.logo} alt="Store Logo" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-2 text-[var(--text-faint)]">
                                                            <Camera size={32} className="opacity-40" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">{t('no_logo') || 'No Logo'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 active:scale-90 transition-all border-4 border-white/50">
                                                    <Upload size={16} />
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                        onChange={(e) => {
                                                            const file = e.target.files[0];
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onload = (ev) => {
                                                                    setStoreData({ ...storeData, logo: ev.target.result });
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                                {storeData.logo && (
                                                    <button 
                                                        onClick={() => setStoreData({ ...storeData, logo: null })}
                                                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-all border-2 border-white/50"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="text-center">
                                                <h4 className="text-sm font-black text-[var(--text-primary)] mb-1">{t('store_logo')}</h4>
                                                <p className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wider">{t('recommended_size') || 'Recommended: 512x512 PNG'}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField label={t('store_name')} icon={Store} value={storeData.name} onChange={v => setStoreData({...storeData, name: v})} isRTL={isRTL} />
                                            <FormField label={t('tax_number')} icon={FileText} value={storeData.taxId} onChange={v => setStoreData({...storeData, taxId: v})} isRTL={isRTL} />
                                            <FormField label={t('address')} icon={Globe} value={storeData.address} onChange={v => setStoreData({...storeData, address: v})} isRTL={isRTL} className="md:col-span-2" />
                                            <FormField label={t('phone')} icon={Phone} value={storeData.phone} onChange={v => setStoreData({...storeData, phone: v})} isRTL={isRTL} />
                                            <FormField label={t('email_address')} icon={Mail} value={storeData.email} onChange={v => setStoreData({...storeData, email: v})} isRTL={isRTL} />
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black uppercase text-[var(--text-faint)] tracking-widest pl-1">{t('currency')}</label>
                                                <select 
                                                    value={storeData.currency}
                                                    onChange={e => setStoreData({...storeData, currency: e.target.value})}
                                                    className="input-field w-full h-12 rounded-xl px-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                                >
                                                    <option value="MRU">MRU (Ouguiya)</option>
                                                    <option value="EUR">EUR (€)</option>
                                                    <option value="USD">USD ($)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <SectionActions onSave={handleSave} isSaving={isSaving} t={t} isRTL={isRTL} />
                                    </SectionWrapper>
                                )}

                                {activeSection === 'inventory' && (
                                    <SectionWrapper title={t('inventory_settings')} icon={<Package className="text-primary" />}>
                                        <div className="space-y-4">
                                            <SettingsToggle id="inv-track" label={t('track_stock_levels')} on={inventorySettings.trackStock} setOn={v => setInventorySettings({...inventorySettings, trackStock: v})} isRTL={isRTL} />
                                            <SettingsToggle id="inv-neg" label={t('allow_negative_inventory')} on={inventorySettings.allowNegative} setOn={v => setInventorySettings({...inventorySettings, allowNegative: v})} isRTL={isRTL} />
                                            <FormField label={t('low_stock_warning')} icon={AlertCircle} value={inventorySettings.lowStockThreshold} onChange={v => setInventorySettings({...inventorySettings, lowStockThreshold: v})} isRTL={isRTL} />
                                            <div className="space-y-4 border-t border-[var(--border-color)] pt-6">
                                                <label className="text-[11px] font-black uppercase text-[var(--text-faint)] tracking-widest block mb-3">{t('stock_valuation_method')}</label>
                                                <div className="flex gap-4">
                                                    {['FIFO', 'LIFO', 'Weighted Average'].map(m => (
                                                        <button 
                                                            key={m} 
                                                            onClick={() => setInventorySettings({...inventorySettings, valuation: m})}
                                                            className={`flex-1 py-3 px-4 rounded-xl border font-bold text-xs transition-all ${inventorySettings.valuation === m ? 'bg-primary text-white border-primary shadow-md' : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-primary/30'}`}
                                                        >
                                                            {m}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <SectionActions onSave={handleSave} isSaving={isSaving} t={t} isRTL={isRTL} />
                                    </SectionWrapper>
                                )}

                                {activeSection === 'invoices' && (
                                    <SectionWrapper title={t('invoice_settings')} icon={<FileText className="text-[var(--text-primary)]" />}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SettingsToggle id="inv-tax" label={t('enable_tax_on_invoice')} on={invoiceSettings.taxEnabled} setOn={v => setInvoiceSettings({...invoiceSettings, taxEnabled: v})} isRTL={isRTL} className="md:col-span-2" />
                                            <FormField label={t('invoice_format')} icon={Type} value={invoiceSettings.format} onChange={v => setInvoiceSettings({...invoiceSettings, format: v})} isRTL={isRTL} />
                                            <SettingsToggle id="inv-logo" label={t('show_logo_on_invoice')} on={invoiceSettings.showLogo} setOn={v => setInvoiceSettings({...invoiceSettings, showLogo: v})} isRTL={isRTL} />
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-[11px] font-black uppercase text-[var(--text-faint)] tracking-widest pl-1">{t('default_invoice_notes')}</label>
                                                <textarea 
                                                    value={invoiceSettings.notes}
                                                    onChange={e => setInvoiceSettings({...invoiceSettings, notes: e.target.value})}
                                                    className="input-field w-full h-32 rounded-2xl p-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none" 
                                                    placeholder="Merci pour votre confiance..."
                                                ></textarea>
                                            </div>
                                        </div>
                                        <SectionActions onSave={handleSave} isSaving={isSaving} t={t} isRTL={isRTL} />
                                    </SectionWrapper>
                                )}

                                {activeSection === 'taxes' && (
                                    <SectionWrapper title={t('tax_settings')} icon={<Percent className="text-[var(--text-primary)]" />}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField label={t('default_tax_rate')} icon={Percent} placeholder="15%" value={taxSettings.rate} onChange={v => setTaxSettings({...taxSettings, rate: v})} isRTL={isRTL} />
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black uppercase text-[var(--text-faint)] tracking-widest pl-1">{t('tax_calc_method')}</label>
                                                <select 
                                                    value={taxSettings.method}
                                                    onChange={e => setTaxSettings({...taxSettings, method: e.target.value})}
                                                    className="input-field w-full h-12 rounded-xl px-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                                >
                                                    <option value="tax_added">{t('tax_added')}</option>
                                                    <option value="tax_included">{t('tax_included')}</option>
                                                </select>
                                            </div>
                                            <SettingsToggle id="tax-p" label={t('apply_tax_on_products') || 'Apply on Products'} on={taxSettings.applyProducts} setOn={v => setTaxSettings({...taxSettings, applyProducts: v})} isRTL={isRTL} />
                                            <SettingsToggle id="tax-s" label={t('apply_tax_on_services') || 'Apply on Services'} on={taxSettings.applyServices} setOn={v => setTaxSettings({...taxSettings, applyServices: v})} isRTL={isRTL} />
                                        </div>
                                        <SectionActions onSave={handleSave} isSaving={isSaving} t={t} isRTL={isRTL} />
                                    </SectionWrapper>
                                )}

                                {activeSection === 'users' && (
                                    <SectionWrapper title={t('users_permissions')} icon={<Users className="text-primary" />}>
                                        <div className="space-y-6">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--surface-2)] p-6 rounded-[2rem] border border-[var(--glass-border)]">
                                                <div>
                                                    <h4 className="font-black text-[var(--text-primary)] text-lg mb-1">{t('active_team_members') || 'Active Team Members'}</h4>
                                                    <p className="text-[var(--text-faint)] text-xs font-bold uppercase tracking-widest">{usersList.length} {t('users_registered') || 'Users Registered'}</p>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        setCurrentUserEdit(null);
                                                        setUserFormData({
                                                            name: '', email: '', password: '', phone: '', role: 'USER',
                                                            canAccessSales: true, canCreateInvoices: true, canManageInventory: true,
                                                            canViewReports: false, canManageCustomers: true, canManageExpenses: false, canAccessSettings: false
                                                        });
                                                        setShowUserModal(true);
                                                    }}
                                                    className="flex items-center gap-2 bg-primary text-white px-6 h-12 rounded-2xl text-xs font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    <Users size={16} /> {t('add_new_member') || 'Add New Member'}
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
                                                {usersList.map(u => (
                                                    <ProfessionalUserCard 
                                                        key={u.id} 
                                                        user={u} 
                                                        isRTL={isRTL} 
                                                        t={t}
                                                        theme={theme}
                                                        onEdit={() => {
                                                            setCurrentUserEdit(u);
                                                            setUserFormData({
                                                                name: u.name, email: u.email, phone: u.phone || '', role: u.role,
                                                                canAccessSales: u.canAccessSales, canCreateInvoices: u.canCreateInvoices, canManageInventory: u.canManageInventory,
                                                                canViewReports: u.canViewReports, canManageCustomers: u.canManageCustomers, canManageExpenses: u.canManageExpenses, canAccessSettings: u.canAccessSettings
                                                            });
                                                            setShowUserModal(true);
                                                        }}
                                                        onDelete={() => handleDeleteUser(u.id)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </SectionWrapper>
                                )}

                                {activeSection === 'notifications' && (
                                    <SectionWrapper title={t('notifications')} icon={<Bell className="text-[var(--text-primary)]" />}>
                                        <div className="space-y-4">
                                            <SettingsToggle id="notif-1" label={t('invoice_notifications')} desc={t('invoice_notif_desc')} on={notifSettings.invoices} setOn={v => setNotifSettings({...notifSettings, invoices: v})} isRTL={isRTL} />
                                            <SettingsToggle id="notif-2" label={t('expense_notifications')} desc={t('expense_notif_desc')} on={notifSettings.expenses} setOn={v => setNotifSettings({...notifSettings, expenses: v})} isRTL={isRTL} />
                                            <SettingsToggle id="notif-3" label={t('stock_notifications')} desc={t('stock_notif_desc')} on={notifSettings.stock} setOn={v => setNotifSettings({...notifSettings, stock: v})} isRTL={isRTL} />
                                            <SettingsToggle id="notif-4" label={t('debt_notifications')} desc={t('debt_notif_desc')} on={notifSettings.debts} setOn={v => setNotifSettings({...notifSettings, debts: v})} isRTL={isRTL} />
                                        </div>
                                        <SectionActions onSave={handleSave} isSaving={isSaving} t={t} isRTL={isRTL} />
                                    </SectionWrapper>
                                )}

                                {activeSection === 'smart_alerts' && (
                                    <SectionWrapper title={t('smart_alerts')} icon={<Zap className="text-[var(--text-primary)]" />}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <AlertBox active={alertSettings.debt} onClick={() => setAlertSettings({...alertSettings, debt: !alertSettings.debt})} icon={<AlertCircle className="text-primary" />} title={t('debt_alert')} desc={t('debt_alert_desc')} isRTL={isRTL} />
                                            <AlertBox active={alertSettings.highExpenses} onClick={() => setAlertSettings({...alertSettings, highExpenses: !alertSettings.highExpenses})} icon={<BarChart3 className="text-primary" />} title={t('high_expenses_alert')} desc={t('high_expenses_desc')} isRTL={isRTL} />
                                            <AlertBox active={alertSettings.minStock} onClick={() => setAlertSettings({...alertSettings, minStock: !alertSettings.minStock})} icon={<Package className="text-primary" />} title={t('min_stock_alert')} desc={t('min_stock_desc')} isRTL={isRTL} />
                                            <AlertBox active={alertSettings.unpaidInvoices} onClick={() => setAlertSettings({...alertSettings, unpaidInvoices: !alertSettings.unpaidInvoices})} icon={<CheckCircle2 className="text-primary" />} title={t('unpaid_invoice_alert')} desc={t('unpaid_invoice_desc')} isRTL={isRTL} />
                                        </div>
                                        <SectionActions onSave={handleSave} isSaving={isSaving} t={t} isRTL={isRTL} />
                                    </SectionWrapper>
                                )}

                                {activeSection === 'appearance' && (
                                    <SectionWrapper title={t('appearance')} icon={<Palette className="text-[var(--text-primary)]" />}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-6">
                                                <h4 className="font-black text-[var(--text-faint)] uppercase text-[10px] tracking-widest">{t('theme')}</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <ThemeOption active={theme === 'light'} onClick={() => toggleTheme()} icon={<Sun size={20} className="text-[var(--text-primary)]" />} label={t('light')} />
                                                    <ThemeOption active={theme === 'dark'} onClick={() => toggleTheme()} icon={<Moon size={20} className="text-[var(--text-primary)]" />} label={t('dark')} />
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <h4 className="font-black text-[var(--text-faint)] uppercase text-[10px] tracking-widest">{t('font_size')}</h4>
                                                <div className="flex gap-2">
                                                    {['12px', '14px', '16px'].map(s => (
                                                        <button 
                                                            key={s} 
                                                            onClick={() => updateFontSize(s)}
                                                            className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all ${fontSize === s ? 'bg-primary border-primary shadow-md' : 'bg-[var(--surface-2)] border-[var(--glass-border)] text-[var(--text-muted)] hover:border-primary/40'}`}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-6 md:col-span-2">
                                                <h4 className="font-black text-[var(--text-faint)] uppercase text-[10px] tracking-widest">{t('primary_color')}</h4>
                                                <div className="flex gap-4">
                                                    {['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(c => (
                                                        <div 
                                                            key={c} 
                                                            onClick={() => changeColor(c)}
                                                            className="w-10 h-10 rounded-full border-2 cursor-pointer shadow-sm hover:scale-110 transition-all flex items-center justify-center" 
                                                            style={{ backgroundColor: c, borderColor: primaryColor === c ? 'white' : 'transparent', boxShadow: primaryColor === c ? `0 0 0 2px ${c}` : 'none' }}
                                                        >
                                                            {primaryColor === c && <Check size={14} />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <SectionActions onSave={handleSave} isSaving={isSaving} t={t} isRTL={isRTL} />
                                    </SectionWrapper>
                                )}

                                {activeSection === 'language' && (
                                    <SectionWrapper title={t('language')} icon={<Globe className="text-[var(--text-primary)]" />}>
                                        <div className="max-w-md mx-auto space-y-4">
                                            <LangSelect active={lang === 'ar'} onClick={() => toggleLang('ar')} label="العربية" flag="🇲🇦" />
                                            <LangSelect active={lang === 'fr'} onClick={() => toggleLang('fr')} label="Français" flag="🇫🇷" />
                                        </div>
                                    </SectionWrapper>
                                )}

                                {activeSection === 'security' && (
                                    <SectionWrapper title={t('security')} icon={<Shield className="text-[var(--text-primary)]" />}>
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <FormField label={t('password_current')} icon={Lock} type="password" value={passwordData.current} onChange={v => setPasswordData({...passwordData, current: v})} isRTL={isRTL} />
                                                <FormField label={t('password_new')} icon={Lock} type="password" value={passwordData.new} onChange={v => setPasswordData({...passwordData, new: v})} isRTL={isRTL} />
                                                <FormField label={t('password_confirm')} icon={Lock} type="password" value={passwordData.confirm} onChange={v => setPasswordData({...passwordData, confirm: v})} isRTL={isRTL} />
                                            </div>
                                            <div className="flex justify-end">
                                                <button 
                                                    onClick={handleUpdatePassword}
                                                    disabled={isSaving || !passwordData.current || !passwordData.new}
                                                    className="px-8 h-12 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                                >
                                                    {isSaving ? <RefreshCw className="animate-spin" size={18} /> : t('update_password') || 'Update Password'}
                                                </button>
                                            </div>
                                            <div className="space-y-4 border-t border-[var(--glass-border)] pt-8">
                                                <SettingsToggle id="sec-1" label={t('app_lock')} desc={t('app_lock_desc') || 'Request code on startup'} on={securityOptions.appLock} setOn={v => setSecurityOptions({...securityOptions, appLock: v})} isRTL={isRTL} />
                                                <SettingsToggle id="sec-2" label={t('sensitive_op_confirm')} desc={t('sensitive_op_desc') || 'Confirm deletes & big edits'} on={securityOptions.sensitiveConfirm} setOn={v => setSecurityOptions({...securityOptions, sensitiveConfirm: v})} isRTL={isRTL} />
                                            </div>
                                            <div className="flex flex-col md:flex-row gap-4">
                                                <button className="flex-1 py-4 bg-[var(--surface-2)] border border-[var(--glass-border)] text-[var(--text-primary)] font-bold text-sm hover:bg-[var(--surface-1)] transition-all flex items-center justify-center gap-2">
                                                    <RefreshCw size={16} /> {t('login_history')}
                                                </button>
                                                <button className="flex-1 py-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 font-bold text-sm hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
                                                    <Trash2 size={16} /> {t('sign_out_all')}
                                                </button>
                                            </div>
                                        </div>
                                        <SectionActions onSave={handleSave} isSaving={isSaving} t={t} isRTL={isRTL} />
                                    </SectionWrapper>
                                )}

                                {activeSection === 'data' && (
                                    <SectionWrapper title={t('data_mgmt')} icon={<Database className="text-[var(--text-primary)]" />}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <DataCard 
                                                icon={isExporting ? <RefreshCw className="text-primary animate-spin" /> : <HardDrive className="text-primary" />} 
                                                title={t('export_backup')} 
                                                desc={t('export_backup_desc')} 
                                                isRTL={isRTL} 
                                                onClick={handleExportData}
                                            />
                                            <div className="relative group">
                                                <input 
                                                    type="file" 
                                                    accept=".json" 
                                                    onChange={handleImportData}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <DataCard 
                                                    icon={<Upload className="text-primary" />} 
                                                    title={t('import_backup')} 
                                                    desc={t('import_backup_desc')} 
                                                    isRTL={isRTL} 
                                                />
                                            </div>
                                        </div>
                                        <SectionActions onSave={handleSave} isSaving={isSaving} t={t} isRTL={isRTL} />
                                    </SectionWrapper>
                                )}

                                {activeSection === 'sync' && (
                                    <SectionWrapper title={t('sync_settings')} icon={<Cloud className="text-[var(--text-primary)]" />}>
                                        <div className="p-10 bg-primary/5 rounded-[2.5rem] border border-primary/10 text-center space-y-6">
                                            <div className="w-20 h-20 bg-[var(--surface-1)] rounded-full mx-auto flex items-center justify-center text-primary shadow-lg animate-pulse">
                                                <Cloud size={40} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-[var(--text-primary)] mb-2">{t('cloud_backup')}</h3>
                                                <p className="text-[var(--text-muted)] text-sm font-medium leading-relaxed max-w-sm mx-auto">{t('sync_subtitle') || 'Synchronize your data automatically with the cloud for safety and multi-device access.'}</p>
                                            </div>
                                            <div className="flex flex-col items-center gap-4">
                                                <SettingsToggle id="sync-1" label={t('device_sync')} defaultOn={true} isRTL={isRTL} className="max-w-xs mx-auto" />
                                                <button 
                                                    onClick={handleSyncNow}
                                                    disabled={isSyncing}
                                                    className="px-10 h-14 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3"
                                                >
                                                    {isSyncing ? <RefreshCw size={20} className="animate-spin" /> : <Cloud size={20} />}
                                                    {isSyncing ? t('syncing') : (t('sync_now') || 'Sync Now')}
                                                </button>
                                            </div>
                                        </div>
                                    </SectionWrapper>
                                )}

                                {activeSection === 'reports' && (
                                    <SectionWrapper title={t('reports_settings')} icon={<BarChart3 className="text-[var(--text-primary)]" />}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <label className="text-[11px] font-black uppercase text-[var(--text-faint)] tracking-widest pl-1">{t('default_report_period')}</label>
                                                <select 
                                                    value={reportSettings.period}
                                                    onChange={e => setReportSettings({...reportSettings, period: e.target.value})}
                                                    className="input-field w-full h-12 rounded-xl px-4 font-bold text-sm outline-none"
                                                >
                                                    <option value="month">{t('period_month')}</option>
                                                    <option value="week">{t('period_week')}</option>
                                                    <option value="year">{t('period_year')}</option>
                                                </select>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[11px] font-black uppercase text-[var(--text-faint)] tracking-widest pl-1">{t('export_formats')}</label>
                                                <div className="flex gap-2">
                                                    <div 
                                                        onClick={() => setReportSettings({...reportSettings, format: 'pdf'})}
                                                        className={`flex-1 p-3 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${reportSettings.format === 'pdf' ? 'bg-primary/10 border-primary shadow-sm' : 'bg-[var(--surface-2)] border-[var(--glass-border)] hover:bg-[var(--surface-1)]'}`}
                                                    >
                                                        <FileDown size={16} className="text-red-500" /> <span className="text-xs font-bold uppercase text-[10px]">PDF Document</span>
                                                    </div>
                                                    <div 
                                                        onClick={() => setReportSettings({...reportSettings, format: 'excel'})}
                                                        className={`flex-1 p-3 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${reportSettings.format === 'excel' ? 'bg-primary/10 border-primary shadow-sm' : 'bg-[var(--surface-2)] border-[var(--glass-border)] hover:bg-[var(--surface-1)]'}`}
                                                    >
                                                        <FileSpreadsheet size={16} className="text-emerald-500" /> <span className="text-xs font-bold uppercase text-[10px]">Excel Sheet</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <SectionActions onSave={handleSave} isSaving={isSaving} t={t} isRTL={isRTL} />
                                    </SectionWrapper>
                                )}

                                {activeSection === 'info' && (
                                    <SectionWrapper title={t('app_info')} icon={<Info className="text-[var(--text-faint)]" />}>
                                        <div className="flex flex-col items-center text-center space-y-8 pt-10">
                                            <div className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-primary/30">
                                                <Receipt size={48} strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-[var(--text-primary)]">RAID {t('smart')}</h3>
                                                <p className="text-[var(--text-faint)] font-bold text-sm">v2.5.0-Stable</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
                                                <InfoItem label={lang === 'ar' ? 'المطور' : 'Developer'} value="Elmehdi Deda Salihi" />
                                                <InfoItem label={t('copyright')} value="© 2026 Raid Tech" />
                                                <InfoItem label={t('system_version')} value="v2.5.0" />
                                                <InfoItem label={t('privacy_policy')} value={t('view') || 'View'} icon={<ShieldCheck size={14}/>} link />
                                                <InfoItem label={t('terms_of_use')} value={t('view') || 'View'} icon={<ScrollText size={14}/>} link />
                                            </div>
                                            <div className="pt-6">
                                                <button 
                                                    onClick={confirmLogout}
                                                    className="flex items-center gap-2 text-[var(--text-faint)] hover:text-red-500 font-bold text-xs transition-all opacity-50 hover:opacity-100"
                                                >
                                                    <LogOut size={14} /> {t('logout')}
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-[var(--text-faint)] font-black uppercase tracking-widest pt-10 px-10 leading-relaxed max-w-md">
                                                {t('system_description')}
                                            </p>
                                        </div>
                                    </SectionWrapper>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden border flex flex-col max-h-[90vh] ${theme === 'dark' ? 'bg-[#0f172a] border-white/5' : 'bg-white border-slate-100'}`}
                    >
                        <div className={`p-6 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-[#1e293b] border-white/5' : 'bg-white border-slate-100'}`}>
                            <h2 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{currentUserEdit ? t('edit_user') : t('add_user')}</h2>
                            <button onClick={() => setShowUserModal(false)} className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scroll">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className={`space-y-6 p-6 rounded-3xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50/50 border border-slate-100'}`}>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">{t('personal_info') || 'Personal Info'}</h4>
                                    <div className="space-y-4">
                                        <FormField label={t('name')} icon={User} value={userFormData.name} onChange={v => setUserFormData({...userFormData, name: v})} isRTL={isRTL} theme={theme} />
                                        <FormField label={t('email_address')} icon={Mail} value={userFormData.email} onChange={v => setUserFormData({...userFormData, email: v})} isRTL={isRTL} theme={theme} />
                                        <FormField label={t('phone')} icon={Phone} value={userFormData.phone} onChange={v => setUserFormData({...userFormData, phone: v})} isRTL={isRTL} theme={theme} />
                                        <FormField label={t('password')} icon={Lock} type="password" value={userFormData.password} onChange={v => setUserFormData({...userFormData, password: v})} isRTL={isRTL} theme={theme} placeholder={currentUserEdit ? '••••••••' : ''} />
                                    </div>
                                </div>

                                <div className={`space-y-6 p-6 rounded-3xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50/50 border border-slate-100'}`}>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">{t('role_permissions') || 'Role & Permissions'}</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-[var(--text-faint)] tracking-widest mb-3 block">{t('system_role') || 'System Role'}</label>
                                            <div className="flex gap-2">
                                                {['SUPER_ADMIN', 'ADMIN', 'USER'].map(r => (
                                                    <button 
                                                        key={r}
                                                        type="button"
                                                        onClick={() => setUserFormData({...userFormData, role: r})}
                                                        className={`flex-1 h-10 rounded-xl text-[9px] font-black transition-all ${userFormData.role === r ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-[var(--surface-2)] text-[var(--text-faint)] border border-[var(--glass-border)]'}`}
                                                    >
                                                        {r.replace('_', ' ')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <PermissionToggle label={t('sales_access')} active={userFormData.canAccessSales} onClick={() => setUserFormData({...userFormData, canAccessSales: !userFormData.canAccessSales})} icon={<Layout size={14}/>} />
                                            <PermissionToggle label={t('inventory_mgmt')} active={userFormData.canManageInventory} onClick={() => setUserFormData({...userFormData, canManageInventory: !userFormData.canManageInventory})} icon={<Package size={14}/>} />
                                            <PermissionToggle label={t('view_reports')} active={userFormData.canViewReports} onClick={() => setUserFormData({...userFormData, canViewReports: !userFormData.canViewReports})} icon={<BarChart3 size={14}/>} />
                                            <PermissionToggle label={t('manage_settings')} active={userFormData.canAccessSettings} onClick={() => setUserFormData({...userFormData, canAccessSettings: !userFormData.canAccessSettings})} icon={<Shield size={14}/>} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                        <div className={`p-6 border-t flex justify-end gap-3 ${theme === 'dark' ? 'bg-[#1e293b] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <button onClick={() => setShowUserModal(false)} className={`px-8 h-12 rounded-xl text-sm font-bold transition-all ${theme === 'dark' ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-200'}`}>
                                {t('cancel')}
                            </button>
                            <button onClick={handleSaveUser} disabled={isSaving} className="px-10 h-12 bg-primary text-white rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                                {isSaving ? <RefreshCw className="animate-spin" size={18} /> : t('save')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
            {/* Logout Confirmation Modal */}
            <RaidModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
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
                            onClick={() => setShowLogoutConfirm(false)}
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

// ─── COMPONENTS ───

// ─── SMALL HELPERS ───

function SectionWrapper({ title, icon, children }) {
    return (
        <div className="space-y-8 animate-fade-in relative">
            <div className="flex items-center gap-3 border-b border-[var(--glass-border)] pb-6 mb-8">
                <div className="p-3 bg-[var(--surface-1)] rounded-2xl shadow-sm border border-[var(--glass-border)]">{icon}</div>
                <h2 className="text-xl font-black text-[var(--text-primary)]">{title}</h2>
            </div>
            {children}
        </div>
    );
}

function SectionActions({ onSave, isSaving, t, isRTL }) {
    return (
        <div className="pt-10 mt-10 border-t border-[var(--glass-border)] flex justify-end">
            <button
                onClick={onSave}
                disabled={isSaving}
                className="btn-primary flex items-center gap-3 px-10 h-14 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
                {isSaving ? <RefreshCw size={20} className="animate-spin" /> : <><Save size={20} /> {t('save')}</>}
            </button>
        </div>
    );
}

function FormField({ label, type = "text", placeholder, value, icon: Icon, isRTL, onChange }) {
    return (
        <div className="space-y-2">
            <label className="flex items-center gap-2 text-[var(--text-faint)] text-[10px] font-black uppercase tracking-widest px-1">
                {Icon && <Icon size={12} />}
                {label}
            </label>
            <input
                type={type}
                placeholder={placeholder}
                className={`input-field w-full h-12 rounded-xl px-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none ${isRTL ? 'text-right' : 'text-left'}`}
                value={value || ''}
                onChange={e => onChange && onChange(e.target.value)}
            />
        </div>
    );
}

function ProfessionalUserCard({ user, isRTL, t, theme, onEdit, onDelete }) {
    return (
        <div className={`p-5 rounded-[2rem] border transition-all hover:shadow-xl group flex flex-col justify-between ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-100 hover:border-primary/20 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shadow-inner border border-primary/5">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 className="font-black text-[var(--text-primary)] text-sm mb-0.5">{user.name}</h4>
                        <p className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-widest">{user.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                user.role === 'SUPER_ADMIN' ? 'bg-purple-500/10 text-purple-500' : 
                                user.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-500' : 
                                'bg-blue-500/10 text-blue-500'
                            }`}>
                                {user.role.replace('_', ' ')}
                            </span>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                {t('active') || 'Active'}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onEdit} className="p-2.5 rounded-xl bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-primary/10 hover:text-primary transition-all"><Edit2 size={14} /></button>
                    <button onClick={onDelete} className="p-2.5 rounded-xl bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                </div>
            </div>

            <div className="pt-4 border-t border-[var(--glass-border)] grid grid-cols-4 gap-2">
                <MiniPermIcon active={user.canAccessSales} icon={<LayoutDashboard size={12}/>} label="Sales" />
                <MiniPermIcon active={user.canManageInventory} icon={<Package size={12}/>} label="Inventory" />
                <MiniPermIcon active={user.canViewReports} icon={<BarChart3 size={12}/>} label="Reports" />
                <MiniPermIcon active={user.canAccessSettings} icon={<Shield size={12}/>} label="Admin" />
            </div>
        </div>
    );
}

function MiniPermIcon({ active, icon, label }) {
    return (
        <div className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${active ? 'bg-primary/5 text-primary' : 'bg-[var(--surface-2)] text-[var(--text-faint)] opacity-30'}`} title={label}>
            {icon}
        </div>
    );
}

function PermissionToggle({ label, active, onClick, icon }) {
    return (
        <button 
            type="button"
            onClick={onClick}
            className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all ${active ? 'bg-primary/5 border-primary/30 text-primary shadow-sm' : 'bg-[var(--surface-1)] border-[var(--glass-border)] text-[var(--text-muted)]'}`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${active ? 'bg-primary/20' : 'bg-[var(--surface-2)]'}`}>{icon}</div>
                <span className="text-[11px] font-black uppercase tracking-wider">{label}</span>
            </div>
            {active ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-[var(--glass-border)]"></div>}
        </button>
    );
}

function AlertBox({ icon, title, desc, isRTL, active, onClick }) {
    return (
        <div 
            onClick={onClick}
            className={`p-5 rounded-2xl border transition-all group cursor-pointer ${active ? 'bg-primary/5 border-primary/30 shadow-md' : 'border-[var(--glass-border)] bg-[var(--surface-1)]'} ${isRTL ? 'text-right' : 'text-left'}`}
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${active ? 'bg-primary text-white' : 'bg-[var(--surface-2)]'}`}>{icon}</div>
            <div className="flex justify-between items-start">
                <div>
                    <h4 className={`font-black text-sm mb-1 ${active ? 'text-primary' : 'text-[var(--text-primary)]'}`}>{title}</h4>
                    <p className="text-[10px] font-medium text-[var(--text-faint)] leading-relaxed uppercase">{desc}</p>
                </div>
                {active && <CheckCircle2 size={16} className="text-primary" />}
            </div>
        </div>
    );
}

function DataCard({ icon, title, desc, isRTL }) {
    return (
        <div className="p-8 bg-[var(--surface-2)] rounded-[2.5rem] border border-[var(--glass-border)] text-center hover:bg-[var(--surface-1)] hover:shadow-xl transition-all group cursor-pointer">
            <div className="w-16 h-16 bg-[var(--surface-1)] rounded-2xl mx-auto flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform">{icon}</div>
            <h4 className="font-black text-[var(--text-primary)] mb-2">{title}</h4>
            <p className="text-xs font-bold text-[var(--text-faint)] px-4 leading-relaxed uppercase">{desc}</p>
        </div>
    );
}

function ThemeOption({ active, onClick, icon, label }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all ${active ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-[var(--surface-2)] border-[var(--glass-border)] text-[var(--text-faint)] hover:border-primary/20'}`}
        >
            {icon}
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </button>
    );
}

function LangSelect({ active, onClick, label, flag }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all ${active ? 'bg-primary/10 border-primary/20 text-primary shadow-sm' : 'bg-[var(--surface-2)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--surface-1)]'}`}
        >
            <span className="text-2xl">{flag}</span>
            <span className="font-black flex-1 text-right">{label}</span>
            {active && <CheckCircle2 size={16} />}
        </button>
    );
}

function InfoItem({ label, value, link, icon }) {
    return (
        <div className="p-4 bg-[var(--surface-2)] rounded-2xl border border-[var(--glass-border)] flex justify-between items-center group hover:bg-[var(--surface-1)] hover:border-primary/20 transition-all">
            <div className="flex flex-col items-start gap-0.5">
                <span className="text-[10px] font-black uppercase text-[var(--text-faint)] tracking-widest">{label}</span>
                {icon && <span className="text-primary/40">{icon}</span>}
            </div>
            <span className={`text-xs font-black ${link ? 'text-primary cursor-pointer hover:underline' : 'text-[var(--text-primary)]'}`}>{value}</span>
        </div>
    );
}

function SettingsToggle({ id, label, desc, on, setOn, isRTL, className = "" }) {
    return (
        <div className={`flex items-center justify-between p-5 rounded-2xl bg-[var(--surface-2)] border border-[var(--glass-border)] ${className}`}>
            <div className="flex flex-col gap-1">
                <label htmlFor={id} className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider cursor-pointer">{label}</label>
                {desc && <p className="text-[10px] font-bold text-[var(--text-faint)] uppercase">{desc}</p>}
            </div>
            <button
                id={id}
                type="button"
                onClick={() => setOn && setOn(!on)}
                className={`w-12 h-6 rounded-full transition-all relative flex items-center px-1 ${on ? 'bg-primary' : 'bg-[var(--surface-1)] border border-[var(--glass-border)]'}`}
            >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all ${on ? (isRTL ? 'translate-x-[-24px]' : 'translate-x-6') : 'translate-x-0'}`} />
            </button>
        </div>
    );
}

import React, { useState, useRef } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import {
    Settings as SettingsIcon,
    Save,
    Database,
    User,
    Lock,
    Smartphone,
    Globe,
    Bell,
    ShieldCheck,
    ChevronRight,
    Download,
    Upload,
    RefreshCw,
    Languages,
    Image,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { translations } from '../i18n/translations';

const Settings = () => {
    const { settings, updateSettings, currentUser, language, toggleLanguage } = useAppStore();
    const t = translations[language];
    const [formData, setFormData] = useState({ ...settings });
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState(null); // { type: 'success'|'error', msg: string }
    const importRef = useRef(null);
    const logoRef = useRef(null);

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSave = (e) => {
        e.preventDefault();
        setIsSaving(true);
        updateSettings(formData);
        setTimeout(() => {
            setIsSaving(false);
            showToast('success', language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Paramètres sauvegardés avec succès');
        }, 600);
    };

    // ── Export All Data ──────────────────────────────────────────────────────
    const handleExport = () => {
        const backup = {};
        const keys = [
            'products', 'customers', 'invoices', 'sales', 'expenses',
            'returns', 'purchases', 'inventoryMovements', 'mruProducts',
            'users', 'debts', 'credits', 'settings', 'language', 'dir', 'theme'
        ];
        keys.forEach(k => {
            const val = localStorage.getItem(k);
            if (val !== null) backup[k] = JSON.parse(val);
        });
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `smart-accountant-backup-${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('success', language === 'ar' ? 'تم تصدير البيانات بنجاح' : 'Données exportées avec succès');
    };

    // ── Import / Restore ─────────────────────────────────────────────────────
    const handleImportFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const backup = JSON.parse(evt.target.result);
                Object.entries(backup).forEach(([k, v]) => {
                    localStorage.setItem(k, JSON.stringify(v));
                });
                showToast('success', language === 'ar' ? 'تم استيراد البيانات، سيتم تحديث الصفحة...' : 'Données importées, rechargement...');
                setTimeout(() => window.location.reload(), 1500);
            } catch {
                showToast('error', language === 'ar' ? 'ملف غير صالح! تأكد من أنه ملف نسخ احتياطي صحيح.' : 'Fichier invalide !');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // reset input
    };

    // ── Logo Upload ──────────────────────────────────────────────────────────
    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 500 * 1024) {
            showToast('error', language === 'ar' ? 'الصورة كبيرة جداً (الحد 500KB)' : 'Image trop grande (max 500KB)');
            return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
            const base64 = evt.target.result;
            setFormData(prev => ({ ...prev, logo: base64 }));
            updateSettings({ logo: base64 });
            showToast('success', language === 'ar' ? 'تم رفع الشعار بنجاح' : 'Logo téléchargé avec succès');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const SettingGroup = ({ icon: Icon, title, children }) => (
        <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} />
                </div>
                <h3 className="title-md" style={{ fontSize: '1.1rem' }}>{title}</h3>
            </div>
            {children}
        </div>
    );

    return (
        <div className="settings-page scrollable-page" style={{ direction: language === 'ar' ? 'rtl' : 'ltr', position: 'relative' }}>
            {/* Toast Notification */}
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)',
                        background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
                        color: 'white', borderRadius: '12px', padding: '0.75rem 1.5rem',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontWeight: 700,
                        fontSize: '0.9rem'
                    }}
                >
                    {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {toast.msg}
                </motion.div>
            )}

            <div style={{ marginBottom: '2.5rem' }}>
                <h2 className="title-lg">{t.systemSettings}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t.settingsSubtitle}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
                <div className="card" style={{ padding: 0 }}>
                    <form onSubmit={handleSave}>
                        <SettingGroup icon={Globe} title={t.businessAndCurrency}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="label">{t.businessNameLabel}</label>
                                    <input
                                        type="text" className="form-control"
                                        value={formData.businessName}
                                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">{t.defaultCurrency}</label>
                                    <input
                                        type="text" className="form-control"
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        placeholder={t.currencyPlaceholder}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">{t.officialPhone}</label>
                                    <input
                                        type="text" className="form-control"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">{t.nationalAddress}</label>
                                    <input
                                        type="text" className="form-control"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">{language === 'ar' ? 'لغة النظام' : 'Langue du système'}</label>
                                    <button
                                        type="button"
                                        onClick={toggleLanguage}
                                        className="btn btn-outline"
                                        style={{ width: '100%', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        <Languages size={18} />
                                        <span style={{ fontWeight: 600 }}>{language === 'ar' ? 'Français' : 'العربية'}</span>
                                    </button>
                                </div>
                                {/* Logo Upload */}
                                <div className="form-group">
                                    <label className="label">{language === 'ar' ? 'شعار المؤسسة' : 'Logo de l\'entreprise'}</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {formData.logo ? (
                                            <img src={formData.logo} alt="logo" style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
                                        ) : (
                                            <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                                <Image size={20} />
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            style={{ flex: 1, height: '44px', justifyContent: 'center' }}
                                            onClick={() => logoRef.current?.click()}
                                        >
                                            <Upload size={16} />
                                            {language === 'ar' ? 'رفع شعار' : 'Choisir logo'}
                                        </button>
                                        <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                                    </div>
                                </div>
                            </div>
                        </SettingGroup>

                        <SettingGroup icon={User} title={t.adminAccount}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="label">{t.usernameLabel}</label>
                                    <input type="text" className="form-control" disabled value={currentUser?.name} />
                                </div>
                                <div className="form-group">
                                    <label className="label">{t.currentPassword}</label>
                                    <input type="password" className="form-control" placeholder="••••••••" />
                                </div>
                            </div>
                        </SettingGroup>

                        <div style={{ padding: '2rem', background: 'rgba(0,0,0,0.02)', borderBottomLeftRadius: 'var(--radius-md)', borderBottomRightRadius: 'var(--radius-md)', display: 'flex', justifyContent: language === 'ar' ? 'flex-start' : 'flex-end' }}>
                            <button type="submit" className="btn btn-primary" style={{ width: '200px', height: '48px', justifyContent: 'center' }} disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <RefreshCw size={18} className="animate-spin" />
                                        <span>{t.saving}</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        <span>{t.saveChanges}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Backup Card */}
                    <div className="card" style={{ borderTop: '4px solid var(--info)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.1)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Database size={18} />
                            </div>
                            <h4 style={{ fontWeight: 700, color: 'var(--text-main)' }}>{t.backup}</h4>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                            {t.backupSubtitle}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button className="btn btn-outline" style={{ justifyContent: 'center' }} onClick={handleExport}>
                                <Download size={18} /> {t.exportData}
                            </button>
                            <button className="btn btn-outline" style={{ justifyContent: 'center' }} onClick={() => importRef.current?.click()}>
                                <Upload size={18} /> {t.importCopy}
                            </button>
                            {/* Hidden file input for import */}
                            <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
                        </div>
                    </div>

                    {/* Security Card */}
                    <div className="card" style={{ textAlign: 'center', background: 'rgba(79, 70, 229, 0.02)' }}>
                        <ShieldCheck size={32} color="var(--primary)" style={{ marginBottom: '1rem', margin: '0 auto 1rem' }} />
                        <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>{t.systemProtected}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.dbSafeLocal}</p>
                    </div>
                </div>
            </div>

            <style>{`
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Settings;

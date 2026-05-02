'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    Truck, Plus, Phone, Mail, Building2, Search, X, Save,
    Package, DollarSign, ChevronLeft, Edit2, Trash2, Globe,
    TrendingDown, Star, ShieldCheck, AlertCircle, FileText
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';
import RaidDialog from '@/components/RaidDialog';
import RaidModal from '@/components/RaidModal';

import { db } from '@/lib/db';

export default function SuppliersPage() {
    const { t, isRTL, fmtNumber } = useLanguage();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('ALL'); // ALL or CREDITORS
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSupplier, setCurrentSupplier] = useState(null);
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', company: ''
    });

    const [dialog, setDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });

    const triggerDialog = (title, message, type = 'info', onConfirm = null) => {
        setDialog({ isOpen: true, title, message, type, onConfirm });
    };

    const closeDialog = () => setDialog({ ...dialog, isOpen: false });

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            // 1. Try Cloud
            const { data } = await api.get('/suppliers');
            setSuppliers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.warn('Suppliers: Falling back to local data');
            // 2. Local Fallback
            const localSuppliers = await db.clients.where('role').equals('supplier').toArray();
            setSuppliers(localSuppliers);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (currentSupplier) {
                await api.put(`/suppliers/${currentSupplier.id}`, formData);
            } else {
                await api.post('/suppliers', formData);
            }
            fetchSuppliers();
            closeModal();
            triggerDialog(
                isRTL ? 'نجاح ✨' : 'Succès ✨', 
                isRTL ? 'تم حفظ بيانات المورد بنجاح' : 'Fournisseur enregistré avec succès', 
                'success'
            );
        } catch (err) {
            triggerDialog(
                isRTL ? 'خطأ ❌' : 'Erreur ❌', 
                isRTL ? 'حدث خطأ أثناء حفظ بيانات المورد' : 'Erreur lors de l’enregistrement', 
                'danger'
            );
        }
    };

    const handleDelete = (id) => {
        triggerDialog(
            isRTL ? 'تأكيد الحذف' : 'Confirmer la suppression',
            isRTL ? 'هل تريد حذف هذا المورد نهائياً من القائمة؟' : 'Voulez-vous supprimer ce fournisseur définitivement de la liste ?',
            'danger',
            async () => {
                try {
                    await api.delete(`/suppliers/${id}`);
                    fetchSuppliers();
                    triggerDialog(
                        isRTL ? 'تم الحذف' : 'Supprimé', 
                        isRTL ? 'تم حذف المورد بنجاح' : 'Fournisseur supprimé avec succès', 
                        'success'
                    );
                } catch (err) {
                    triggerDialog(
                        isRTL ? 'تنبيه' : 'Attention', 
                        isRTL ? 'فشل الحذف. قد يكون المورد مرتبطاً بفواتير شراء.' : 'Échec de la suppression.', 
                        'warning'
                    );
                }
            }
        );
    };

    const openModal = (supplier = null) => {
        if (supplier) {
            setCurrentSupplier(supplier);
            setFormData({
                name: supplier.name,
                phone: supplier.phone || '',
                email: supplier.email || '',
                company: supplier.company || '',
            });
        } else {
            setCurrentSupplier(null);
            setFormData({ name: '', phone: '', email: '', company: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentSupplier(null);
    };

    const filteredSuppliers = suppliers.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || (s.company && s.company.toLowerCase().includes(search.toLowerCase()));
        if (filterType === 'CREDITORS') return matchesSearch && (s.balance || 0) > 0;
        return matchesSearch;
    });

    const totalSuppliers = suppliers.length;
    const totalBalance = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);
    const debtors = suppliers.filter(s => (s.balance || 0) > 0).length;

    return (
        <div className={`space-y-8 animate-fade-up pb-10 bg-[var(--background)] min-h-[85vh] ${isRTL ? 'direction-rtl' : 'direction-ltr'}`}>
            {/* ─── HEADER ─── */}
            <div className="card-premium p-5 lg:p-6 rounded-[2rem] bg-[var(--surface-1)] border border-[var(--glass-border)] relative overflow-hidden shadow-[var(--shadow-card)]">
                <div className="absolute top-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[100px] -ml-32 -mt-32 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

                <div className={`relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${isRTL ? '' : 'flex-row-reverse'}`}>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <div className={`flex items-center gap-3 mb-2 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className="p-2.5 bg-orange-500/10 rounded-xl shadow-sm border border-orange-500/20">
                                <Truck size={24} className="text-orange-500" />
                            </div>
                            <div>
                                <h1 className="text-xl lg:text-2xl font-black text-[var(--text-primary)]">{t('supplier_network')}</h1>
                            </div>
                        </div>
                        <p className="text-[--text-muted] text-xs font-bold opacity-80 mt-1 tracking-tight">{isRTL ? 'إدارة الموردين والطلبيات الخارجية' : 'Gestion des fournisseurs'}</p>
                    </div>

                    <button
                        onClick={() => openModal()}
                        className={`btn-primary h-11 px-6 flex items-center gap-2 font-bold shadow-orange-glow hover:-translate-y-0.5 transition-all text-white text-sm ${isRTL ? '' : 'flex-row-reverse'}`}
                        style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}
                    >
                        <Plus size={18} />
                        {t('add_supplier')}
                    </button>
                </div>
            </div>

            {/* ─── SEARCH BAR & FILTERS ─── */}
            <div className={`flex flex-col md:flex-row gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className="relative flex-1 group">
                    <Search
                        className={`absolute top-1/2 -translate-y-1/2 text-[--text-muted] group-focus-within:text-orange-500 transition-colors duration-300 ${isRTL ? 'right-4' : 'left-4'}`}
                        size={18}
                    />
                    <input
                        type="text"
                        placeholder={t('search_supplier_placeholder')}
                        className={`w-full bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl h-12 text-[13px] font-bold focus:outline-none focus:border-orange-500/40 focus:bg-[var(--card-bg)] transition-all shadow-inner text-[var(--text-main)] ${isRTL ? 'pr-12 pl-12 text-right' : 'pl-12 pr-12 text-left'} placeholder:text-[var(--text-faint)]`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className={`absolute top-1/2 -translate-y-1/2 p-1.5 bg-[var(--surface-1)] border border-[var(--glass-border)] rounded-lg text-[--text-muted] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors ${isRTL ? 'left-4' : 'right-4'}`}
                        >
                            <X size={16} strokeWidth={2.5} />
                        </button>
                    )}
                </div>
                <div className="relative min-w-[200px]">
                    <select 
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className={`w-full h-12 bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl ${isRTL ? 'pr-4 pl-10 text-right' : 'pl-4 pr-10 text-left'} text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:border-orange-500/40 text-[var(--text-main)]`}
                    >
                        <option value="ALL">{isRTL ? 'جميع الموردين' : 'Tous les fournisseurs'}</option>
                        <option value="CREDITORS">{isRTL ? 'موردون يطلبون سداد' : 'Fournisseurs créanciers'}</option>
                    </select>
                    <ChevronLeft size={16} className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-[--text-muted] pointer-events-none -rotate-90`} />
                </div>
            </div>

            {/* ─── STAT CARDS ─── */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${isRTL ? '' : 'direction-ltr'}`}>
                <StatCard 
                    title={isRTL ? 'إجمالي الموردين' : 'Total Fournisseurs'} 
                    value={totalSuppliers} 
                    colorClass="bg-blue-500/10 border-blue-500/20 text-blue-500" 
                    isRTL={isRTL} 
                    hideCurrency
                />
                <StatCard 
                    title={isRTL ? 'إجمالي الديون (علينا)' : 'Total Dettes (Sur nous)'} 
                    value={fmtNumber(totalBalance)} 
                    colorClass="bg-red-500/10 border-red-500/20 text-red-500" 
                    isRTL={isRTL} 
                />
                <StatCard 
                    title={isRTL ? 'موردون يطلبون سداد' : 'Fournisseurs à payer'} 
                    value={debtors} 
                    colorClass="bg-orange-500/10 border-orange-500/20 text-orange-500" 
                    isRTL={isRTL} 
                    hideCurrency
                />
            </div>

            {/* ─── SUPPLIERS GRID ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-44 bg-[var(--surface-1)] animate-pulse rounded-[2rem] border border-[var(--glass-border)]" />
                    ))
                ) : filteredSuppliers.length === 0 ? (
                    <div className="col-span-full py-24 flex flex-col items-center gap-4 opacity-70 card-premium bg-[var(--surface-1)] border-[var(--glass-border)]">
                        <Truck size={72} strokeWidth={1} className="text-[var(--text-muted)]" />
                        <p className="font-extrabold text-lg text-[var(--text-primary)]">{search ? (isRTL ? 'لا توجد نتائج مطابقة' : 'Aucun résultat trouvé') : (isRTL ? 'لا يوجد موردون مضافون بعد' : 'Pas encore de fournisseurs')}</p>
                        {!search && (
                            <p className="text-sm font-bold text-[--text-muted]">{isRTL ? 'ابدأ بإضافة أول مورد لمنشأتك' : 'Ajoutez votre premier fournisseur'}</p>
                        )}
                    </div>
                ) : filteredSuppliers.map((sup, index) => (
                    <SupplierCard
                        key={sup.id}
                        supplier={sup}
                        index={index}
                        isRTL={isRTL}
                        t={t}
                        onEdit={() => openModal(sup)}
                        onDelete={() => handleDelete(sup.id)}
                    />
                ))}
            </div>

            {/* ─── MODAL ─── */}
            <RaidModal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={currentSupplier ? t('edit_supplier_data') : t('new_supplier')}
            >
                <div className="mb-6">
                    <p className={`text-[var(--text-faint)] text-xs font-bold uppercase tracking-wide opacity-80 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {isRTL ? 'ملء جميع البيانات يضمن دقة الفواتير' : 'Remplir toutes les données assure la précision'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <FormField label={t('supplier_name_label')} icon={<Truck size={14} />} required isRTL={isRTL}>
                        <input
                            required
                            className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-5 text-sm font-bold focus:outline-none focus:border-orange-500/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'}`}
                            placeholder={t('supplier_name_placeholder')}
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </FormField>

                    <FormField label={t('company_name_label')} icon={<Building2 size={14} />} isRTL={isRTL}>
                        <input
                            className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-5 text-sm font-bold focus:outline-none focus:border-orange-500/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'}`}
                            placeholder={t('company_name_placeholder')}
                            value={formData.company}
                            onChange={e => setFormData({ ...formData, company: e.target.value })}
                        />
                    </FormField>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField label={t('phone_label')} icon={<Phone size={14} />} isRTL={isRTL}>
                            <input
                                className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-5 text-sm font-bold focus:outline-none focus:border-orange-500/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'}`}
                                placeholder="05xxxxxxxx"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </FormField>
                        <FormField label={t('email_label')} icon={<Mail size={14} />} isRTL={isRTL}>
                            <input
                                type="email"
                                className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-5 text-sm font-bold focus:outline-none focus:border-orange-500/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'}`}
                                placeholder="vendor@mail.com"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </FormField>
                    </div>

                    <button
                        type="submit"
                        className="w-full h-14 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 mt-4 text-white shadow-orange-glow"
                        style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}
                    >
                        <Save size={20} />
                        {currentSupplier ? t('save_changes') : t('register_supplier')}
                    </button>
                </form>
            </RaidModal>

            {/* ─── Custom Professional Dialog ─── */}
            <RaidDialog
                isOpen={dialog.isOpen}
                onClose={closeDialog}
                title={dialog.title}
                message={dialog.message}
                type={dialog.type}
                onConfirm={dialog.onConfirm}
            />
        </div>
    );
}

function SupplierCard({ supplier, index, onEdit, onDelete, isRTL, t }) {
    const { fmtNumber } = useLanguage();
    const hasBalance = supplier.balance > 0;
    const initials = supplier.name.split(' ').slice(0, 2).map(w => w[0]).join('');

    return (
        <div
            className={`card-premium group relative border-[var(--glass-border)] bg-[var(--surface-2)] flex flex-col hover:border-orange-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${isRTL ? 'text-right' : 'text-left'}`}
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Accent border */}
            <div className={`absolute top-0 w-1 h-full transition-all group-hover:w-1.5 ${isRTL ? 'right-0' : 'left-0'} ${hasBalance ? 'bg-red-500' : 'bg-orange-500'}`} />

            {/* Header */}
            <div className={`flex justify-between items-start mb-6 pt-2 ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border shadow-sm ${hasBalance ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'}`}
                >
                    {initials}
                </div>

                <div className={`flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 ${isRTL ? '' : 'flex-row-reverse'}`}>
                    <Link
                        href={`/dashboard/suppliers/${supplier.id}/statement`}
                        className="p-2.5 bg-[var(--surface-1)] hover:bg-blue-500/10 rounded-xl text-[var(--text-faint)] hover:text-blue-500 border border-[var(--glass-border)] shadow-sm transition-colors"
                        title={isRTL ? 'كشف الحساب' : 'Relevé'}
                    >
                        <FileText size={16} />
                    </Link>
                    <button
                        onClick={onEdit}
                        className="p-2.5 bg-[var(--surface-1)] hover:bg-orange-500/10 rounded-xl text-[var(--text-faint)] hover:text-orange-500 border border-[var(--glass-border)] shadow-sm transition-colors"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2.5 bg-[var(--surface-1)] hover:bg-red-500/10 rounded-xl text-[var(--text-faint)] hover:text-red-500 border border-[var(--glass-border)] shadow-sm transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Info */}
            <div className="flex-1">
                <h3 className="text-[17px] font-extrabold text-[var(--text-primary)] mb-4 truncate group-hover:text-orange-500 transition-colors">
                    {supplier.name}
                </h3>
                {supplier.company && (
                    <div className={`flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-1)] rounded-lg w-fit border border-[var(--glass-border)] mb-4 ${isRTL ? '' : 'flex-row-reverse ml-auto'}`}>
                        <Building2 size={13} className="text-[--text-muted]" />
                        <span className="text-[10px] text-[--text-muted] font-extrabold uppercase tracking-widest">{supplier.company}</span>
                    </div>
                )}

                <div className={`space-y-3 px-1 ${isRTL ? '' : 'flex flex-col items-end'}`}>
                    {supplier.phone && (
                        <div className={`flex items-center gap-3 text-sm text-[--text-muted] ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className="p-1.5 bg-[var(--surface-1)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)]">
                                <Phone size={12} strokeWidth={2.5} />
                            </div>
                            <span className="font-extrabold">{supplier.phone}</span>
                        </div>
                    )}
                    {supplier.email && (
                        <div className={`flex items-center gap-3 text-sm text-[--text-muted] ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className="p-1.5 bg-[var(--surface-1)] border border-[var(--glass-border)] rounded-lg text-[var(--text-primary)]">
                                <Mail size={12} strokeWidth={2.5} />
                            </div>
                            <span className="font-bold truncate opacity-80 max-w-[160px]">{supplier.email}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div
                className={`mt-6 pt-5 flex justify-between items-end border-t border-[var(--glass-border)] ${isRTL ? '' : 'flex-row-reverse'}`}
            >
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-faint)] mb-1">
                        {isRTL ? 'الرصيد المستحق' : 'Solde Dû'}
                    </div>
                    <div className={`text-xl font-black ${hasBalance ? 'text-red-500' : 'text-[var(--text-main)]'} ${isRTL ? '' : 'direction-ltr'}`}>
                        {fmtNumber(supplier.balance || 0)}
                        <span className="text-[10px] uppercase font-bold opacity-70 px-1">MRU</span>
                    </div>
                </div>
                <div
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${isRTL ? '' : 'flex-row-reverse'} ${hasBalance ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}
                >
                    {hasBalance ? <AlertCircle size={12} strokeWidth={2.5} /> : <ShieldCheck size={12} strokeWidth={2.5} />}
                    {hasBalance ? (isRTL ? 'لديه رصيد' : 'Solde') : (isRTL ? 'مسوّى' : 'Réglé')}
                </div>
            </div>
        </div>
    );
}

function FormField({ label, icon, required, children, isRTL }) {
    return (
        <div className="space-y-2">
            <label className={`text-[11px] font-black uppercase text-[--text-muted] flex items-center gap-1.5 tracking-wide ${isRTL ? '' : 'flex-row-reverse justify-end'}`}>
                {icon}
                {label}
                {required && <span className="text-red-500">*</span>}
            </label>
            {children}
        </div>
    );
}

function StatCard({ title, value, colorClass, isRTL, hideCurrency }) {
    return (
        <div className={`p-6 rounded-3xl border border-[var(--glass-border)] bg-[var(--surface-1)] shadow-sm hover:-translate-y-1 transition-transform duration-300 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className="text-[11px] font-black uppercase tracking-widest text-[--text-muted] mb-3">{title}</div>
            <div className={`text-4xl font-black ${colorClass.split(' ')[2]} flex items-baseline gap-2 ${isRTL ? '' : 'flex-row-reverse'}`}>
                {value}
                {!hideCurrency && <span className="text-xs font-black opacity-60">MRU</span>}
            </div>
            <div className={`mt-3 h-1 w-12 rounded-full ${colorClass.split(' ')[0]} ${colorClass.split(' ')[2].replace('text-', 'bg-')}`} />
        </div>
    );
}

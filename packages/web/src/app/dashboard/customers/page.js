'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '@/lib/api';
import {
    Users, Plus, Phone, Mail, Building2, Search, X, Save,
    UserCheck, ShieldAlert, CreditCard, ChevronRight, Edit2, Trash2,
    DollarSign, User, Eye, ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';
import RaidDialog from '@/components/RaidDialog';
import RaidModal from '@/components/RaidModal';

import { db } from '@/lib/db';

export default function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('ALL'); // ALL or DEBTORS
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState(null);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
    const { t, isRTL, fmtNumber } = useLanguage();

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
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            // 1. Try Cloud
            const { data } = await api.get('/customers');
            setCustomers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.warn('Customers: Falling back to local data');
            // 2. Local Fallback
            const localCustomers = await db.clients.where('role').notEqual('supplier').toArray();
            setCustomers(localCustomers);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (currentCustomer) {
                await api.put(`/customers/${currentCustomer.id}`, formData);
            } else {
                await api.post('/customers', formData);
            }
            fetchCustomers();
            closeModal();
            triggerDialog(
                isRTL ? 'نجاح ✨' : 'Succès ✨', 
                isRTL ? 'تم حفظ بيانات العميل بنجاح' : 'Données client enregistrées avec succès', 
                'success'
            );
        } catch (err) {
            triggerDialog(
                isRTL ? 'خطأ ❌' : 'Erreur ❌', 
                isRTL ? 'حدث خطأ أثناء معالجة الطلب' : 'Erreur lors du traitement', 
                'danger'
            );
        }
    };

    const handleDelete = (id) => {
        triggerDialog(
            isRTL ? 'تأكيد الحذف' : 'Confirmer la suppression',
            isRTL ? 'هل تريد إزالة هذا العميل من القائمة؟ ستفقد كافة بيانات التواصل معه.' : 'Voulez-vous supprimer ce client de la liste ? Vous perdrez toutes ses coordonnées.',
            'danger',
            async () => {
                try {
                    await api.delete(`/customers/${id}`);
                    fetchCustomers();
                    triggerDialog(
                        isRTL ? 'تم الحذف' : 'Supprimé', 
                        isRTL ? 'تم إزالة العميل بنجاح' : 'Client supprimé avec succès', 
                        'success'
                    );
                } catch (err) {
                    triggerDialog(
                        isRTL ? 'خطأ' : 'Erreur', 
                        isRTL ? 'فشل حذف العميل. قد يكون لديه فواتير مرتبطة.' : 'Échec de la suppression.', 
                        'warning'
                    );
                }
            }
        );
    };

    const openModal = (customer = null) => {
        if (customer) {
            setCurrentCustomer(customer);
            setFormData({
                name: customer.name,
                phone: customer.phone || '',
                email: customer.email || '',
            });
        } else {
            setCurrentCustomer(null);
            setFormData({ name: '', phone: '', email: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentCustomer(null);
    };

    const filteredCustomers = useMemo(() => {
        return customers.filter(cust => {
            const matchesSearch = cust.name.toLowerCase().includes(search.toLowerCase()) || 
                                 cust.phone?.includes(search);
            const matchesFilter = filterType === 'ALL' || (filterType === 'DEBTORS' && cust.balance > 0);
            return matchesSearch && matchesFilter;
        });
    }, [customers, search, filterType]);

    const totalCustomers = useMemo(() => customers.length, [customers]);
    const totalBalance = useMemo(() => customers.reduce((sum, c) => sum + (c.balance || 0), 0), [customers]);
    const debtorsCount = useMemo(() => customers.filter(c => (c.balance || 0) > 0).length, [customers]);

    return (
        <div className="space-y-8 animate-fade-up pb-10 bg-[var(--background)] min-h-[85vh]">
            {/* ─── HEADER ─── */}
            <div className="card-premium p-5 lg:p-6 rounded-[2rem] bg-[var(--surface-1)] border border-[var(--glass-border)] relative overflow-hidden shadow-[var(--shadow-card)]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

                <div className={`relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${isRTL ? '' : 'md:flex-row-reverse'}`}>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <div className={`flex items-center gap-3 mb-2 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className="p-2.5 bg-secondary/10 rounded-xl shadow-sm"><Users size={24} className="text-secondary" /></div>
                            <div>
                                <h1 className="text-xl lg:text-2xl font-black text-[var(--text-primary)]">{t('customers')}</h1>
                            </div>
                        </div>
                        <p className="text-[--text-muted] text-xs font-bold opacity-80 mt-1 tracking-tight">{isRTL ? 'قاعدة بيانات الشركاء والالتزامات' : 'Base de données des partenaires'}</p>
                    </div>

                    <button
                        onClick={() => openModal()}
                        className="btn-primary h-11 px-6 flex items-center gap-2 font-bold shadow-[var(--shadow-primary)] hover:-translate-y-0.5 transition-all text-sm"
                    >
                        <Plus size={18} />
                        {isRTL ? 'إضافة عميل' : 'Nouveau client'}
                    </button>
                </div>
            </div>

            {/* ─── SEARCH & FILTERS ─── */}
            <div className={`flex flex-col md:flex-row gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className="relative flex-1 group">
                    <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-[--text-muted] group-focus-within:text-primary transition-colors duration-300`} size={18} />
                    <input
                        type="text"
                        placeholder={isRTL ? "ابحث باسم العميل أو رقم الجوال..." : "Rechercher par nom ou téléphone..."}
                        className={`w-full bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl h-12 ${isRTL ? 'pr-12 pl-6 text-right' : 'pl-12 pr-6 text-left'} text-sm font-bold focus:outline-none focus:border-primary/40 focus:bg-[var(--card-bg)] transition-all shadow-inner text-[var(--text-main)] placeholder:text-[var(--text-faint)]`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="relative min-w-[200px]">
                    <select 
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className={`w-full h-12 bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl ${isRTL ? 'pr-4 pl-10 text-right' : 'pl-4 pr-10 text-left'} text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:border-primary/40 text-[var(--text-main)]`}
                    >
                        <option value="ALL">{isRTL ? 'جميع العملاء' : 'Tous les clients'}</option>
                        <option value="DEBTORS">{isRTL ? 'عملاء بمديونية' : 'Clients débiteurs'}</option>
                    </select>
                    <ChevronDown size={16} className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-[--text-muted] pointer-events-none`} />
                </div>
            </div>

            {/* ─── STAT CARDS ─── */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${isRTL ? '' : 'direction-ltr'}`}>
                <StatCard 
                    title={isRTL ? 'إجمالي العملاء' : 'Total Clients'} 
                    value={totalCustomers} 
                    colorClass="bg-blue-500/10 border-blue-500/20 text-blue-500" 
                    isRTL={isRTL} 
                    hideCurrency
                />
                <StatCard 
                    title={isRTL ? 'إجمالي الديون (لصالحنا)' : 'Total Dettes (Pour nous)'} 
                    value={fmtNumber(totalBalance)} 
                    colorClass="bg-red-500/10 border-red-500/20 text-red-500" 
                    isRTL={isRTL} 
                />
                <StatCard 
                    title={isRTL ? 'عملاء بمديونية' : 'Clients avec dettes'} 
                    value={debtorsCount} 
                    colorClass="bg-amber-500/10 border-amber-500/20 text-amber-500" 
                    isRTL={isRTL} 
                    hideCurrency
                />
            </div>

            {/* ─── GRID ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {
                    loading ? (
                        Array(8).fill(0).map((_, i) => <div key={i} className="h-44 bg-[var(--surface-1)] animate-pulse rounded-[2rem] border border-[var(--glass-border)]" />)
                    ) : filteredCustomers.length === 0 ? (
                        <div className="col-span-full py-24 flex flex-col items-center gap-4 opacity-70 bg-[var(--surface-1)] card-premium border-[var(--glass-border)]">
                            <Users size={64} strokeWidth={1} className="text-[var(--text-muted)]" />
                            <p className="font-extrabold text-lg text-[var(--text-primary)]">{isRTL ? 'لا توجد بيانات عملاء مطابقة' : 'Aucun client trouvé'}</p>
                        </div>
                    ) : filteredCustomers.map((cust, idx) => (
                        <CustomerCard
                            key={cust.id}
                            customer={cust}
                            index={idx}
                            onEdit={() => openModal(cust)}
                            onDelete={() => handleDelete(cust.id)}
                            isRTL={isRTL}
                        />
                    ))
                }
            </div >

            {/* ─── MODAL ─── */}
            <RaidModal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={currentCustomer ? (isRTL ? 'تعديل الملف' : 'Éditer le profil') : (isRTL ? 'إضافة عميل' : 'Nouveau client')}
            >
                <div className="mb-6">
                   <p className={`text-[var(--text-faint)] text-xs font-bold uppercase tracking-wide opacity-80 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {isRTL ? 'سجل بيانات التواصل بدقة' : 'Saisir les coordonnées avec précision'}
                   </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <FormField label={isRTL ? "الاسم الكامل" : "Nom complet"} icon={<User size={14} />} required isRTL={isRTL}>
                        <input
                            required
                            className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-5 text-sm font-bold focus:outline-none focus:border-primary/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'}`}
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </FormField>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField label={isRTL ? "رقم الجوال" : "Téléphone"} icon={<Phone size={14} />} isRTL={isRTL}>
                            <input
                                className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-5 text-sm font-bold focus:outline-none focus:border-primary/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'}`}
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </FormField>
                        <FormField label={isRTL ? "البريد الإلكتروني" : "Email"} icon={<Mail size={14} />} isRTL={isRTL}>
                            <input
                                type="email"
                                className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-5 text-sm font-bold focus:outline-none focus:border-primary/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'}`}
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </FormField>
                    </div>
                    <button type="submit" className="btn-primary w-full h-14 text-base mt-4 shadow-primary-glow flex items-center justify-center gap-3 font-black">
                        <Save size={20} />
                        {currentCustomer ? (isRTL ? 'حفظ التعديلات' : 'Enregistrer') : (isRTL ? 'إضافة العميل' : 'Ajouter le client')}
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
        </div >
    );
}

function CustomerCard({ customer, index, onEdit, onDelete, isRTL }) {
    const { fmtNumber } = useLanguage();
    const isDebtor = customer.balance > 0;
    const initials = customer.name.split(' ').map(n => n[0]).join('').slice(0, 2);

    return (
        <div className="card-premium group relative border-[var(--glass-border)] bg-[var(--surface-2)] flex flex-col hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-md" style={{ animationDelay: `${index * 50}ms` }}>
            <div className={`absolute top-0 ${isRTL ? 'right-0' : 'left-0'} w-1 h-full transition-all group-hover:w-1.5 ${isDebtor ? 'bg-red-500' : 'bg-secondary'}`} />

            <div className={`flex justify-between items-start mb-6 pt-2 ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border shadow-sm ${isDebtor ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-secondary/10 border-secondary/20 text-secondary'}`}>
                    {initials}
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Link href={`/dashboard/statement?cid=${customer.id}`} className="p-2.5 bg-[var(--surface-1)] hover:bg-secondary/10 rounded-xl text-[var(--text-faint)] hover:text-secondary border border-[var(--glass-border)]"><Eye size={16} /></Link>
                    <button onClick={onEdit} className="p-2.5 bg-[var(--surface-1)] hover:bg-primary/10 rounded-xl text-[var(--text-faint)] hover:text-primary border border-[var(--glass-border)]"><Edit2 size={16} /></button>
                    <button onClick={onDelete} className="p-2.5 bg-[var(--surface-1)] hover:bg-red-500/10 rounded-xl text-[var(--text-faint)] hover:text-red-500 border border-[var(--glass-border)]"><Trash2 size={16} /></button>
                </div>
            </div>

            <div className="flex-1">
                <h3 className={`text-[17px] font-extrabold text-[var(--text-primary)] mb-4 truncate group-hover:text-primary transition-colors ${isRTL ? 'text-right' : 'text-left'}`}>{customer.name}</h3>
                <div className="space-y-3 px-1">
                    <div className={`flex items-center gap-3 text-sm text-[var(--text-faint)] ${isRTL ? '' : 'flex-row-reverse'}`}>
                        <div className="p-1.5 bg-[var(--surface-1)] border border-[var(--glass-border)] rounded-lg text-[var(--text-main)]"><Phone size={12} strokeWidth={2.5} /></div>
                        <span className="font-extrabold">{customer.phone || (isRTL ? 'غير مسجل' : 'Non inscrit')}</span>
                    </div>
                    <div className={`flex items-center gap-3 text-sm text-[var(--text-faint)] ${isRTL ? '' : 'flex-row-reverse'}`}>
                        <div className="p-1.5 bg-[var(--surface-1)] border border-[var(--glass-border)] rounded-lg text-[var(--text-main)]"><Mail size={12} strokeWidth={2.5} /></div>
                        <span className="font-bold truncate opacity-80">{customer.email || (isRTL ? 'بدون بريد' : 'Pas d\'email')}</span>
                    </div>
                </div>
            </div>

            <div className={`mt-6 pt-5 border-t border-[var(--glass-border)] flex justify-between items-end ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-faint)] mb-1">{isRTL ? 'الرصيد القائم' : 'Solde actuel'}</div>
                    <div className={`text-xl font-black ${isDebtor ? 'text-red-500' : 'text-secondary'}`}>
                        {fmtNumber(customer.balance)} <span className="text-[10px] uppercase font-bold opacity-70">MRU</span>
                    </div>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${isDebtor ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                    {isDebtor ? <ShieldAlert size={12} strokeWidth={2.5} /> : <UserCheck size={12} strokeWidth={2.5} />}
                    {isDebtor ? (isRTL ? 'مدين' : 'Débiteur') : (isRTL ? 'منتظم' : 'Réglé')}
                </div>
            </div>
        </div>
    );
}

function FormField({ label, icon, required, isRTL, children }) {
    return (
        <div className="space-y-2">
            <label className={`text-[11px] font-black uppercase text-[--text-muted] flex items-center gap-1.5 tracking-wide ${isRTL ? 'flex-row' : 'flex-row-reverse justify-end'}`}>
                {icon} {label} {required && <span className="text-red-500">*</span>}
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

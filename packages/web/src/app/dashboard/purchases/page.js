'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    ShoppingBag, Plus, Search, X, Save, Truck, Package,
    Calendar, DollarSign, ChevronDown, Filter, TrendingDown,
    Receipt, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import RaidDialog from '@/components/RaidDialog';
import RaidModal from '@/components/RaidModal';

import { db } from '@/lib/db';

export default function PurchasesPage() {
    const { t, isRTL, fmtNumber } = useLanguage();
    const [purchases, setPurchases] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [filterSupplier, setFilterSupplier] = useState('all');
    const [formData, setFormData] = useState({
        supplierId: '',
        totalAmount: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
        warehouseId: '',
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
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [purchRes, supRes, warRes] = await Promise.all([
                api.get('/purchases').catch(() => ({ data: [] })),
                api.get('/suppliers').catch(() => ({ data: [] })),
                api.get('/warehouses').catch(() => ({ data: [] })),
            ]);
            let purchasesData = Array.isArray(purchRes.data) ? purchRes.data : [];
            let suppliersData = Array.isArray(supRes.data) ? supRes.data : [];
            let warehousesData = Array.isArray(warRes.data) ? warRes.data : [];

            // If all empty, try local fallback
            if (purchasesData.length === 0 && suppliersData.length === 0 && !navigator.onLine) {
                try {
                    purchasesData = await db.purchases.toArray();
                    suppliersData = await db.suppliers.toArray();
                    warehousesData = await db.warehouses.toArray();
                } catch {}
            }

            setPurchases(purchasesData);
            setSuppliers(suppliersData);
            setWarehouses(warehousesData);
            if (warehousesData.length > 0) {
                setFormData(prev => ({ ...prev, warehouseId: warehousesData[0].id }));
            }
        } catch (err) {
            console.error(err);
            // Full offline fallback
            try {
                setPurchases(await db.purchases.toArray());
                setSuppliers(await db.suppliers.toArray());
                const wh = await db.warehouses.toArray();
                setWarehouses(wh);
                if (wh.length > 0) setFormData(prev => ({ ...prev, warehouseId: wh[0].id }));
            } catch {}
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                supplierId: formData.supplierId,
                total: formData.totalAmount,
                date: formData.date,
                notes: formData.notes,
                warehouseId: formData.warehouseId,
                items: []
            };
            await api.post('/purchases', payload);
            fetchData();
            closeModal();
            triggerDialog(
                isRTL ? 'تم التسجيل ✨' : 'Enregistré ✨', 
                isRTL ? 'تم تسجيل عملية الشراء بنجاح' : 'L’achat a été enregistré avec succès', 
                'success'
            );
        } catch (err) {
            triggerDialog(
                isRTL ? 'خطأ ❌' : 'Erreur ❌', 
                isRTL ? 'حدث خطأ أثناء تسجيل عملية الشراء' : 'Erreur lors de l’enregistrement de l’achat', 
                'danger'
            );
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData({
            supplierId: '',
            totalAmount: '',
            notes: '',
            date: new Date().toISOString().split('T')[0],
            warehouseId: warehouses[0]?.id || '',
        });
    };

    const totalPurchases = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const thisMonth = purchases.filter(p => {
        const d = new Date(p.date || p.createdAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, p) => sum + (p.totalAmount || 0), 0);

    const filtered = purchases.filter(p => {
        const matchSearch = !search ||
            (p.notes && p.notes.toLowerCase().includes(search.toLowerCase())) ||
            (p.supplier && p.supplier.name.toLowerCase().includes(search.toLowerCase()));
        const matchSupplier = filterSupplier === 'all' || p.supplierId === filterSupplier;
        return matchSearch && matchSupplier;
    });

    return (
        <div className="space-y-8 animate-fade-up pb-10 bg-[var(--background)]">
            {/* ─── HEADER ─── */}
            <div className="card-premium p-5 lg:p-6 rounded-[2rem] bg-[var(--surface-1)] border border-[var(--glass-border)] relative overflow-hidden shadow-[var(--shadow-card)]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

                <div className={`relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${isRTL ? '' : 'flex-row-reverse'}`}>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <div className={`flex items-center gap-3 mb-2 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/5 shadow-sm">
                                <ShoppingBag size={24} className="text-accent" />
                            </div>
                            <div>
                                <h1 className="text-xl lg:text-2xl font-black text-[var(--text-primary)]">{t('manage_purchases')}</h1>
                            </div>
                        </div>
                        <p className="text-[--text-muted] text-xs font-bold opacity-80 mt-1 tracking-tight">{isRTL ? 'إدارة المشتريات والمخازن' : 'Gérer les achats et stocks'}</p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => window.print()}
                            className={`btn-secondary h-11 px-6 rounded-xl font-bold text-sm flex items-center gap-2 border border-[var(--glass-border)] bg-[var(--surface-1)] hover:bg-white transition-all print:hidden ${isRTL ? '' : 'flex-row-reverse'}`}
                        >
                            <Receipt size={18} />
                            {isRTL ? 'طباعة التقرير' : 'Imprimer Journal'}
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className={`btn-primary h-11 px-6 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 group/btn overflow-hidden print:hidden ${isRTL ? '' : 'flex-row-reverse'}`}
                            style={{
                                background: 'linear-gradient(135deg, var(--accent) 0%, #db2777 100%)',
                                boxShadow: '0 8px 24px rgba(219,39,119,0.25)'
                            }}
                        >
                            <Plus size={18} />
                            {t('new_purchase')}
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── PRINT JOURNAL ─── */}
            <div className="hidden print:block bg-white p-12 text-black min-h-screen font-serif" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="text-center border-b-4 border-accent pb-10 mb-12">
                    <h1 className="text-4xl font-black mb-1 text-black tracking-tighter uppercase">{isRTL ? 'رائد' : 'RAID'}</h1>
                    <h2 className="text-2xl font-black uppercase tracking-widest text-accent">{isRTL ? 'سجل المشتريات والتوريدات' : 'JOURNAL DES ACHATS'}</h2>
                    <p className="text-sm mt-3 opacity-70 font-bold uppercase tracking-widest text-gray-500">
                        {isRTL ? 'تاريخ الاستخراج:' : 'Date d\'extraction:'} {fmtDate(new Date())}
                    </p>
                </div>

                <table className="w-full border-collapse mb-10 text-lg">
                    <thead>
                        <tr className="bg-accent/5 border-b-2 border-accent text-sm font-black uppercase tracking-widest">
                            <th className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'التاريخ' : 'Date'}</th>
                            <th className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'المورد' : 'Fournisseur'}</th>
                            <th className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'ملاحظات' : 'Notes'}</th>
                            <th className={`p-4 ${isRTL ? 'text-left' : 'text-right'}`}>{isRTL ? 'المبلغ' : 'Montant'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filtered.map(p => (
                            <tr key={p.id} className="border-b border-gray-100">
                                <td className={`p-4 font-bold text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{fmtDate(p.date || p.createdAt)}</td>
                                <td className={`p-4 font-black text-accent ${isRTL ? 'text-right' : 'text-left'}`}>{p.supplier?.name}</td>
                                <td className={`p-4 text-xs font-bold opacity-60 italic ${isRTL ? 'text-right' : 'text-left'}`}>{p.notes || '---'}</td>
                                <td className={`p-4 font-black ${isRTL ? 'text-left' : 'text-right'}`}>{fmtNumber(p.totalAmount)} MRU</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-20 border-t-2 border-accent pt-10 text-center text-[10px] font-black text-accent/50 uppercase tracking-[0.4em]">
                    End of Purchases Journal • Rapport Raid Professional
                </div>
            </div>

            {/* ─── STATS ROW (Bento) ─── */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${isRTL ? '' : 'direction-ltr'}`}>
                <KpiCard
                    icon={<ShoppingBag size={24} className="text-accent" />}
                    title={t('total_purchases')}
                    value={`${fmtNumber(totalPurchases)} MRU`}
                    sub={isRTL ? "منذ بداية النشاط" : "Depuis le début"}
                    gradient="from-accent/10 to-transparent"
                    border="border-accent/15"
                    isRTL={isRTL}
                />
                <KpiCard
                    icon={<Calendar size={24} className="text-primary" />}
                    title={isRTL ? "مشتريات هذا الشهر" : "Achats du mois"}
                    value={`${fmtNumber(thisMonth)} MRU`}
                    sub={isRTL ? "الشهر الحالي" : "Mois en cours"}
                    gradient="from-primary/10 to-transparent"
                    border="border-primary/15"
                    isRTL={isRTL}
                />
                <KpiCard
                    icon={<Truck size={24} className="text-secondary" />}
                    title={isRTL ? "الموردين النشطين" : "Fournisseurs actifs"}
                    value={suppliers.length}
                    sub={isRTL ? "مورد مسجل لدينا" : "Fournisseurs enregistrés"}
                    gradient="from-secondary/10 to-transparent"
                    border="border-secondary/15"
                    isRTL={isRTL}
                />
            </div>

            {/* ─── FILTERS ─── */}
            <div className={`flex flex-col lg:flex-row justify-between items-center gap-6 ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className={`flex p-1 bg-[var(--surface-1)] rounded-xl border border-[var(--glass-border)] shadow-sm w-full lg:w-auto ${isRTL ? '' : 'flex-row-reverse'}`}>
                    <div className={`flex items-center gap-2 px-6 py-2 rounded-lg bg-accent/10 shadow-sm border border-accent/10 text-accent font-bold text-[13px] ${isRTL ? '' : 'flex-row-reverse'}`}>
                        <Filter size={16} />
                        {isRTL ? 'تصفية حسب الموردين' : 'Filtrer par fournisseur'}
                    </div>
                </div>

                <div className="relative w-full lg:w-80 group">
                    <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-[--text-muted] group-focus-within:text-accent transition-colors`} size={18} />
                    <input
                        type="text"
                        placeholder={isRTL ? "ابحث هنا..." : "Rechercher..."}
                        className={`w-full h-11 bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl ${isRTL ? 'pr-12 pl-6 text-right' : 'pl-12 pr-6 text-left'} text-[13px] font-bold focus:outline-none focus:border-accent/40 focus:bg-[var(--surface-1)] transition-all shadow-inner text-[var(--text-primary)]`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>
            <div className="relative group md:w-64">
                <Truck className={`absolute top-1/2 -translate-y-1/2 text-[--text-muted] pointer-events-none group-focus-within:text-accent transition-colors ${isRTL ? 'right-5' : 'left-5'}`} size={20} />
                <select
                    className={`w-full h-14 bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-2xl text-sm font-extrabold focus:outline-none focus:border-accent/40 focus:bg-[var(--surface-1)] transition-all appearance-none cursor-pointer shadow-inner ${isRTL ? 'pr-14 pl-12 text-right' : 'pl-14 pr-12 text-left'} text-[var(--text-primary)]`}
                    value={filterSupplier}
                    onChange={(e) => setFilterSupplier(e.target.value)}
                >
                    <option value="all">{t('all_suppliers')}</option>
                    {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                <ChevronDown className={`absolute top-1/2 -translate-y-1/2 text-[--text-muted] pointer-events-none opacity-40 ${isRTL ? 'left-5' : 'right-5'}`} size={18} />
            </div>

            {/* ─── GRID ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-48 skeleton rounded-[2.5rem] bg-[var(--surface-1)] animate-pulse" />
                    ))
                ) : filtered.length === 0 ? (
                    <div className="col-span-full py-24 flex flex-col items-center gap-6 opacity-30 select-none">
                        <div className="p-10 bg-[var(--surface-1)] rounded-[3rem] border border-[var(--glass-border)] shadow-inner">
                            <ShoppingBag size={80} strokeWidth={1} />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="font-extrabold text-xl">{search ? (isRTL ? 'لا توجد مشتريات مطابقة للبحث' : 'Aucun résultat trouvé') : t('no_purchases')}</p>
                            {!search && (
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="mt-6 btn-primary px-8 py-3 rounded-2xl bg-gradient-to-r from-accent to-[#db2777] shadow-xl text-white font-black"
                                >
                                    {isRTL ? 'سجّل أول عملية شراء الآن' : 'Enregistrer votre premier achat'}
                                </button>
                            )}
                        </div>
                    </div>
                ) : filtered.map((purchase, i) => (
                    <PurchaseCard key={purchase.id} purchase={purchase} index={i} isRTL={isRTL} />
                ))}
            </div>

            {/* ─── MODAL ─── */}
            <RaidModal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={t('new_purchase')}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className={`text-[10px] font-black uppercase text-[var(--text-faint)] px-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'المورد' : 'Fournisseur'}</label>
                            <div className="relative">
                                <Truck size={16} className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-accent/50`} />
                                <select
                                    required
                                    className={`w-full bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl h-12 ${isRTL ? 'pr-12 pl-6 text-right' : 'pl-12 pr-6 text-left'} text-sm font-bold focus:outline-none focus:border-accent/40 focus:bg-[var(--surface-1)] transition-all appearance-none cursor-pointer text-[var(--text-primary)]`}
                                    value={formData.supplierId}
                                    onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                                >
                                    <option value="">{isRTL ? 'اختر مورداً' : 'Choisir fournisseur'}</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.company || ''})</option>)}
                                </select>
                                <ChevronDown size={14} className={`absolute top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none ${isRTL ? 'left-4' : 'right-4'}`} />
                            </div>
                        </div>

                    <div className={`grid grid-cols-2 gap-5 ${isRTL ? '' : 'direction-ltr'}`}>
                        <div className="space-y-2.5">
                            <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] tracking-widest mr-1 opacity-70 flex items-center gap-2 ${isRTL ? 'justify-end' : 'justify-start flex-row-reverse'}`}>
                                <DollarSign size={12} /> {t('amount_label')}
                            </label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="0.00"
                                    className={`w-full h-14 bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-2xl text-lg font-black text-accent focus:outline-none focus:border-accent/40 focus:bg-[var(--surface-1)] transition-all shadow-inner ${isRTL ? 'pr-4 pl-14 text-right' : 'pl-4 pr-14 text-left'}`}
                                    value={formData.totalAmount}
                                    onChange={e => setFormData({ ...formData, totalAmount: e.target.value })}
                                />
                                <div className={`absolute top-1/2 -translate-y-1/2 text-[10px] font-black text-[var(--text-faint)] uppercase ${isRTL ? 'left-4' : 'right-4'}`}>MRU</div>
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] tracking-widest mr-1 opacity-70 flex items-center gap-2 ${isRTL ? 'justify-end' : 'justify-start flex-row-reverse'}`}>
                                <Calendar size={12} /> {t('date_label')}
                            </label>
                            <input
                                type="date"
                                className={`w-full h-14 bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-2xl px-5 text-sm font-black focus:outline-none focus:border-accent/40 focus:bg-[var(--surface-1)] transition-all shadow-inner ${isRTL ? 'text-right' : 'text-left'} text-[var(--text-primary)]`}
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] tracking-widest mr-1 opacity-70 flex items-center gap-2 ${isRTL ? 'justify-end' : 'justify-start flex-row-reverse'}`}>
                            <Package size={12} /> {t('notes_label')}
                        </label>
                        <textarea
                            rows={3}
                            placeholder={isRTL ? "اكتب هنا تفاصيل البضاعة المستلمة..." : "Détails de la marchandise..."}
                            className={`w-full bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-2xl p-5 text-sm font-bold focus:outline-none focus:border-accent/40 focus:bg-[var(--surface-1)] transition-all resize-none shadow-inner ${isRTL ? 'text-right' : 'text-left'} text-[var(--text-primary)]`}
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase text-[var(--text-faint)] px-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'المستودع' : 'Entrepôt'}</label>
                        <div className="relative">
                            <Package size={16} className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-accent/50`} />
                            <select
                                required
                                className={`w-full bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl h-12 ${isRTL ? 'pr-12 pl-6 text-right' : 'pl-12 pr-6 text-left'} text-sm font-bold focus:outline-none focus:border-accent/40 focus:bg-[var(--surface-1)] transition-all appearance-none cursor-pointer text-[var(--text-primary)]`}
                                value={formData.warehouseId}
                                onChange={e => setFormData({ ...formData, warehouseId: e.target.value })}
                            >
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                            <ChevronDown size={14} className={`absolute top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none ${isRTL ? 'left-4' : 'right-4'}`} />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={`w-full h-16 rounded-2xl font-black text-lg flex items-center justify-center gap-4 text-white shadow-xl transition-all active:scale-95 group/save relative overflow-hidden mt-4 ${isRTL ? '' : 'flex-row-reverse'}`}
                        style={{
                            background: 'linear-gradient(135deg, var(--accent), #db2777)',
                            boxShadow: '0 10px 30px rgba(219,39,119,0.2)'
                        }}
                    >
                        <Save size={24} className="group-hover/save:scale-110 transition-transform duration-300" />
                        {t('save_purchase')}
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

function PurchaseCard({ purchase, index, isRTL }) {
    const { fmtNumber } = useLanguage();
    const date = new Date(purchase.date || purchase.createdAt);
    const supplierName = purchase.supplier?.name || '---';
    const initials = supplierName.split(' ').slice(0, 2).map(w => w[0]).join('');

    return (
        <div
            className={`card-premium group p-6 rounded-[2.5rem] bg-[var(--surface-1)] border border-[var(--glass-border)] flex flex-col hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}
            style={{
                animationDelay: `${index * 0.05}s`,
                backdropFilter: 'blur(10px)'
            }}
        >
            <div className={`absolute top-0 w-1.5 h-full rounded-full bg-accent/40 group-hover:h-full transition-all duration-500 ${isRTL ? 'right-0' : 'left-0'}`} />

            <div className={`relative z-10 flex justify-between items-start mb-6 ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className={`flex items-center gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center font-black text-lg text-accent border border-accent/10 shadow-sm group-hover:scale-110 transition-transform">
                        {initials}
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <div className="font-extrabold text-[15px] text-[var(--text-primary)] group-hover:text-accent transition-colors">{supplierName}</div>
                        <div className={`text-[11px] text-[--text-muted] font-bold flex items-center gap-1.5 mt-1 opacity-70 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <Calendar size={11} className="text-accent/60" />
                            {fmtDate(date)}
                        </div>
                    </div>
                </div>
                <div className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-[var(--surface-2)] text-accent border border-[var(--glass-border)] shadow-inner uppercase tracking-widest">
                    #INV-{String(purchase.id).slice(-4)}
                </div>
            </div>

            {purchase.notes && (
                <div className="relative z-10 mb-8 p-4 bg-[var(--surface-2)] rounded-2xl border border-[var(--glass-border)] shadow-inner">
                    <p className="text-xs font-bold text-[--text-muted] line-clamp-2 leading-relaxed italic opacity-80">
                        "{purchase.notes}"
                    </p>
                </div>
            )}

            {/* Detailed Items if present */}
            {purchase.items?.length > 0 && (
                <div className="relative z-10 mb-8 space-y-2">
                    {purchase.items.map((item, idx) => (
                        <div key={idx} className={`flex justify-between items-center text-[10px] font-bold p-2 bg-accent/5 rounded-xl border border-accent/5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="text-accent">{item.product?.name || item.name}</span>
                            <span>{item.qty} × {fmtNumber(item.price || 0)}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className={`mt-auto relative z-10 pt-5 border-t border-[var(--glass-border)] border-dashed flex justify-between items-end ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="text-[10px] font-bold text-[--text-muted] uppercase tracking-widest mb-1.5 opacity-60">{isRTL ? 'قيمة التوريد' : 'Montant total'}</div>
                    <div className={`text-3xl font-black text-accent tracking-tighter ${isRTL ? '' : 'direction-ltr flex-row-reverse flex justify-end gap-2'}`}>
                        {fmtNumber(purchase.totalAmount || 0)}
                        <span className={`text-xs font-bold text-[--text-muted] ${isRTL ? 'mr-2' : 'ml-2'} uppercase tracking-tighter`}>MRU</span>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shadow-sm group-hover:bg-accent group-hover:text-white transition-all scale-90 group-hover:scale-100">
                    <ShoppingBag size={18} strokeWidth={2.5} />
                </div>
            </div>
        </div>
    );
}

function KpiCard({ icon, title, value, sub, gradient, border, isRTL }) {
    return (
        <div className={`card-premium p-7 rounded-[2.5rem] relative overflow-hidden bg-gradient-to-br ${gradient} border border-[var(--glass-border)] ${border} shadow-sm hover:shadow-md transition-all group/kpi ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className={`flex items-start justify-between mb-5 relative z-10 ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className="p-3.5 bg-white/50 rounded-2xl shadow-sm border border-white/80 group-hover:scale-110 transition-transform">{icon}</div>
                <div className="text-[10px] font-black text-[--text-muted] uppercase tracking-widest opacity-60">{sub}</div>
            </div>
            <div className="relative z-10">
                <div className="text-[11px] font-black text-[--text-muted] uppercase tracking-[0.15em] mb-2">{title}</div>
                <div className={`text-3xl font-black text-[var(--text-primary)] group-hover:translate-x-1 transition-transform inline-block origin-right ${isRTL ? '' : 'direction-ltr'}`}>{value}</div>
            </div>
        </div>
    );
}

function StatPill({ icon, label, color, isRTL }) {
    const colors = {
        accent: 'bg-accent/10 text-accent border-accent/10',
        primary: 'bg-primary/10 text-primary border-primary/10',
        warning: 'bg-warning/10 text-warning border-warning/10',
        purchases: 'bg-purchases/10 text-purchases border-purchases/10',
    };
    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider shadow-sm ${colors[color]} ${isRTL ? '' : 'flex-row-reverse'}`}>
            {icon}
            {label}
        </div>
    );
}

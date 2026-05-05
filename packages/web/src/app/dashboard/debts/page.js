'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    Users, Truck, DollarSign, Calendar, Search,
    ArrowUpRight, ArrowDownRight, CreditCard,
    History, Filter, ChevronLeft, Save, X, Activity,
    TrendingUp, TrendingDown, Wallet
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import RaidDialog from '@/components/RaidDialog';
import RaidModal from '@/components/RaidModal';

import { db } from '@/lib/db';

export default function DebtsPage() {
    const { t, isRTL, fmtNumber } = useLanguage();
    const [debtors, setDebtors] = useState([]);
    const [creditors, setCreditors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('debtors'); // 'debtors' or 'creditors'
    const [search, setSearch] = useState('');
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [payAmount, setPayAmount] = useState('');

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
            const [debtorsRes, creditorsRes] = await Promise.all([
                api.get('/debts/debtors'),
                api.get('/debts/creditors')
            ]);
            setDebtors(Array.isArray(debtorsRes.data) ? debtorsRes.data : []);
            setCreditors(Array.isArray(creditorsRes.data) ? creditorsRes.data : []);
        } catch (err) {
            console.error('Error fetching debts:', err);
            // Offline fallback: load from IndexedDB
            try {
                const localDebtors = await db.debts_debtors.toArray();
                const localCreditors = await db.debts_creditors.toArray();
                setDebtors(localDebtors);
                setCreditors(localCreditors);
            } catch { /* silent */ }
        } finally {
            setLoading(false);
        }
    };

    const handlePay = async (e) => {
        e.preventDefault();
        if (!selectedEntity || !payAmount) return;

        try {
            await api.post(`/debts/${selectedEntity.id}/pay`, { amount: parseFloat(payAmount) });
            fetchData();
            closePayModal();
            triggerDialog(
                t('operation_success'), 
                t('payment_recorded_success'), 
                'success'
            );
        } catch (err) {
            triggerDialog(
                t('operation_failed'), 
                t('payment_recorded_failed'), 
                'danger'
            );
        }
    };

    const openPayModal = (entity) => {
        setSelectedEntity(entity);
        setPayAmount('');
        setIsPayModalOpen(true);
    };

    const closePayModal = () => {
        setIsPayModalOpen(false);
        setSelectedEntity(null);
        setPayAmount('');
    };

    const currentData = activeTab === 'debtors' ? debtors : creditors;
    const filtered = currentData.filter(item =>
        (item.customerName || item.supplierName || '').toLowerCase().includes(search.toLowerCase())
    );

    const totalDebtors = debtors.reduce((sum, d) => sum + d.remaining, 0);
    const totalCreditors = creditors.reduce((sum, c) => sum + c.remaining, 0);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 opacity-60">
            <div className="w-14 h-14 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-lg font-black animate-pulse text-[var(--text-primary)]">{t('syncing')}</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-up pb-10 bg-[var(--background)]">
            {/* ─── HEADER ─── */}
            <div className="card-premium p-8 lg:p-10 rounded-[2.5rem] bg-[var(--surface-1)] border-none shadow-[var(--shadow-card)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-primary/5 pointer-events-none" />
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] pointer-events-none" />

                <div className={`relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 ${isRTL ? '' : 'flex-row-reverse'}`}>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <div className={`flex items-center gap-3 mb-2 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/5 shadow-sm">
                                <Wallet size={24} className="text-accent" />
                            </div>
                            <div>
                                <h1 className="text-xl lg:text-2xl font-black text-[var(--text-primary)]">{t('debts')}</h1>
                            </div>
                        </div>
                        <p className="text-[--text-muted] text-xs font-bold opacity-80 mt-1 tracking-tight">{t('debts_summary')}</p>
                    </div>

                        <div className={`flex flex-wrap gap-2.5 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/10 text-secondary border border-secondary/10 text-[10px] font-black uppercase tracking-wider shadow-sm">
                                <TrendingUp size={14} />
                                {t('due_to_us')}: {fmtNumber(totalDebtors)} MRU
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-error/10 text-error border border-error/10 text-[10px] font-black uppercase tracking-wider shadow-sm">
                                <TrendingDown size={14} />
                                {t('due_by_us')}: {fmtNumber(totalCreditors)} MRU
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── TABS & SEARCH ─── */}
            <div className={`flex flex-col lg:flex-row justify-between items-center gap-6 ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className={`flex p-1 bg-[var(--surface-1)] rounded-xl border border-[var(--glass-border)] shadow-sm w-full lg:w-auto ${isRTL ? '' : 'flex-row-reverse'}`}>
                    <button
                        onClick={() => setActiveTab('debtors')}
                        className={`flex-1 lg:flex-none px-6 py-2 rounded-lg font-bold text-[13px] transition-all flex items-center justify-center gap-2 ${activeTab === 'debtors' ? 'bg-primary text-white shadow-md' : 'text-[--text-muted] hover:bg-white'} ${isRTL ? '' : 'flex-row-reverse'}`}
                    >
                        <Users size={16} />
                        {t('customers')} ({debtors.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('creditors')}
                        className={`flex-1 lg:flex-none px-6 py-2 rounded-lg font-bold text-[13px] transition-all flex items-center justify-center gap-2 ${activeTab === 'creditors' ? 'bg-primary text-white shadow-md' : 'text-[--text-muted] hover:bg-white'} ${isRTL ? '' : 'flex-row-reverse'}`}
                    >
                        <Truck size={16} />
                        {t('suppliers')} ({creditors.length})
                    </button>
                </div>

                <div className="relative w-full lg:w-80 group">
                    <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-[--text-muted] group-focus-within:text-primary transition-colors`} size={18} />
                    <input
                        type="text"
                        placeholder={t('search')}
                        className={`w-full h-11 bg-[var(--surface-1)] border border-[var(--glass-border)] rounded-xl ${isRTL ? 'pr-12 pl-6 text-right' : 'pl-12 pr-6 text-left'} text-[13px] font-bold focus:outline-none focus:border-primary/40 focus:bg-white transition-all shadow-sm`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* ─── DATA GRID ─── */}
            <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 ${isRTL ? '' : 'direction-ltr'}`}>
                {filtered.length === 0 ? (
                    <div className="col-span-full py-24 flex flex-col items-center gap-6 opacity-30 select-none">
                        <div className="p-10 bg-[var(--surface-1)] rounded-[3rem] border border-[var(--glass-border)] shadow-inner">
                            <Activity size={80} strokeWidth={1} />
                        </div>
                        <p className="font-black text-xl">{t('no_debt_records')}</p>
                    </div>
                ) : filtered.map((item, i) => (
                    <DebtCard
                        key={item.id}
                        item={item}
                        type={activeTab}
                        index={i}
                        onPay={() => openPayModal(item)}
                        isRTL={isRTL}
                    />
                ))}
            </div>

            {/* ─── PAYMENT MODAL ─── */}
            <RaidModal
                isOpen={isPayModalOpen}
                onClose={closePayModal}
                title={t('register_payment')}
            >
                <div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center shadow-inner mb-6 ${isRTL ? '' : 'flex-row-reverse'}">
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-60">{t('name')}</div>
                            <div className="text-lg font-black text-slate-900">{selectedEntity?.customerName || selectedEntity?.supplierName}</div>
                        </div>
                        <div className={isRTL ? 'text-left' : 'text-right'}>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-60">{t('solde_restant')}</div>
                            <div className="text-lg font-black text-primary">{fmtNumber(selectedEntity?.remaining || 0)} MRU</div>
                        </div>
                    </div>

                    <form onSubmit={handlePay} className="space-y-6">
                        <div className="space-y-2.5">
                            <label className={`text-[11px] font-black uppercase text-slate-400 tracking-widest mr-1 opacity-70 flex items-center gap-2 ${isRTL ? 'justify-end' : 'justify-start flex-row-reverse'}`}>
                                <DollarSign size={12} /> {t('payment_amount')}
                            </label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    autoFocus
                                    placeholder="0.00"
                                    className={`w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl text-2xl font-black text-primary focus:outline-none focus:border-primary/40 shadow-inner ${isRTL ? 'pr-4 pl-16 text-right' : 'pl-4 pr-16 text-left'}`}
                                    value={payAmount}
                                    onChange={e => setPayAmount(e.target.value)}
                                />
                                <div className={`absolute top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase ${isRTL ? 'left-4' : 'right-4'}`}>MRU</div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`w-full h-16 rounded-2xl font-black text-lg flex items-center justify-center gap-4 text-white shadow-xl transition-all active:scale-95 group/save relative overflow-hidden mt-4 ${isRTL ? '' : 'flex-row-reverse'}`}
                            style={{
                                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                boxShadow: '0 10px 30px rgba(var(--primary-rgb), 0.2)'
                            }}
                        >
                            <Save size={24} className="group-hover/save:scale-110 transition-transform" />
                            {t('confirm_save')}
                        </button>
                    </form>
                </div>
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

function DebtCard({ item, type, index, onPay, isRTL }) {
    const { t, fmtNumber } = useLanguage();
    const name = type === 'debtors' ? item.customerName : item.supplierName;
    const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('');

    return (
        <div
            className={`card-premium group p-6 rounded-[2.5rem] bg-[var(--surface-1)] border border-[var(--glass-border)] flex flex-col hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative overflow-hidden ${isRTL ? '' : 'text-left'}`}
            style={{ animationDelay: `${index * 0.05}s` }}
        >
            <div className={`absolute top-0 ${isRTL ? 'right-0 text-right' : 'left-0 text-left'} w-1.5 h-full rounded-full transition-all duration-500 ${type === 'debtors' ? 'bg-secondary/40' : 'bg-error/40'}`} />

            <div className={`relative z-10 flex justify-between items-start mb-6 ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className={`flex items-center gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg border shadow-sm group-hover:scale-110 transition-transform ${type === 'debtors' ? 'bg-secondary/10 text-secondary border-secondary/10' : 'bg-error/10 text-error border-error/10'}`}>
                        {initials}
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <div className="font-extrabold text-[15px] text-[var(--text-primary)] group-hover:text-primary transition-colors">{name}</div>
                        <div className={`text-[11px] text-[--text-muted] font-bold flex items-center gap-1.5 mt-1 opacity-70 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <Calendar size={11} className="text-primary/60" />
                            {item.date}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`mt-auto relative z-10 pt-5 border-t border-[var(--glass-border)] border-dashed flex justify-between items-end ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="text-[10px] font-bold text-[--text-muted] uppercase tracking-widest mb-1.5 opacity-60">{t('solde_restant')}</div>
                    <div className={`text-3xl font-black tracking-tighter ${type === 'debtors' ? 'text-secondary' : 'text-error'}`}>
                        {fmtNumber(item.remaining)}
                        <span className={`text-xs font-bold text-[--text-muted] ${isRTL ? 'mr-2' : 'ml-2'} uppercase tracking-tighter`}>MRU</span>
                    </div>
                </div>

                <button
                    onClick={onPay}
                    className={`p-3.5 rounded-xl border transition-all hover:shadow-md active:scale-90 ${type === 'debtors' ? 'bg-secondary/10 text-secondary border-secondary/10 hover:bg-secondary hover:text-white' : 'bg-error/10 text-error border-error/10 hover:bg-error hover:text-white'}`}
                >
                    <CreditCard size={20} />
                </button>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    History, Search, Filter, Calendar,
    ArrowUpRight, ArrowDownRight, Package,
    Briefcase, RotateCcw, Receipt, Download,
    ChevronDown, Printer, FileText, Activity,
    TrendingUp, TrendingDown, Clock, Archive
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function ArchivePage() {
    const { t, isRTL, fmtNumber, fmtDate } = useLanguage();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all'); // all, SALE, PURCHASE, EXPENSE, RETURN

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [salesRes, expensesRes] = await Promise.all([
                api.get('/sales'),
                api.get('/expenses')
            ]);

            const sales = Array.isArray(salesRes.data) ? salesRes.data : [];
            const rawExpenses = Array.isArray(expensesRes.data) ? expensesRes.data : [];
            const expenses = rawExpenses.map(e => ({
                ...e,
                type: 'EXPENSE',
                finalAmount: e.amount,
                createdAt: e.date,
                invoiceNo: `EXP-${e.id.slice(0, 4)}`,
                notes: e.description
            }));

            setTransactions([...sales, ...expenses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        } catch (err) {
            console.error('Error fetching archive:', err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = transactions.filter(t => {
        const matchesSearch = !search ||
            (t.invoiceNo && t.invoiceNo.toLowerCase().includes(search.toLowerCase())) ||
            (t.customer && t.customer.name.toLowerCase().includes(search.toLowerCase())) ||
            (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()));
        const matchesType = typeFilter === 'all' || t.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const getStats = () => {
        const sales = transactions.filter(t => t.type === 'SALE').reduce((sum, t) => sum + t.finalAmount, 0);
        const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.finalAmount, 0);
        const returns = transactions.filter(t => t.type === 'RETURN').reduce((sum, t) => sum + t.finalAmount, 0);
        return { sales, expenses, returns };
    };

    const stats = getStats();

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
                        <div className={`flex items-center gap-4 mb-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className="p-3.5 bg-primary/10 rounded-2xl border border-primary/5 shadow-sm">
                                <Archive size={32} className="text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl lg:text-3xl font-black text-[var(--text-primary)]">{t('archive')}</h1>
                                <p className="text-[--text-muted] text-sm mt-1.5 font-bold opacity-80">{t('archive_summary')}</p>
                            </div>
                        </div>

                        <div className={`flex flex-wrap gap-2.5 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className="px-4 py-2 rounded-xl bg-white/50 border border-white text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                                <FileText size={14} className="text-primary" />
                                {transactions.length} {t('recorded_transactions')}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button className={`btn-ghost px-6 py-3.5 rounded-2xl font-bold flex items-center gap-3 bg-[var(--surface-2)] border border-[var(--glass-border)] hover:bg-white transition-all text-sm ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <Download size={18} className="text-primary" />
                            {t('export_excel')}
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── MINI STATS ─── */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${isRTL ? '' : 'direction-ltr'}`}>
                <MiniStat icon={<TrendingUp size={20} />} label={t('total_sales')} value={stats.sales} color="secondary" isRTL={isRTL} />
                <MiniStat icon={<TrendingDown size={20} />} label={t('total_expenses')} value={stats.expenses} color="error" isRTL={isRTL} />
                <MiniStat icon={<Clock size={20} />} label={t('total_returns')} value={stats.returns} color="warning" isRTL={isRTL} />
            </div>

            {/* ─── FILTERS ─── */}
            <div className={`flex flex-col lg:flex-row gap-5 ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className="relative flex-1 group">
                    <Search className={`absolute ${isRTL ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-[--text-muted] group-focus-within:text-primary transition-colors`} size={20} />
                    <input
                        type="text"
                        placeholder={t('search_placeholder')}
                        className={`w-full h-14 bg-[var(--surface-1)] border border-[var(--glass-border)] rounded-2xl ${isRTL ? 'pr-14 pl-6 text-right' : 'pl-14 pr-6 text-left'} text-sm font-extrabold focus:outline-none focus:border-primary/40 focus:bg-white transition-all shadow-sm`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="relative group lg:w-64">
                    <Filter className={`absolute ${isRTL ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-[--text-muted] pointer-events-none group-focus-within:text-primary`} size={20} />
                    <select
                        className={`w-full h-14 bg-[var(--surface-1)] border border-[var(--glass-border)] rounded-2xl ${isRTL ? 'pr-14 pl-12 text-right' : 'pl-14 pr-12 text-left'} text-sm font-extrabold focus:outline-none focus:border-primary/40 focus:bg-white transition-all appearance-none cursor-pointer shadow-sm`}
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="all">{t('all_transaction_types')}</option>
                        <option value="SALE">{t('sales')}</option>
                        <option value="PURCHASE">{t('purchases')}</option>
                        <option value="EXPENSE">{t('expenses')}</option>
                        <option value="RETURN">{t('returns')}</option>
                    </select>
                    <ChevronDown className={`absolute ${isRTL ? 'left-5' : 'right-5'} top-1/2 -translate-y-1/2 text-[--text-muted] pointer-events-none opacity-40`} size={18} />
                </div>
            </div>

            {/* ─── TABLE ─── */}
            <div className="card-premium rounded-[2.5rem] bg-[var(--surface-1)] border border-[var(--glass-border)] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className={`w-full border-collapse ${isRTL ? 'text-right' : 'text-left'}`}>
                        <thead>
                            <tr className="bg-[var(--surface-2)]/50 border-b border-[var(--glass-border)]">
                                <th className="px-8 py-5 text-[11px] font-black uppercase text-[--text-muted] tracking-widest">{t('transaction')}</th>
                                <th className="px-8 py-5 text-[11px] font-black uppercase text-[--text-muted] tracking-widest">{t('date')}</th>
                                <th className="px-8 py-5 text-[11px] font-black uppercase text-[--text-muted] tracking-widest">{t('client_details')}</th>
                                <th className={`px-8 py-5 text-[11px] font-black uppercase text-[--text-muted] tracking-widest ${isRTL ? '' : 'text-right'}`}>{t('amount')}</th>
                                <th className="px-8 py-5 text-[11px] font-black uppercase text-[--text-muted] tracking-widest">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--glass-border)]">
                             {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center opacity-40 font-bold text-lg">{t('no_transactions_found')}</td>
                                </tr>
                            ) : filtered.map((t_item, i) => (
                                <tr key={t_item.id} className="hover:bg-white/40 transition-colors group/row border-b border-[var(--glass-border)] last:border-0">
                                    <td className="px-8 py-5">
                                        <div className={`flex items-center gap-3 ${isRTL ? '' : 'flex-row-reverse'}`}>
                                            <div className={`p-2 rounded-lg ${getTypeStyle(t_item.type)}`}>
                                                {getTypeIcon(t_item.type)}
                                            </div>
                                            <span className="font-black text-sm text-[var(--text-primary)]">#{t_item.invoiceNo}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-xs font-bold text-[--text-muted]">
                                        {fmtDate(t_item.createdAt)}
                                    </td>
                                     <td className="px-8 py-5">
                                        <div className="text-sm font-extrabold text-[var(--text-primary)]">{t_item.customer?.name || t_item.notes || t('general_statement')}</div>
                                        <div className="text-[10px] text-[--text-muted] mt-0.5 font-bold uppercase tracking-tight opacity-60">
                                            {t_item.type === 'SALE' ? t('sale_invoice') : t_item.type === 'PURCHASE' ? t('purchase_invoice') : t_item.type === 'EXPENSE' ? t('operational_expense') : t('sale_return')}
                                        </div>
                                        
                                        {/* Itemized Details */}
                                        {t_item.items?.length > 0 && (
                                            <div className="mt-3 space-y-1.5 print:block">
                                                {t_item.items.map((item, idx) => (
                                                    <div key={idx} className={`flex justify-between items-center text-[10px] bg-white/40 p-1.5 rounded-lg border border-black/5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                        <span className="font-black opacity-80">{item.product?.name || item.name}</span>
                                                        <div className={`flex gap-3 px-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                            <span className="opacity-60">{item.qty} × {fmtNumber(item.price || 0)}</span>
                                                            <span className="font-black text-primary">{fmtNumber(item.qty * (item.price || 0))}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className={`px-8 py-5 ${isRTL ? '' : 'text-right'}`}>
                                        <div className={`text-lg font-black ${t_item.type === 'SALE' ? 'text-secondary' : t_item.type === 'EXPENSE' ? 'text-error' : 'text-primary'}`}>
                                            {fmtNumber(t_item.finalAmount)} <span className={`text-[10px] text-[--text-muted] opacity-60 ${isRTL ? 'mr-1' : 'ml-1'}`}>MRU</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <button 
                                            onClick={() => window.print()}
                                            className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--glass-border)] text-[--text-muted] hover:text-primary hover:bg-white hover:shadow-sm transition-all group-hover/row:scale-110">
                                            <Printer size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function MiniStat({ icon, label, value, color, isRTL }) {
    const { fmtNumber } = useLanguage();
    const colors = {
        secondary: 'text-secondary border-secondary/20 bg-secondary/5',
        error: 'text-error border-error/20 bg-error/5',
        warning: 'text-warning border-warning/20 bg-warning/5',
    };
    return (
        <div className={`card-premium p-6 rounded-3xl border ${colors[color]} flex items-center justify-between shadow-sm ${isRTL ? '' : 'flex-row-reverse'}`}>
            <div className={`flex items-center gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className="p-3 bg-white/50 rounded-2xl shadow-sm">{icon}</div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</div>
                    <div className="text-2xl font-black">{fmtNumber(value)} <span className={`text-xs opacity-50 ${isRTL ? '' : 'ml-1'}`}>MRU</span></div>
                </div>
            </div>
        </div>
    );
}

const getTypeIcon = (type) => {
    switch (type) {
        case 'SALE': return <TrendingUp size={16} />;
        case 'PURCHASE': return <Package size={16} />;
        case 'EXPENSE': return <TrendingDown size={16} />;
        case 'RETURN': return <RotateCcw size={16} />;
        default: return <Receipt size={16} />;
    }
};

const getTypeStyle = (type) => {
    switch (type) {
        case 'SALE': return 'bg-secondary/10 text-secondary';
        case 'PURCHASE': return 'bg-primary/10 text-primary';
        case 'EXPENSE': return 'bg-error/10 text-error';
        case 'RETURN': return 'bg-warning/10 text-warning';
        default: return 'bg-slate-100 text-slate-500';
    }
};

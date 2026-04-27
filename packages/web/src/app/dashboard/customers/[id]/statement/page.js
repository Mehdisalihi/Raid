'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
    Phone, Mail, MapPin, CreditCard,
    Calendar, Search, FileSpreadsheet,
    Printer, RefreshCw, AlertCircle,
    FileText, Wallet, Receipt, CheckCircle,
    X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
    TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus,
    Info, ExternalLink, Download, Share2
} from 'lucide-react';
import dynamic from 'next/dynamic';

import SummaryBox from '@/components/SummaryBox';
import TxRow from '@/components/TxRow';

const StatementCharts = dynamic(() => import('@/components/StatementCharts'), { 
    ssr: false,
    loading: () => <div className="h-40 w-full animate-pulse bg-slate-100 rounded-[2rem]" />
});

const DebtBreakdownTable = dynamic(() => import('@/components/DebtBreakdownTable'), { 
    ssr: false,
    loading: () => <div className="h-20 w-full animate-pulse bg-slate-50 rounded-xl" />
});

// ─── TYPE LABELS ─────────────────────────────────────
const TYPE_MAP = {
    ar: { invoice: 'فاتورة مدين', payment: 'دفعة', return: 'مرتجع', debt: 'فاتورة دين' },
    fr: { invoice: 'Facture débit', payment: 'Paiement', return: 'Retour', debt: 'Facture crédit' }
};

// ─── BUILD TRANSACTIONS FROM API DATA ────────────────
function buildTransactions(invoices = [], lang = 'ar') {
    // Filter: only show invoices that are marked as debt OR are not of type SALE (like payments/returns/debts)
    const filteredInvoices = invoices.filter(inv => {
        const type = (inv.type || '').toLowerCase();
        if (type === 'sale' && !inv.isDebt) return false;
        return true;
    });

    const isRTL = lang === 'ar';

    const rows = filteredInvoices.map((inv) => {
        const rawType = (inv.type || 'invoice').toLowerCase();
        const type = rawType === 'sale' ? 'invoice' : rawType === 'payment' ? 'payment' : rawType === 'return' ? 'return' : rawType;
        
        const total = parseFloat(inv.total || inv.grandTotal || inv.finalAmount || 0);
        
        // Build description with product names
        let description = inv.description || inv.notes || '';
        if (!description) {
            if (type === 'payment') description = isRTL ? 'دفع' : 'Paiement';
            else if (type === 'invoice') description = isRTL ? 'فاتورة مدين' : 'Facture débit';
            else if (type === 'return') description = isRTL ? 'مرتجع' : 'Retour';
            else if (type === 'debt') description = isRTL ? 'دين' : 'Dette';
            else description = '—';
        }

        // Append product names and quantities if available
        const items = inv.items || [];
        if (items.length > 0) {
            const itemStrings = items.map(it => {
                const name = it.product?.name || it.name || it.productName || '';
                const qty = it.qty || it.Quantity || 0;
                return name ? `${name} x ${qty}` : '';
            }).filter(n => n).join(', ');
            if (itemStrings) description += `\n(${itemStrings})`;
        }

        return {
            id: inv.id,
            invoiceId: inv.id,
            date: inv.createdAt,
            type,
            refNo: inv.invoiceNo || inv.invoiceNumber || `${type.toUpperCase()}-${String(inv.id || '').slice(-6)}`,
            description,
            items,
            debit: type === 'invoice' || type === 'debt' ? total : 0,
            credit: type === 'payment' || type === 'return' ? total : 0,
        };
    });
    
    rows.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let bal = 0;
    return rows.map(r => { 
        // Precision fixing for money
        bal = Math.round((bal + (r.debit - r.credit)) * 100) / 100;
        return { ...r, balance: bal }; 
    });
}

const ROWS_PER_PAGE = 10;

// ─── PROFESSIONAL PRINT COMPONENTS ───────────────────

function CorporateHeader({ isRTL, printDate, customerId }) {
    const { lang } = useLanguage();
    const [storeInfo, setStoreInfo] = useState({ name: '', logo: null, slogan: '', address: '', phone: '', email: '', taxId: '' });

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            setStoreInfo({
                name: user.storeName || (isRTL ? 'اسم مؤسستك' : 'Your Institution Name'),
                logo: user.storeLogo || null,
                slogan: user.storeSlogan || (isRTL ? 'لإدارة أموالك بذكاء' : 'Smart Financial Management'),
                address: user.storeAddress || '',
                phone: user.storePhone || '',
                email: user.storeEmail || '',
                taxId: user.storeTaxId || ''
            });
        }
    }, [isRTL]);

    return (
        <div className="hidden print:block mb-4 border-b-2 border-slate-900 pb-4">
            {/* Top row: Very small app branding */}
            <div className={`flex items-center gap-1.5 mb-2 text-[8px] font-bold text-slate-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <img src="/Raed.png" alt="App Logo" className="w-3.5 h-3.5 grayscale opacity-40" />
                <span>{isRTL ? 'رائد المحاسبي' : 'Raid Accounting'}</span>
            </div>

            <div className="flex justify-between items-start">
                {/* Left: Institution Info & Logo */}
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden p-1">
                        {storeInfo.logo ? (
                            <img src={storeInfo.logo} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-[9px] text-slate-400 text-center font-bold">{isRTL ? 'شعار المؤسسة' : 'Institution Logo'}</span>
                        )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            {storeInfo.name}
                        </h1>
                        <div className="flex flex-col text-[9px] font-bold text-slate-600 uppercase tracking-tight">
                            {storeInfo.address && <span>{isRTL ? 'العنوان: ' : 'Address: '}{storeInfo.address}</span>}
                            {storeInfo.phone && <span>{isRTL ? 'الهاتف: ' : 'Tel: '}{storeInfo.phone}</span>}
                            {storeInfo.email && <span>{isRTL ? 'الإيميل: ' : 'Email: '}{storeInfo.email}</span>}
                            {storeInfo.taxId && <span className="mt-1 text-slate-900">{isRTL ? 'الرقم الضريبي: ' : 'Tax ID: '}{storeInfo.taxId}</span>}
                        </div>
                    </div>
                </div>

                {/* Right: Statement Title & Details Table */}
                <div className="flex flex-col items-end gap-3">
                    <h2 className="text-3xl font-black text-emerald-700 uppercase tracking-widest leading-none">
                        {isRTL ? 'كشف حساب' : (lang === 'fr' ? 'RELEVÉ DE COMPTE' : 'Statement')}
                    </h2>
                    <table className="text-[10px] font-bold text-slate-800 border-collapse">
                        <tbody>
                            <tr>
                                <td className="pr-4 py-0.5">{isRTL ? 'التاريخ:' : (lang === 'fr' ? 'Date:' : 'Date:')}</td>
                                <td className="border border-slate-300 px-2 py-0.5 bg-white min-w-[100px]">{printDate}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function PrintFooter({ isRTL, finalBalance, fmt }) {
    const { lang } = useLanguage();
    return (
        <div className="hidden print:flex flex-col items-center mt-12 text-[11px] text-slate-800 break-inside-avoid">
            <p className="font-bold mb-3">
                {isRTL 
                    ? `رصيد حسابك هو ${fmt(finalBalance)} MRU. يرجى تسديد المبلغ المتبقي في أقرب وقت.`
                    : (lang === 'fr' 
                        ? `Le solde de votre compte est de ${fmt(finalBalance)} MRU. Veuillez régler le solde restant dès que possible.`
                        : `Your account balance is ${fmt(finalBalance)} MRU. Please make your payment to cover the balance by the due date.`)}
            </p>
            <h4 className="text-base font-black mb-4">
                {isRTL ? 'شكراً لتعاملكم معنا!' : (lang === 'fr' ? 'Merci de votre confiance !' : 'Thank you for your business!')}
            </h4>
            
            <div className="w-full border-t border-slate-300 pt-3 text-center space-y-1 text-[10px]">
                <p>
                    {isRTL 
                        ? 'إذا كان لديك أي استفسارات بخصوص كشف الحساب، يرجى التواصل معنا'
                        : (lang === 'fr' 
                            ? 'Pour toute question concernant ce relevé, n\'hésitez pas à nous contacter'
                            : 'Should you have any enquiries concerning this statement, please contact us')}
                </p>
            </div>
        </div>
    );
}

function CustomerSection({ customer, fmtDate, isRTL, fmtNumber, summary }) {
    const { lang } = useLanguage();
    return (
        <div className="hidden print:grid grid-cols-2 gap-4 mb-2 break-inside-avoid">
            {/* Left: Bill To */}
            <div className="flex flex-col border border-slate-300">
                <div className="bg-emerald-700 text-white font-bold text-[12px] px-3 py-1 uppercase">
                    {isRTL ? 'فاتورة إلى:' : (lang === 'fr' ? 'FACTURER À :' : 'Bill To:')}
                </div>
                <div className="p-3 text-[11px] font-bold text-slate-800 leading-relaxed">
                    <p>{customer.name}</p>
                    {customer.phone && <p>{customer.phone}</p>}
                    {customer.address && <p>{customer.address}</p>}
                    {customer.email && <p>{customer.email}</p>}
                </div>
            </div>

            {/* Right: Account Summary */}
            <div className="flex flex-col border border-slate-300">
                <div className="bg-emerald-700 text-white font-bold text-[12px] px-3 py-1 uppercase">
                    {isRTL ? 'ملخص الحساب' : (lang === 'fr' ? 'RÉSUMÉ DU COMPTE' : 'Account Summary')}
                </div>
                <table className="w-full text-[11px] font-bold text-slate-800 border-collapse">
                    <tbody>
                        <tr className="border-b border-slate-100">
                            <td className="px-3 py-1.5">{isRTL ? 'المدفوعات (دائن)' : (lang === 'fr' ? 'Paiements (Crédit)' : 'Credits')}</td>
                            <td className="px-3 py-1.5 text-right">{fmtNumber(summary.totalCredit)}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-3 py-1.5">{isRTL ? 'الفواتير (مدين)' : (lang === 'fr' ? 'Factures (Débit)' : 'New Charges')}</td>
                            <td className="px-3 py-1.5 text-right">{fmtNumber(summary.totalDebit)}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-3 py-1.5 font-black text-slate-900">{isRTL ? 'إجمالي الرصيد المستحق' : (lang === 'fr' ? 'Solde total dû' : 'Total Balance Due')}</td>
                            <td className="px-3 py-1.5 text-right font-black text-slate-900">{fmtNumber(summary.finalBalance)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}


// ═══════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════
export default function CustomerStatementPage() {
    const { id } = useParams();
    const { t, isRTL, lang, fmtNumber, fmtDate } = useLanguage();

    const [customer, setCustomer] = useState(null);
    const [allTxns, setAllTxns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [period, setPeriod] = useState('month');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [searchTx, setSearchTx] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortField, setSortField] = useState('date');
    const [sortDir, setSortDir] = useState('asc');
    const [page, setPage] = useState(1);
    const [expandedId, setExpandedId] = useState(null);

    // ── FETCH ──
    useEffect(() => { if (id) fetchData(); }, [id]);

    const fetchData = async () => {
        setLoading(true); setError(null);
        try {
            const { data } = await api.get(`/customers/${id}/statement`);
            setCustomer(data);
            setAllTxns(buildTransactions(data.Invoices || [], lang));
        } catch {
            setError(isRTL ? 'حدث خطأ أثناء جلب البيانات' : 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    // ── DATE RANGE ──
    const { from: rangeFrom, to: rangeTo } = useMemo(() => {
        const now = new Date();
        const start = new Date();
        if (period === 'today') { start.setHours(0, 0, 0, 0); return { from: start, to: now }; }
        if (period === 'week') { start.setDate(now.getDate() - 7); return { from: start, to: now }; }
        if (period === 'month') { start.setDate(1); start.setHours(0, 0, 0, 0); return { from: start, to: now }; }
        if (period === 'year') { start.setMonth(0, 1); start.setHours(0, 0, 0, 0); return { from: start, to: now }; }
        if (period === 'custom') return { from: dateFrom ? new Date(dateFrom) : null, to: dateTo ? new Date(dateTo) : null };
        return { from: null, to: null };
    }, [period, dateFrom, dateTo]);

    // ── FILTERED + SORTED ──
    const filtered = useMemo(() => {
        let data = allTxns;
        if (rangeFrom) data = data.filter(tx => new Date(tx.date) >= rangeFrom);
        if (rangeTo) data = data.filter(tx => new Date(tx.date) <= rangeTo);
        if (typeFilter !== 'all') data = data.filter(tx => tx.type === typeFilter);
        if (searchTx) {
            const q = searchTx.toLowerCase();
            data = data.filter(tx => tx.refNo.toLowerCase().includes(q) || tx.description.toLowerCase().includes(q) || String(tx.debit).includes(q) || String(tx.credit).includes(q));
        }
        return [...data].sort((a, b) => {
            let va = sortField === 'date' ? new Date(a.date) : a[sortField];
            let vb = sortField === 'date' ? new Date(b.date) : b[sortField];
            return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
        });
    }, [allTxns, rangeFrom, rangeTo, typeFilter, searchTx, sortField, sortDir]);

    // ── SUMMARY ──
    const summary = useMemo(() => {
        let totalQty = 0;
        filtered.forEach(t => {
            if (t.type === 'invoice' && t.items) {
                t.items.forEach(it => { totalQty += (it.qty || 0); });
            }
        });

        const totalDebit = Math.round(filtered.reduce((s, t) => s + t.debit, 0) * 100) / 100;
        const totalCredit = Math.round(filtered.reduce((s, t) => s + t.credit, 0) * 100) / 100;
        const finalBalance = Math.round((totalDebit - totalCredit) * 100) / 100;

        // ─── FIFO DEBT BREAKDOWN LOGIC ───
        const outstandingItems = [];
        if (finalBalance !== 0) {
            let pool = finalBalance > 0 ? totalCredit : totalDebit; // Amount to "consume"
            const targets = filtered.filter(t => finalBalance > 0 ? t.debit > 0 : t.credit > 0);
            
            // Re-sort to ensure oldest first for FIFO
            const sortedTargets = [...targets].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            for (const item of sortedTargets) {
                const amount = finalBalance > 0 ? item.debit : item.credit;
                if (pool >= amount) {
                    pool -= amount; // Fully consumed by previous payments/credits
                } else {
                    const remaining = Math.round((amount - pool) * 100) / 100;
                    outstandingItems.push({
                        ...item,
                        originalAmount: amount,
                        amount: remaining
                    });
                    pool = 0; // Pool exhausted
                }
            }
        }
        
        return {
            totalDebit,
            totalCredit,
            invoicesCount: filtered.filter(t => t.type === 'invoice').length,
            paymentsTotal: Math.round(filtered.filter(t => t.type === 'payment').reduce((s, t) => s + t.credit, 0) * 100) / 100,
            finalBalance,
            totalQty,
            outstandingItems
        };
    }, [filtered]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
    const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    // ── FORMAT ──
    const fmt = fmtNumber;

    // ── EXPORT CSV ──
    const exportCSV = () => {
        const headers = isRTL ? ['التاريخ','النوع','المرجع','الوصف','المدين','الدائن','الرصيد'] : ['Date','Type','Réf.','Description','Débit','Crédit','Solde'];
        const rows = filtered.map(tx => [fmtDate(tx.date), TYPE_MAP[lang]?.[tx.type] || tx.type, tx.refNo, tx.description, tx.debit.toFixed(2), tx.credit.toFixed(2), tx.balance.toFixed(2)]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `statement_${customer?.name || id}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const PERIODS = [
        { id: 'today', label: isRTL ? 'اليوم' : "Aujourd'hui" },
        { id: 'week', label: isRTL ? 'هذا الأسبوع' : 'Cette semaine' },
        { id: 'month', label: isRTL ? 'هذا الشهر' : 'Ce mois' },
        { id: 'year', label: isRTL ? 'هذا العام' : 'Cette année' },
        { id: 'custom', label: isRTL ? 'مخصص' : 'Personnalisé' },
    ];
    const TYPE_OPTS = [
        { id: 'all', label: isRTL ? 'الكل' : 'Tous' },
        { id: 'invoice', label: isRTL ? 'فواتير' : 'Factures' },
        { id: 'payment', label: isRTL ? 'دفعات' : 'Paiements' },
        { id: 'return', label: isRTL ? 'مرتجعات' : 'Retours' },
        { id: 'debt', label: isRTL ? 'ديون' : 'Dettes' },
    ];
    const TH_COLS = [
        { field: 'date', label: isRTL ? 'التاريخ' : 'Date' },
        { field: 'description', label: isRTL ? 'الوصف' : 'Description' },
        { field: 'productCode', label: isRTL ? 'رمز المنتج' : 'Code' },
        { field: 'qty', label: isRTL ? 'الكمية' : 'Qté' },
        { field: 'debit', label: isRTL ? 'مدين' : 'Débit' },
        { field: 'credit', label: isRTL ? 'دائن' : 'Crédit' },
        { field: 'balance', label: isRTL ? 'الرصيد' : 'Solde' },
    ];

    // ── LOADING / ERROR ──
    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="font-bold text-[var(--text-muted)] animate-pulse">
                {isRTL ? 'جاري تحميل كشف الحساب...' : 'Chargement du relevé...'}
            </p>
        </div>
    );

    if (error || !customer) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                <AlertCircle size={40} className="text-red-400" />
            </div>
            <p className="font-bold text-red-500">{error || (isRTL ? 'العميل غير موجود' : 'Client introuvable')}</p>
            <Link href="/dashboard/customers" className="btn-primary flex items-center gap-2 px-6 py-3 rounded-2xl font-bold">
                {isRTL ? 'العودة للعملاء' : 'Retour aux clients'}
            </Link>
        </div>
    );

    const initials = customer.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const isDebtor = (customer.balance || 0) > 0;

    return (
        <div className="space-y-5 pb-16 print:space-y-2 print:pb-0" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: "'Cairo', sans-serif" }}>

            {/* ─── PROFESSIONAL PRINT HEADER ─── */}
            <CorporateHeader 
                isRTL={isRTL} 
                printDate={fmtDate(new Date())} 
                customerId={customer.id || id}
            />

            <CustomerSection 
                customer={customer} 
                fmtDate={fmtDate} 
                isRTL={isRTL} 
                fmtNumber={fmt} 
                summary={summary}
            />

            {/* ── TOP BAR (SCREEN ONLY) ── */}
            <div className={`flex items-center justify-between flex-wrap gap-3 print:hidden`}>
                <Link href="/dashboard/customers"
                    className={`flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-primary transition-colors`}>
                    <ChevronRight size={18} className={isRTL ? '' : 'rotate-180'} />
                    {isRTL ? 'قائمة العملاء' : 'Liste des clients'}
                </Link>
                <div className="flex items-center gap-2">
                    <Btn onClick={() => window.print()} icon={<Printer size={15} />} label={isRTL ? 'طباعة' : 'Imprimer'} />
                    <Btn onClick={exportCSV} icon={<FileSpreadsheet size={15} />} label={isRTL ? 'تصدير CSV' : 'Exporter CSV'} />
                    <Btn onClick={fetchData} icon={<RefreshCw size={15} />} label={isRTL ? 'تحديث' : 'Actualiser'} ghost />
                </div>
            </div>

            {/* ── CUSTOMER CARD (SCREEN ONLY) ── */}
            <div className="card-premium bg-[var(--surface-1)] border border-[var(--glass-border)] rounded-[2.5rem] p-7 relative overflow-hidden shadow-[var(--shadow-card)] print:hidden">
                <div className="absolute -top-20 -right-20 w-56 h-56 bg-primary/4 rounded-full blur-[70px] pointer-events-none print:hidden" />
                <div className={`relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center ${isRTL ? '' : 'md:flex-row-reverse'}`}>
                    <div className={`shrink-0 w-[72px] h-[72px] rounded-[1.25rem] flex items-center justify-center font-black text-2xl border-2 shadow-md ${isDebtor ? 'bg-red-50 border-red-200 text-red-600' : 'bg-secondary/10 border-secondary/20 text-secondary'}`}>
                        {initials}
                    </div>
                    <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-3 mb-1 ${isRTL ? '' : 'flex-row-reverse justify-end'}`}>
                            <h1 className="text-2xl font-black text-[var(--text-primary)]">{customer.name}</h1>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 ${isDebtor ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                {isDebtor ? <TrendingDown size={10} /> : <CheckCircle size={10} />}
                                {isDebtor ? (isRTL ? 'مدين' : 'Débiteur') : (isRTL ? 'منتظم' : 'Réglé')}
                            </span>
                        </div>
                        <div className={`flex flex-wrap gap-4 text-sm font-bold text-[var(--text-muted)] ${isRTL ? '' : 'flex-row-reverse justify-end'}`}>
                            {customer.phone && <span className="flex items-center gap-1.5"><Phone size={12} className="text-primary" />{customer.phone}</span>}
                            {customer.email && <span className="flex items-center gap-1.5"><Mail size={12} className="text-primary" />{customer.email}</span>}
                            {customer.address && <span className="flex items-center gap-1.5"><MapPin size={12} className="text-primary" />{customer.address}</span>}
                        </div>
                    </div>
                    <div className={`shrink-0 p-5 bg-[var(--surface-2)] rounded-[1.25rem] border border-[var(--glass-border)] min-w-[150px] ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">{isRTL ? 'الرصيد الحالي' : 'Solde Actuel'}</div>
                        <div className={`text-3xl font-black ${isDebtor ? 'text-red-600' : 'text-secondary'}`}>{fmt(customer.balance || 0)}</div>
                        <div className="text-[10px] font-bold text-[var(--text-muted)] mt-0.5">MRU</div>
                    </div>
                </div>
            </div>

            {/* ── PERIOD FILTER (SCREEN ONLY) ── */}
            <div className="card-premium bg-[var(--surface-1)] border border-[var(--glass-border)] rounded-[1.75rem] p-4 print:hidden">
                <div className={`flex flex-wrap items-center gap-3 ${isRTL ? '' : 'flex-row-reverse'}`}>
                    <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] shrink-0 ${isRTL ? '' : 'flex-row-reverse'}`}>
                        <Calendar size={13} />{isRTL ? 'الفترة' : 'Période'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {PERIODS.map(p => (
                            <button key={p.id} onClick={() => { setPeriod(p.id); setPage(1); }}
                                className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all ${period === p.id ? 'bg-primary text-white shadow-md' : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-primary/5 border border-[var(--glass-border)]'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    {period === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                                className="h-9 px-3 bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl text-[11px] font-bold focus:outline-none focus:border-primary/50 text-[var(--text-primary)]" />
                            <Minus size={12} className="text-[var(--text-muted)]" />
                            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                                className="h-9 px-3 bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl text-[11px] font-bold focus:outline-none focus:border-primary/50 text-[var(--text-primary)]" />
                        </div>
                    )}
                </div>
            </div>



            {/* ── TABLE CONTROLS (SCREEN ONLY) ── */}
            <div className={`flex flex-wrap items-center gap-3 print:hidden ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className="relative flex-1 min-w-[180px]">
                    <Search className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-[var(--text-muted)]`} size={15} />
                    <input type="text" value={searchTx} onChange={e => { setSearchTx(e.target.value); setPage(1); }}
                        placeholder={isRTL ? 'بحث في العمليات...' : 'Rechercher...'}
                        className={`w-full bg-[var(--surface-1)] border border-[var(--glass-border)] rounded-xl h-10 ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'} text-sm font-bold focus:outline-none focus:border-primary/40 transition-all text-[var(--text-primary)]`} />
                    {searchTx && <button onClick={() => setSearchTx('')} className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-red-500`}><X size={13} /></button>}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    {TYPE_OPTS.map(opt => (
                        <button key={opt.id} onClick={() => { setTypeFilter(opt.id); setPage(1); }}
                            className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all ${typeFilter === opt.id ? 'bg-primary text-white shadow-sm' : 'bg-[var(--surface-1)] border border-[var(--glass-border)] text-[var(--text-muted)] hover:border-primary/30'}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
                <span className="text-[11px] font-bold text-[var(--text-muted)] opacity-70">{filtered.length} {isRTL ? 'عملية' : 'op.'}</span>
            </div>

            {/* ─── TRANSACTION TABLE (SCREEN ONLY) ─── */}
            <div className="card-premium bg-[var(--surface-1)] border border-[var(--glass-border)] rounded-[2rem] overflow-hidden shadow-sm print:hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px]">
                        <thead>
                            <tr className="bg-[var(--surface-2)] border-b border-[var(--glass-border)]">
                                <th className={`px-5 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'التاريخ' : 'Date'}</th>
                                <th className={`px-5 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'رقم الفاتورة' : 'N° Facture'}</th>
                                <th className={`px-5 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الوصف / البيان' : 'Description'}</th>
                                <th className={`px-5 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right`}>{isRTL ? 'مدين' : 'Débit'}</th>
                                <th className={`px-5 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right`}>{isRTL ? 'دائن' : 'Crédit'}</th>
                                <th className={`px-5 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right`}>{isRTL ? 'الرصيد' : 'Solde'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((tx, idx) => (
                                <TxRow 
                                    key={`screen-${tx.id || idx}`} 
                                    tx={tx} 
                                    isRTL={isRTL} 
                                    lang={lang} 
                                    fmt={fmt} 
                                    fmtDate={fmtDate} 
                                    isExpanded={expandedId === tx.id}
                                    onToggle={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className={`flex items-center justify-between px-5 py-3.5 border-t border-[var(--glass-border)] ${isRTL ? '' : 'flex-row-reverse'}`}>
                        <span className="text-[11px] font-bold text-[var(--text-muted)]">
                            {isRTL ? `الصفحة ${page} من ${totalPages}` : `Page ${page} / ${totalPages}`}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <PgBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} dir={isRTL ? 'right' : 'left'} />
                            <PgBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} dir={isRTL ? 'left' : 'right'} />
                        </div>
                    </div>
                )}
            </div>

            {/* ─── TRANSACTION TABLE (PRINT ONLY) ─── */}
            <div className="hidden print:block mb-2">
                <table className="w-full border-collapse border border-slate-300">
                    <thead>
                        <tr className="bg-emerald-700 print-exact">
                            <th className={`border-x border-white py-1.5 px-3 text-[11px] font-bold text-white w-[12%] ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'التاريخ' : 'Date'}</th>
                            <th className={`border-x border-white py-1.5 px-3 text-[11px] font-bold text-white w-[15%] ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'رقم الفاتورة' : 'N° Facture'}</th>
                            <th className={`border-x border-white py-1.5 px-3 text-[11px] font-bold text-white w-[37%] ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'البيان' : 'Description'}</th>
                            <th className={`border-x border-white py-1.5 px-3 text-[11px] font-bold text-white w-[12%] text-right`}>{isRTL ? 'مدين' : 'Débit'}</th>
                            <th className={`border-x border-white py-1.5 px-3 text-[11px] font-bold text-white w-[12%] text-right`}>{isRTL ? 'دائن' : 'Crédit'}</th>
                            <th className={`border-x border-white py-1.5 px-3 text-[11px] font-bold text-white w-[12%] text-right`}>{isRTL ? 'الرصيد' : 'Solde'}</th>
                        </tr>
                    </thead>
                    <tbody className="print-zebra">
                        {filtered.map((tx, idx) => (
                            <TxRow 
                                key={`print-${tx.id || idx}`} 
                                tx={tx} 
                                isRTL={isRTL} 
                                lang={lang} 
                                fmt={fmt} 
                                fmtDate={fmtDate} 
                                className={`print-exact ${idx % 2 === 0 ? 'print:bg-slate-50' : 'print:bg-white'}`}
                            />
                        ))}
                    </tbody>
                </table>
                
                {/* ─── PRINT ONLY: FULL WIDTH TOTALS BAR ─── */}
                <div className="hidden print:flex items-center justify-between bg-emerald-700 text-white font-bold text-[12px] print-exact mt-0 border border-slate-300 border-t-0 break-inside-avoid">
                    <div className="flex-1 px-3 py-1.5 text-right">
                        {isRTL ? 'إجمالي الرصيد الحالي' : 'Solde actuel du compte'} MRU
                    </div>
                    <div className="px-3 py-1.5 font-black text-right w-32 border-l border-white bg-emerald-800">
                        {fmt(summary.finalBalance)}
                    </div>
                </div>
            </div>


            {/* ─── VISUAL ANALYTICS (SCREEN ONLY) ─── */}
            <div className="print:hidden">
                <StatementCharts 
                    isRTL={isRTL} 
                    summary={summary} 
                    filtered={filtered} 
                    fmtDate={fmtDate} 
                    fmt={fmt}
                />
            </div>

            {/* ── SUMMARY BOX (SCREEN ONLY) ── */}
            <div className="break-inside-avoid print:hidden">
                <SummaryBox summary={summary} isRTL={isRTL} fmt={fmt} lang={lang} />
            </div>

            {/* ── DEBT BREAKDOWN TABLE (NEW) ── */}
            <div className="break-inside-avoid print:hidden">
                <DebtBreakdownTable 
                    items={summary.outstandingItems} 
                    balance={summary.finalBalance} 
                    isRTL={isRTL} 
                    fmt={fmt} 
                    fmtDate={fmtDate} 
                />
            </div>

            <PrintFooter isRTL={isRTL} finalBalance={summary.finalBalance} fmt={fmt} />

            {/* Print footer timestamp removed */}
        </div>
    );
}

// ── SUB-COMPONENTS ────────────────────────────────────

function Btn({ onClick, icon, label, ghost }) {
    return (
        <button onClick={onClick} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black transition-all print:hidden ${ghost ? 'bg-transparent text-[var(--text-muted)] hover:text-primary hover:bg-primary/5' : 'bg-[var(--surface-1)] border border-[var(--glass-border)] text-[var(--text-primary)] hover:border-primary/30 hover:text-primary shadow-sm'}`}>
            {icon}{label}
        </button>
    );
}

function PgBtn({ onClick, disabled, dir }) {
    return (
        <button onClick={onClick} disabled={disabled}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--surface-2)] border border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-primary/5 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all print:hidden">
            {dir === 'right' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
    );
}

function SummaryCard({ title, value, icon, color, suffix, sub, highlight }) {
    const c = { blue: ['bg-blue-50','border-blue-100','text-blue-500','text-blue-700'], green: ['bg-green-50','border-green-100','text-green-500','text-green-700'], purple: ['bg-purple-50','border-purple-100','text-purple-500','text-purple-700'], red: ['bg-red-50','border-red-100','text-red-500','text-red-700'] }[color] || ['bg-slate-50','border-slate-100','text-slate-500','text-slate-700'];
    return (
        <div className={`p-5 rounded-[1.75rem] border ${c[0]} ${c[1]} print:rounded-xl print:p-3 ${highlight ? 'ring-2 ring-offset-1 ring-primary/10 shadow-md' : ''}`}>
            <div className={`p-2 bg-white/70 rounded-xl w-fit mb-3 shadow-sm ${c[2]}`}>{icon}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 opacity-70">{title}</div>
            <div className={`text-xl font-black ${c[3]}`}>{value}</div>
            {suffix && <div className={`text-[9px] font-bold ${c[3]} opacity-60 mt-0.5`}>{suffix}</div>}
            {sub && <div className="text-[9px] font-bold text-[var(--text-muted)] mt-1.5 opacity-70">{sub}</div>}
        </div>
    );
}


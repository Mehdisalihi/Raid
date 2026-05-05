'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { 
    Search, Users, ChevronRight, FileText, 
    ArrowRight, User, Phone, CreditCard,
    TrendingUp, History, Mail, MapPin, 
    Calendar, FileSpreadsheet, Printer, 
    RefreshCw, AlertCircle, Wallet, Receipt, 
    CheckCircle, X, ChevronUp, ChevronDown, 
    ChevronLeft, TrendingDown, ArrowUpRight, 
    ArrowDownRight, Minus
} from 'lucide-react';
import SummaryBox from '@/components/SummaryBox';
import TxRow from '@/components/TxRow';
import RaidModal from '@/components/RaidModal';

// ─── TYPE LABELS ─────────────────────────────────────
const TYPE_MAP = {
    ar: { invoice: 'فاتورة بيع', purchase: 'فاتورة شراء', payment: 'دفعة', return: 'مرتجع', debt: 'دين' },
    fr: { invoice: 'Vente', purchase: 'Achat', payment: 'Paiement', return: 'Retour', debt: 'Crédit' }
};

// ─── BUILD TRANSACTIONS ──────────────────────────
const StatementPrintContent = ({ entityInfo, fmtDate, customerId, cid, summary, filteredTxns, isRTL, lang, fmtNumber, paginated }) => {
    return (
        <div className="space-y-4 bg-white text-slate-900" style={{ fontFamily: "'Cairo', sans-serif" }}>
            <CorporateHeader 
                isRTL={isRTL} 
                printDate={fmtDate(new Date())} 
                customerId={entityInfo?.customerId || entityInfo?.supplierId || cid}
            />

            <CustomerSection 
                customer={entityInfo} 
                fmtDate={fmtDate} 
                isRTL={isRTL} 
                fmtNumber={fmtNumber} 
                summary={summary}
            />

            <div className="mb-2">
                <table className="w-full border-collapse border border-slate-300">
                    <thead>
                        <tr className="bg-sky-600 print-exact">
                            <th className={`border-x border-white py-1.5 px-3 text-[10px] font-bold text-white w-[12%] ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'التاريخ' : 'Date'}</th>
                            <th className={`border-x border-white py-1.5 px-3 text-[10px] font-bold text-white w-[15%] ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'رقم الفاتورة' : 'N° Facture'}</th>
                            <th className={`border-x border-white py-1.5 px-3 text-[10px] font-bold text-white w-[37%] ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'البيان' : 'Désignation'}</th>
                            <th className={`border-x border-white py-1.5 px-3 text-[10px] font-bold text-white w-[12%] text-right`}>{isRTL ? 'مدين' : 'Débit'}</th>
                            <th className={`border-x border-white py-1.5 px-3 text-[10px] font-bold text-white w-[12%] text-right`}>{isRTL ? 'دائن' : 'Crédit'}</th>
                            <th className={`border-x border-white py-1.5 px-3 text-[10px] font-bold text-white w-[12%] text-right`}>{isRTL ? 'الرصيد' : 'Solde'}</th>
                        </tr>
                    </thead>
                    <tbody className="print-zebra">
                        {filteredTxns.map((tx, idx) => (
                            <TxRow 
                                key={`print-${tx.id || idx}`} 
                                tx={tx} 
                                isRTL={isRTL} 
                                lang={lang} 
                                fmt={fmtNumber} 
                                fmtDate={fmtDate} 
                                className={`text-[10px] border border-slate-200 ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}
                            />
                        ))}
                    </tbody>
                </table>
                
                <div className="flex items-center justify-between bg-sky-600 text-white font-bold text-[11px] mt-0 border border-slate-300 border-t-0 print-exact">
                    <div className="flex-1 px-3 py-1 text-right uppercase tracking-wider">
                        {isRTL ? 'إجمالي الرصيد الحالي' : 'Solde actuel du compte'} MRU
                    </div>
                    <div className="px-3 py-1 font-black text-right w-32 border-l border-white bg-sky-700 print-exact">
                        {fmtNumber(summary.finalBalance)}
                    </div>
                </div>
            </div>

            <PrintFooter isRTL={isRTL} finalBalance={summary.finalBalance} fmt={fmtNumber} />
        </div>
    );
};


const ROWS_PER_PAGE = 10;

function StatementInner() {
    const searchParams = useSearchParams();
    const cid = searchParams.get('cid');
    const { t, isRTL, lang, fmtNumber, fmtDate } = useLanguage();
    
    // Selection state
    const [selectedEntityName, setSelectedEntityName] = useState(null);
    const [entityInfo, setEntityInfo] = useState(null);
    const [allTxns, setAllTxns] = useState([]);
    
    // List search state
    const [entities, setEntities] = useState([]); // List of unique names
    const [loadingList, setLoadingList] = useState(true);

    // Detailed view states
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [searchTx, setSearchTx] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortField, setSortField] = useState('date');
    const [sortDir, setSortDir] = useState('asc');
    const [page, setPage] = useState(1);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Initial load
    useEffect(() => {
        fetchEntities();
    }, []);

    useEffect(() => {
        if (cid && entities.length > 0) {
            // If cid is provided, we try to find the entity that has this ID as either customer or supplier
            const e = entities.find(x => 
                (x.customerId && String(x.customerId) === cid) || 
                (x.supplierId && String(x.supplierId) === cid)
            );
            if (e) {
                setSelectedEntityName(e.name);
            }
        }
    }, [cid, entities]);

    // Load detailed data when entity selected
    useEffect(() => {
        if (selectedEntityName) {
            const entity = entities.find(e => e.name === selectedEntityName);
            if (entity) {
                fetchCombinedStatement(entity);
            }
        } else {
            setEntityInfo(null);
            setAllTxns([]);
        }
    }, [selectedEntityName]);

    const fetchEntities = async () => {
        try {
            const [custRes, suppRes] = await Promise.all([
                api.get('/customers'),
                api.get('/suppliers')
            ]);
            
            const custs = Array.isArray(custRes.data) ? custRes.data : [];
            const supps = Array.isArray(suppRes.data) ? suppRes.data : [];
            
            // Group by name
            const map = new Map();
            
            custs.forEach(c => {
                map.set(c.name, { 
                    name: c.name, 
                    customerId: c.id, 
                    phone: c.phone, 
                    email: c.email, 
                    address: c.address,
                    customerData: c 
                });
            });
            
            supps.forEach(s => {
                if (map.has(s.name)) {
                    const existing = map.get(s.name);
                    map.set(s.name, { 
                        ...existing, 
                        supplierId: s.id,
                        phone: existing.phone || s.phone,
                        email: existing.email || s.email,
                        address: existing.address || s.address,
                        supplierData: s
                    });
                } else {
                    map.set(s.name, { 
                        name: s.name, 
                        supplierId: s.id, 
                        phone: s.phone, 
                        email: s.email, 
                        address: s.address,
                        supplierData: s 
                    });
                }
            });
            
            setEntities(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
        } catch (err) { console.error(err); }
        finally { setLoadingList(false); }
    };

    const fetchCombinedStatement = async (entity) => {
        setLoadingDetail(true);
        try {
            let combinedInvoices = [];
            let combinedEntityInfo = { ...entity };

            const promises = [];
            if (entity.customerId) promises.push(api.get(`/customers/${entity.customerId}/statement`));
            if (entity.supplierId) promises.push(api.get(`/suppliers/${entity.supplierId}/statement`));

            const results = await Promise.all(promises);
            
            results.forEach((res, idx) => {
                const data = res.data;
                const invoices = data && Array.isArray(data.Invoices) ? data.Invoices : [];
                
                // Determine if this result came from customer or supplier endpoint
                // If it has customerId and we pushed customer first...
                const isCustomer = (entity.customerId && idx === 0) || (entity.customerId && entity.supplierId && idx === 0) || (entity.customerId && !entity.supplierId);
                
                const mappedInvoices = invoices.map(inv => {
                    const rawType = (inv.type || (isCustomer ? 'sale' : 'purchase')).toLowerCase();
                    const type = rawType === 'sale' ? 'invoice' : rawType === 'purchase' ? 'purchase' : rawType === 'payment' ? 'payment' : rawType === 'return' ? 'return' : rawType;
                    const total = parseFloat(inv.total || inv.grandTotal || inv.finalAmount || 0);
                    
                    let debit = 0;
                    let credit = 0;
                    let description = inv.description || inv.notes || '';

                    if (!description) {
                        if (isCustomer) {
                            if (type === 'payment') description = isRTL ? 'دفع من العميل' : 'Paiement client';
                            else if (type === 'invoice') description = isRTL ? 'فاتورة بيع' : 'Facture vente';
                            else if (type === 'return') description = isRTL ? 'مرتجع' : 'Retour';
                            else if (type === 'debt') description = isRTL ? 'دين' : 'Dette';
                            else description = '—';
                        } else {
                            if (type === 'payment') description = isRTL ? 'دفع للمورد' : 'Paiement fournisseur';
                            else if (type === 'purchase') description = isRTL ? 'فاتورة شراء' : 'Facture achat';
                            else if (type === 'return') description = isRTL ? 'مرتجع شراء' : 'Retour achat';
                            else if (type === 'debt') description = isRTL ? 'دين مورد' : 'Crédit fournisseur';
                            else description = '—';
                        }
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

                    if (isCustomer) {
                        debit = type === 'invoice' || type === 'debt' ? total : 0;
                        credit = type === 'payment' || type === 'return' ? total : 0;
                    } else {
                        debit = type === 'payment' || type === 'return' ? total : 0;
                        credit = type === 'purchase' || type === 'debt' ? total : 0;
                    }

                    return {
                        id: inv.id,
                        date: inv.createdAt,
                        type,
                        refNo: inv.invoiceNumber || inv.invoiceNo || `${type.toUpperCase()}-${String(inv.id || '').slice(-6)}`,
                        description,
                        items,
                        debit,
                        credit,
                        source: isCustomer ? 'customer' : 'supplier'
                    };
                });
                
                combinedInvoices = [...combinedInvoices, ...mappedInvoices];
            });

            // Re-sort combined list by date
            combinedInvoices.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Re-calculate running balance
            let bal = 0;
            const finalTxns = combinedInvoices.map(r => {
                bal = Math.round((bal + (r.debit - r.credit)) * 100) / 100;
                return { ...r, balance: bal };
            });

            setEntityInfo(combinedEntityInfo);
            setAllTxns(finalTxns);
        } catch (err) { console.error(err); }
        finally { setLoadingDetail(false); }
    };

    const filteredTxns = useMemo(() => {
        let data = allTxns;
        if (dateFrom) data = data.filter(tx => new Date(tx.date) >= new Date(dateFrom));
        if (dateTo) data = data.filter(tx => new Date(tx.date) <= new Date(dateTo));
        if (typeFilter !== 'all') data = data.filter(tx => tx.type === typeFilter);
        if (searchTx) {
            const q = searchTx.toLowerCase();
            data = data.filter(tx => 
                tx.refNo.toLowerCase().includes(q) || 
                tx.description.toLowerCase().includes(q) || 
                tx.items?.some(it => (it.product?.name || it.name || it.productName || '').toLowerCase().includes(q))
            );
        }
        return [...data].sort((a, b) => {
            let va = sortField === 'date' ? new Date(a.date) : a[sortField];
            let vb = sortField === 'date' ? new Date(b.date) : b[sortField];
            return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
        });
    }, [allTxns, dateFrom, dateTo, typeFilter, searchTx, sortField, sortDir]);

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const exportCSV = () => {
        const headers = isRTL ? ['التاريخ','النوع','المرجع','الوصف','المدين','الدائن','الرصيد'] : ['Date','Type','Réf.','Description','Débit','Crédit','Solde'];
        const rows = filteredTxns.map(tx => [fmtDate(tx.date), TYPE_MAP[lang]?.[tx.type] || tx.type, tx.refNo, tx.description, tx.debit.toFixed(2), tx.credit.toFixed(2), tx.balance.toFixed(2)]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `statement_${entityInfo?.name || selectedEntityName}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const TYPE_OPTS = [
        { id: 'all', label: isRTL ? 'جميع المعاملات' : 'Toutes les transactions' },
        { id: 'invoice', label: isRTL ? 'فواتير بيع' : 'Factures' },
        { id: 'payment', label: isRTL ? 'دفعات' : 'Paiements' },
        { id: 'return', label: isRTL ? 'مرتجعات' : 'Retours' },
        { id: 'debt', label: isRTL ? 'ديون' : 'Dettes' },
    ];

    const TH_COLS = [
        { field: 'date', label: isRTL ? 'التاريخ' : 'Date' },
        { field: 'description', label: isRTL ? 'الوصف' : 'Description' },
        { field: 'productCode', label: isRTL ? 'رمز المنتج' : 'Code' },
        { field: 'qty', label: isRTL ? 'الكمية' : 'Qty' },
        { field: 'debit', label: isRTL ? 'مدين' : 'Débit' },
        { field: 'credit', label: isRTL ? 'دائن' : 'Crédit' },
        { field: 'balance', label: isRTL ? 'الرصيد' : 'Solde' },
    ];

    const summary = useMemo(() => ({
        totalDebit: filteredTxns.reduce((s, t) => s + t.debit, 0),
        totalCredit: filteredTxns.reduce((s, t) => s + t.credit, 0),
        finalBalance: filteredTxns.reduce((s, t) => s + t.debit - t.credit, 0),
    }), [filteredTxns]);

    const totalPages = Math.max(1, Math.ceil(filteredTxns.length / ROWS_PER_PAGE));
    const paginated = filteredTxns.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

    return (
        <div className="space-y-5 pb-16 print:space-y-2 print:pb-0" dir={isRTL ? 'rtl' : 'ltr'}>
            
            {/* ─── PROFESSIONAL PRINT HEADER ─── */}
            <CorporateHeader 
                isRTL={isRTL} 
                printDate={fmtDate(new Date())} 
                customerId={entityInfo?.customerId || entityInfo?.supplierId || cid}
            />

            <CustomerSection 
                customer={entityInfo} 
                fmtDate={fmtDate} 
                isRTL={isRTL} 
                fmtNumber={fmtNumber} 
                summary={summary}
            />

            {/* ── TOP BAR (SCREEN ONLY) ── */}
            <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
                <div className="flex items-center gap-2">
                    <Btn onClick={() => setIsPreviewOpen(true)} icon={<Printer size={15}   color="#10b981" />} label={isRTL ? 'طباعة' : 'Imprimer'} />
                    <Btn onClick={exportCSV} icon={<FileSpreadsheet size={15} />} label={isRTL ? 'تصدير CSV' : 'Exporter CSV'} ghost />
                </div>
                <h1 className="text-2xl font-black text-[var(--text-primary)]">
                    {isRTL ? 'كشف حساب موحد' : 'Relevé de Compte Unifié'}
                </h1>
            </div>

            {/* ── FILTER SECTION (SCREEN ONLY) ── */}
            <div className="card-premium bg-[var(--surface-1)] border border-[var(--glass-border)] rounded-[1.75rem] p-6 print:hidden shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'الاسم (عميل/مورد)' : 'Nom (Client/Fourn.)'}</label>
                        <select 
                            value={selectedEntityName || ''} 
                            onChange={(e) => setSelectedEntityName(e.target.value ? e.target.value : null)}
                            className="w-full bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl h-11 px-4 text-sm font-bold focus:outline-none focus:border-primary/40 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23475569%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-no-repeat bg-[position:left_12px_center] rtl:bg-[position:right_12px_center]"
                        >
                            <option value="">{isRTL ? 'اختر اسماً...' : 'Sélectionner un nom...'}</option>
                            {entities.map(e => (
                                <option key={e.name} value={e.name}>
                                    {e.name} {e.customerId && e.supplierId ? (isRTL ? '(عميل ومورد)' : '(Double)') : e.customerId ? (isRTL ? '(عميل)' : '(Client)') : (isRTL ? '(مورد)' : '(Fourn.)')}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'من تاريخ' : 'Du'}</label>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl h-11 px-4 text-sm font-bold focus:outline-none focus:border-primary/40" />
                    </div>
                    <div className="space-y-1"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'إلى تاريخ' : 'Au'}</label>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl h-11 px-4 text-sm font-bold focus:outline-none focus:border-primary/40" />
                    </div>
                    <div className="space-y-1"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'نوع المعاملة' : 'Type'}</label>
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl h-11 px-4 text-sm font-bold focus:outline-none focus:border-primary/40 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23475569%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-no-repeat bg-[position:left_12px_center] rtl:bg-[position:right_12px_center]">
                            {TYPE_OPTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {selectedEntityName ? (
                loadingDetail || !entityInfo ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[var(--surface-1)] rounded-[2rem] border border-[var(--glass-border)]">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="font-bold text-[var(--text-muted)]">{isRTL ? 'جاري استخراج البيانات...' : 'Chargement...'}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Summary Cards (Screen Only) */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:hidden">
                            <SummaryCard title={isRTL ? 'إجمالي مدين' : 'Total Débit'} value={fmtNumber(summary.totalDebit)} icon={<TrendingUp size={18}/>} color="blue" suffix="MRU" highlight />
                            <SummaryCard title={isRTL ? 'إجمالي دائن' : 'Total Crédit'} value={fmtNumber(summary.totalCredit)} icon={<TrendingDown size={18}/>} color="green" suffix="MRU" />
                            <SummaryCard title={isRTL ? 'الرصيد النهائي' : 'Solde Final'} value={fmtNumber(Math.abs(summary.finalBalance))} icon={<Wallet size={18}/>} color={summary.finalBalance > 0 ? 'red' : 'green'} suffix="MRU" />
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
                                                key={`screen-${idx}`} 
                                                tx={tx} 
                                                isRTL={isRTL} 
                                                lang={lang} 
                                                fmt={fmtNumber} 
                                                fmtDate={fmtDate} 
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Pagination (Screen Only) */}
                            {filteredTxns.length > ROWS_PER_PAGE && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--glass-border)]">
                                    <p className="text-[11px] font-black text-slate-400 uppercase">{isRTL ? `عرض ${paginated.length} من ${filteredTxns.length}` : `Affichage ${paginated.length}/${filteredTxns.length}`}</p>
                                    <div className="flex gap-2">
                                        <PgBtn onClick={() => setPage(p => p - 1)} disabled={page === 1} dir={isRTL ? 'right' : 'left'} />
                                        <PgBtn onClick={() => setPage(p => p + 1)} disabled={page === totalPages} dir={isRTL ? 'left' : 'right'} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ─── TRANSACTION TABLE (PRINT ONLY) ─── */}
                        <div className="hidden print:block">
                            <StatementPrintContent 
                                entityInfo={entityInfo}
                                fmtDate={fmtDate}
                                customerId={entityInfo?.customerId || entityInfo?.supplierId || cid}
                                cid={cid}
                                summary={summary}
                                filteredTxns={filteredTxns}
                                isRTL={isRTL}
                                lang={lang}
                                fmtNumber={fmtNumber}
                                paginated={paginated}
                            />
                        </div>

                        <div className="print:hidden break-inside-avoid">
                            <SummaryBox 
                                summary={{
                                    ...summary,
                                    totalQty: filteredTxns.reduce((s, t) => s + (t.items?.reduce((ss, it) => ss + (it.qty || 0), 0) || 0), 0)
                                }} 
                                isRTL={isRTL} 
                                fmt={fmtNumber} 
                                lang={lang}
                            />
                        </div>

                        <PrintFooter isRTL={isRTL} finalBalance={summary.finalBalance} fmt={fmtNumber} />
                    </div>
                )
            ) : (
                <div className="flex flex-col items-center justify-center py-32 space-y-4 bg-[var(--surface-1)] rounded-[2rem] border border-dashed border-[var(--glass-border)] opacity-60 print:hidden">
                    <div className="p-4 bg-[var(--surface-2)] rounded-2xl text-[var(--text-muted)]"><Users size={40} /></div>
                    <div className="text-center">
                        <h3 className="text-lg font-black text-[var(--text-primary)]">{isRTL ? 'بانتظار اختيار الاسم' : 'En attente de sélection'}</h3>
                        <p className="text-sm font-bold text-[var(--text-muted)]">{isRTL ? 'يرجى اختيار اسم لعرض كشف الحساب الموحد' : 'Veuillez choisir un nom'}</p>
                    </div>
                </div>
            )}

            {/* ─── PRINT PREVIEW MODAL ─── */}
            <RaidModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                title={isRTL ? 'معاينة كشف الحساب قبل الطباعة' : 'Aperçu du relevé avant impression'}
                maxWidth="max-w-5xl"
            >
                <div className="flex flex-col gap-6">
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 overflow-y-auto max-h-[70vh] shadow-inner">
                        <div className="bg-white shadow-2xl mx-auto p-12" style={{ width: '210mm', minHeight: '297mm' }}>
                            <StatementPrintContent 
                                entityInfo={entityInfo}
                                fmtDate={fmtDate}
                                customerId={entityInfo?.customerId || entityInfo?.supplierId || cid}
                                cid={cid}
                                summary={summary}
                                filteredTxns={filteredTxns}
                                isRTL={isRTL}
                                lang={lang}
                                fmtNumber={fmtNumber}
                                paginated={paginated}
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsPreviewOpen(false)}
                            className="flex-1 h-14 rounded-2xl bg-slate-100 text-slate-600 font-black hover:bg-slate-200 transition-all"
                        >
                            {isRTL ? 'إلغاء' : 'Annuler'}
                        </button>
                        <button
                            onClick={() => {
                                setIsPreviewOpen(false);
                                setTimeout(() => window.print(), 300);
                            }}
                            className="flex-[2] h-14 rounded-2xl bg-emerald-600 text-white font-black shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
                        >
                            <Printer size={20} />
                            {isRTL ? 'تأكيد وطباعة الكشف' : 'Confirmer et Imprimer'}
                        </button>
                    </div>
                </div>
            </RaidModal>
        </div>
    );
}

// ─── SHARED SUB-COMPONENTS ────────────────────────────────

function CorporateHeader({ isRTL, printDate, customerId }) {
    const { lang } = useLanguage();
    const [storeInfo, setStoreInfo] = useState({ name: '', logo: null, slogan: '', address: '', phone: '', email: '', taxId: '' });

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            setStoreInfo({
                name: user.storeName || (isRTL ? 'اسم مؤسستك' : 'Établissement Raid'),
                logo: user.storeLogo || null,
                slogan: user.storeSlogan || (isRTL ? 'لإدارة أموالك بذكاء' : 'Gestion financière intelligente'),
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
                <img src="/Raed.png" alt="App Logo" className="w-4 h-4 opacity-80" />
                <span>{isRTL ? 'رائد المحاسبي' : 'Raid Comptabilité'}</span>
            </div>

            <div className="flex justify-between items-start">
                {/* Left: Institution Info & Logo */}
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden p-1">
                        {storeInfo.logo ? (
                            <img src={storeInfo.logo} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-[9px] text-slate-400 text-center font-bold">{isRTL ? 'شعار المؤسسة' : 'Logo Institution'}</span>
                        )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            {storeInfo.name}
                        </h1>
                        <div className="flex flex-col text-[9px] font-bold text-slate-600 uppercase tracking-tight">
                            {storeInfo.address && <span>{isRTL ? 'العنوان: ' : 'Adresse: '}{storeInfo.address}</span>}
                            {storeInfo.phone && <span>{isRTL ? 'الهاتف: ' : 'Tél: '}{storeInfo.phone}</span>}
                            {storeInfo.email && <span>{isRTL ? 'الإيميل: ' : 'E-mail: '}{storeInfo.email}</span>}
                            {storeInfo.taxId && <span className="mt-1 text-slate-900">{isRTL ? 'الرقم الضريبي: ' : 'NIF: '}{storeInfo.taxId}</span>}
                        </div>
                    </div>
                </div>

                {/* Right: Statement Title & Details Table */}
                <div className="flex flex-col items-end gap-3">
                    <h2 className="text-3xl font-black text-emerald-700 uppercase tracking-widest leading-none">
                        {isRTL ? 'كشف حساب' : (lang === 'fr' ? 'RELEVÉ DE COMPTE' : 'RELEVÉ DE COMPTE')}
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
                        : `Le solde de votre compte est de ${fmt(finalBalance)} MRU. Veuillez régler le solde restant dès que possible.`)}
            </p>
            <h4 className="text-base font-black mb-4">
                {isRTL ? 'شكراً لتعاملكم معنا!' : (lang === 'fr' ? 'Merci de votre confiance !' : 'Merci de votre confiance !')}
            </h4>
            
            <div className="w-full border-t border-slate-300 pt-3 text-center space-y-1 text-[10px]">
                <p>
                    {isRTL 
                        ? 'إذا كان لديك أي استفسارات بخصوص كشف الحساب، يرجى التواصل معنا'
                        : (lang === 'fr' 
                            ? 'Pour toute question concernant ce relevé, n\'hésitez pas à nous contacter'
                            : 'Pour toute question concernant ce relevé, n\'hésitez pas à nous contacter')}
                </p>
            </div>
        </div>
    );
}

function CustomerSection({ customer, fmtDate, isRTL, fmtNumber, summary }) {
    const { lang } = useLanguage();
    if (!customer) return null;
    return (
        <div className="hidden print:grid grid-cols-2 gap-4 mb-2 break-inside-avoid">
            {/* Left: Bill To */}
            <div className="flex flex-col border border-slate-300">
                <div className="bg-sky-600 text-white font-bold text-[12px] px-3 py-1 uppercase print-exact">
                    {isRTL ? 'فاتورة إلى:' : (lang === 'fr' ? 'FACTURER À :' : 'FACTURER À :')}
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
                <div className="bg-sky-600 text-white font-bold text-[12px] px-3 py-1 uppercase print-exact">
                    {isRTL ? 'ملخص الحساب' : (lang === 'fr' ? 'RÉSUMÉ DU COMPTE' : 'RÉSUMÉ DU COMPTE')}
                </div>
                <table className="w-full text-[11px] font-bold text-slate-800 border-collapse">
                    <tbody>
                        <tr className="border-b border-slate-100">
                            <td className="px-3 py-1.5">{isRTL ? 'المدفوعات (دائن)' : (lang === 'fr' ? 'Paiements (Crédit)' : 'Paiements (Crédit)')}</td>
                            <td className="px-3 py-1.5 text-right">{fmtNumber(summary.totalCredit)}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-3 py-1.5">{isRTL ? 'الفواتير (مدين)' : (lang === 'fr' ? 'Factures (Débit)' : 'Factures (Débit)')}</td>
                            <td className="px-3 py-1.5 text-right">{fmtNumber(summary.totalDebit)}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                            <td className="px-3 py-1.5 font-black text-slate-900">{isRTL ? 'إجمالي الرصيد المستحق' : (lang === 'fr' ? 'Solde total dû' : 'Solde total dû')}</td>
                            <td className="px-3 py-1.5 text-right font-black text-slate-900">{fmtNumber(summary.finalBalance)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}


// ─── SHARED SUB-COMPONENTS ────────────────────────────────

function SummaryCard({ title, value, icon, color, suffix }) {
    const c = { blue: ['bg-blue-50','border-blue-100','text-blue-700'], green: ['bg-green-50','border-green-100','text-green-700'], purple: ['bg-purple-50','border-purple-100','text-purple-700'], red: ['bg-red-50','border-red-100','text-red-700'] }[color];
    return (
        <div className={`p-4 rounded-2xl border ${c[0]} ${c[1]} print:hidden`}>
            <div className={`p-2 bg-white/70 rounded-lg w-fit mb-2 ${c[2]}`}>{icon}</div>
            <div className="text-[9px] font-black uppercase text-slate-400 mb-1">{title}</div>
            <div className={`text-lg font-black ${c[2]}`}>{value} <span className="text-[10px] opacity-60">{suffix}</span></div>
        </div>
    );
}

function Btn({ onClick, icon, label, ghost }) {
    return (
        <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-all print:hidden ${ghost ? 'text-slate-500 hover:bg-slate-50' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
            {icon}{label}
        </button>
    );
}

function PgBtn({ onClick, disabled, dir }) {
    return (
        <button onClick={onClick} disabled={disabled} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 disabled:opacity-30 print:hidden">
            {dir === 'right' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
    );
}

export default function StatementPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}>
            <StatementInner />
        </Suspense>
    );
}

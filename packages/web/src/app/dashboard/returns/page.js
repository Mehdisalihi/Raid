'use client';

import { useState, useEffect, Fragment } from 'react';
import api from '@/lib/api';
import {
    RotateCcw, Search, Filter, Calendar,
    ArrowUpRight, ArrowDownRight, Package,
    Save, X, ShoppingBag, Truck, CreditCard,
    Plus, Minus, Hash, Trash2, Activity,
    History, AlertCircle, CheckCircle2, RefreshCw, ChevronDown
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import RaidDialog from '@/components/RaidDialog';
import RaidModal from '@/components/RaidModal';

import { db } from '@/lib/db';

export default function ReturnsPage() {
    const { t, isRTL, fmtNumber, fmtDate, fmtTime } = useLanguage();
    const [sales, setSales] = useState([]);
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchInvoice, setSearchInvoice] = useState('');
    const [selectedSale, setSelectedSale] = useState(null);
    const [returnItems, setReturnItems] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [isSearching, setIsSearching] = useState(false);

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
            const [retRes, warRes] = await Promise.all([
                api.get('/returns'),
                api.get('/warehouses')
            ]);
            const returnsData = Array.isArray(retRes.data) ? retRes.data : [];
            const warehousesData = Array.isArray(warRes.data) ? warRes.data : [];
            
            setReturns(returnsData);
            setWarehouses(warehousesData);
            if (warehousesData.length > 0) {
                setSelectedWarehouseId(warehousesData[0].id);
            }
        } catch (err) {
            console.error('Error fetching returns:', err);
            // Offline fallback: load from IndexedDB
            try {
                const localReturns = await db.returns.toArray();
                const localWarehouses = await db.warehouses.toArray();
                setReturns(localReturns);
                setWarehouses(localWarehouses);
                if (localWarehouses.length > 0) setSelectedWarehouseId(localWarehouses[0].id);
            } catch {}
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSale = async () => {
        if (!searchInvoice) return;
        setIsSearching(true);
        try {
            const res = await api.get(`/sales?invoiceNo=${searchInvoice}`);
            const found = res.data.find(s => s.invoiceNo === searchInvoice && s.type === 'SALE');
            if (found) {
                setSelectedSale(found);
                // Initialize return items with 0 quantity
                setReturnItems(found.items.map(item => ({
                    ...item,
                    returnQty: 0
                })));
            } else {
                triggerDialog(
                    isRTL ? 'عذراً' : 'Désolé', 
                    isRTL ? 'لم يتم العثور على الفاتورة المطلوبة' : 'Facture non trouvée', 
                    'warning'
                );
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    const updateItemQty = (productId, delta) => {
        setReturnItems(prev => prev.map(item => {
            if (item.productId === productId) {
                const max = item.qty;
                const newQty = Math.max(0, Math.min(max, item.returnQty + delta));
                return { ...item, returnQty: newQty };
            }
            return item;
        }));
    };

    const handleProcessReturn = async () => {
        const itemsToReturn = returnItems.filter(i => i.returnQty > 0);
        if (itemsToReturn.length === 0) {
            triggerDialog(
                isRTL ? 'تنبيه' : 'Attention', 
                isRTL ? 'برجاء اختيار منتج واحد على الأقل للمرتجع' : 'Veuillez sélectionner au moins un produit à retourner', 
                'warning'
            );
            return;
        }

        const total = itemsToReturn.reduce((sum, item) => sum + (item.returnQty * item.price), 0);

        try {
            await api.post('/returns', {
                saleId: selectedSale.id,
                items: itemsToReturn.map(i => ({ productId: i.productId, quantity: i.returnQty })),
                total,
                warehouseId: selectedWarehouseId,
                date: new Date().toISOString()
            });
            fetchData();
            closeModal();
            triggerDialog(
                isRTL ? 'عملية ناجحة ✨' : 'Opération réussie ✨', 
                isRTL ? 'تم معالجة المرتجع وتحديث المخزون بنجاح' : 'Retour traité et stock mis à jour avec succès', 
                'success'
            );
        } catch (err) {
            triggerDialog(
                isRTL ? 'فشل المعالجة ❌' : 'Échec du traitement ❌', 
                isRTL ? 'حدث خطأ أثناء معالجة المرتجع' : 'Erreur lors du traitement', 
                'danger'
            );
        }
    };

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setSearchInvoice('');
        setSelectedSale(null);
        setReturnItems([]);
    };

    if (loading) return (
        <div className={`flex flex-col items-center justify-center h-[60vh] gap-4 opacity-60 ${isRTL ? 'direction-rtl' : 'direction-ltr'}`}>
            <div className="w-14 h-14 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-lg font-black animate-pulse text-[var(--text-primary)]">
                {isRTL ? 'جاري استدعاء سجلات المرتجعات...' : 'Chargement des enregistrements de retour...'}
            </p>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-up pb-10 bg-[var(--background)]">
            {/* ─── HEADER ─── */}
            <div className="card-premium p-8 lg:p-10 rounded-[2.5rem] bg-[var(--surface-1)] border border-[var(--glass-border)] shadow-[var(--shadow-card)] relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-warning/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

                <div className={`relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 ${isRTL ? '' : 'flex-row-reverse'}`}>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <div className={`flex items-center gap-4 mb-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className="p-3.5 bg-warning/10 rounded-2xl border border-warning/5 shadow-sm">
                                <RefreshCw size={32} className="text-warning" />
                            </div>
                            <div>
                                <h1 className="text-2xl lg:text-3xl font-black text-[var(--text-primary)]">{t('manage_returns')}</h1>
                                <p className="text-[--text-muted] text-sm mt-1.5 font-bold opacity-80">{t('process_returns')}</p>
                            </div>
                        </div>

                        <div className={`flex flex-wrap gap-2.5 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className={`px-4 py-2 rounded-xl bg-white/50 border border-white text-[10px] font-black uppercase tracking-wider flex items-center gap-2 ${isRTL ? '' : 'flex-row-reverse'}`}>
                                <History size={14} className="text-warning" />
                                {returns.length} {isRTL ? 'عملية مرتجع' : 'retour(s)'}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className={`btn-primary shrink-0 px-8 py-4 rounded-2xl font-black text-lg flex items-center gap-3 shadow-2xl transition-all active:scale-95 group/btn overflow-hidden ${isRTL ? '' : 'flex-row-reverse'}`}
                        style={{
                            background: 'linear-gradient(135deg, var(--warning) 0%, #f59e0b 100%)',
                            boxShadow: '0 8px 30px rgba(245, 158, 11, 0.3)'
                        }}
                    >
                        <Plus size={22} className="group-hover/btn:rotate-90 transition-transform duration-300" />
                        {t('start_return')}
                    </button>
                </div>
            </div>

            {/* ─── DATA GRID ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {returns.length === 0 ? (
                    <div className="col-span-full py-24 flex flex-col items-center gap-6 opacity-30 select-none">
                        <div className="p-10 bg-[var(--surface-1)] rounded-[3rem] border border-[var(--glass-border)] shadow-inner">
                            <RotateCcw size={80} strokeWidth={1} />
                        </div>
                        <p className="font-black text-xl">{t('no_returns')}</p>
                    </div>
                ) : returns.map((ret, i) => (
                    <ReturnCard key={ret.id} ret={ret} index={i} isRTL={isRTL} />
                ))}
            </div>

            {/* ─── CREATE MODAL ─── */}
            <RaidModal
                isOpen={isCreateModalOpen}
                onClose={closeModal}
                title={t('new_return')}
            >
                <div>
                    {!selectedSale ? (
                        <div className="space-y-6">
                            <div className="mb-2">
                                <p className={`text-slate-400 text-xs font-bold uppercase tracking-wide opacity-70 ${isRTL ? 'text-right' : 'text-left'}`}>
                                    {isRTL ? 'البحث عن الفاتورة الأصلية وبدء المرتجع' : 'Rechercher la facture originale'}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <label className={`text-[11px] font-black uppercase text-slate-400 tracking-widest mr-1 opacity-70 flex items-center gap-2 ${isRTL ? 'justify-end' : 'justify-start flex-row-reverse'}`}>
                                    <Hash size={12} /> {t('original_invoice')}
                                </label>
                                <div className={`flex gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                                    <div className="relative flex-1 group">
                                        <input
                                            type="text"
                                            placeholder={t('search_invoice_placeholder')}
                                            className={`w-full h-14 bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl text-lg font-black text-[var(--text-primary)] focus:outline-none focus:border-warning/40 shadow-inner ${isRTL ? 'pr-4 pl-6 text-right' : 'pl-4 pr-6 text-left'}`}
                                            value={searchInvoice}
                                            onChange={e => setSearchInvoice(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={handleSearchSale}
                                        disabled={isSearching}
                                        className="h-14 px-8 rounded-xl bg-warning text-white font-black hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                                    >
                                        {isSearching ? <Activity size={20} className="animate-spin" /> : (isRTL ? 'بحث' : 'Chercher')}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className={`text-[11px] font-black uppercase text-slate-400 tracking-widest mr-1 opacity-70 flex items-center gap-2 ${isRTL ? 'justify-end' : 'justify-start flex-row-reverse'}`}>
                                    <Package size={12} /> {isRTL ? 'المستودع المستلم' : 'Entrepôt de réception'}
                                </label>
                                <div className="relative">
                                    <select
                                        className={`w-full h-14 bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl text-lg font-black text-[var(--text-primary)] focus:outline-none focus:border-warning/40 shadow-inner appearance-none ${isRTL ? 'pr-4 pl-12 text-right' : 'pl-4 pr-12 text-left'}`}
                                        value={selectedWarehouseId}
                                        onChange={e => setSelectedWarehouseId(e.target.value)}
                                    >
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                    <ChevronDown size={18} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${isRTL ? 'left-4' : 'right-4'}`} />
                                </div>
                            </div>

                            <div className={`p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-4 ${isRTL ? 'text-right' : 'text-left flex-row-reverse'}`}>
                                <AlertCircle className="text-amber-500 shrink-0" size={20} />
                                <p className="text-sm text-amber-500 font-bold leading-relaxed">
                                    {isRTL
                                        ? 'ملاحظة: يمكنك فقط إرجاع المنتجات التي تم بيعها في فواتير نظام "مبيعات" الحالية.'
                                        : "Note: Vous ne pouvez retourner que les produits vendus dans les factures de vente actuelles."}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className={`p-5 bg-[var(--surface-2)] rounded-2xl border border-[var(--glass-border)] flex justify-between items-center shadow-inner ${isRTL ? '' : 'flex-row-reverse'}`}>
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <div className="text-[10px] font-black text-[var(--text-faint)] uppercase tracking-widest mb-1.5 opacity-60">{t('invoice_data')}</div>
                                    <div className="text-lg font-black text-[var(--text-primary)]">#{selectedSale.invoiceNo}</div>
                                    <div className="text-xs font-bold text-[var(--text-muted)] mt-1">{selectedSale.customer?.name || (isRTL ? 'عميل نقدي' : 'Client Comptant')}</div>
                                </div>
                                <button onClick={() => setSelectedSale(null)} className="text-xs font-black text-red-500 hover:underline">{isRTL ? 'تغيير الفاتورة' : 'Changer'}</button>
                            </div>

                            <div className="space-y-4">
                                <h3 className={`text-sm font-black text-slate-700 px-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('select_return_items')}:</h3>
                                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scroll">
                                    {returnItems.map(item => (
                                        <div key={item.id} className={`p-4 bg-white rounded-xl border border-slate-100 flex items-center justify-between group hover:border-warning/30 transition-all ${isRTL ? '' : 'flex-row-reverse'}`}>
                                            <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                <div className="font-extrabold text-sm text-slate-900">{item.product?.name}</div>
                                                <div className="text-[10px] text-slate-500 font-bold mt-1">{t('original_qty')}: {item.qty}</div>
                                            </div>
                                            <div className={`flex items-center gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                                                <div className={`flex items-center bg-[var(--surface-1)] rounded-lg border border-[var(--glass-border)] p-1 shadow-sm ${isRTL ? '' : 'flex-row-reverse'}`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateItemQty(item.productId, -1)}
                                                        className="w-8 h-8 flex items-center justify-center hover:bg-[var(--surface-2)] rounded-lg transition-colors text-red-500"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <div className="w-10 text-center font-black text-lg text-[var(--text-primary)]">{item.returnQty}</div>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateItemQty(item.productId, 1)}
                                                        className="w-8 h-8 flex items-center justify-center hover:bg-[var(--surface-2)] rounded-lg transition-colors text-emerald-500"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                                <div className={`w-28 ${isRTL ? 'text-left' : 'text-right'}`}>
                                                    <div className="text-xs font-black text-warning">{fmtNumber(item.returnQty * item.price)} MRU</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 border-dashed">
                                <div className={`flex justify-between items-center mb-8 ${isRTL ? '' : 'flex-row-reverse'}`}>
                                    <div className="text-lg font-black text-slate-700">{t('total_return')}:</div>
                                    <div className={`text-3xl font-black text-warning ${isRTL ? '' : 'direction-ltr'}`}>
                                        {fmtNumber(returnItems.reduce((sum, item) => sum + (item.returnQty * item.price), 0))}
                                        <span className={`text-sm ${isRTL ? 'mr-2' : 'ml-2'}`}>MRU</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleProcessReturn}
                                    className={`w-full h-14 rounded-2xl font-black text-lg flex items-center justify-center gap-4 text-white shadow-lg transition-all active:scale-95 group/save relative overflow-hidden ${isRTL ? '' : 'flex-row-reverse'}`}
                                    style={{
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        boxShadow: '0 10px 30px rgba(245, 158, 11, 0.2)'
                                    }}
                                >
                                    <CheckCircle2 size={24} className="group-hover/save:scale-110 transition-transform" />
                                    {t('complete_return')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </RaidModal>

            {/* ─── HIDDEN PRINT LAYOUT ─── */}
            <div className="hidden print:block print:bg-white print:text-black print:p-12 font-sans" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: "'Cairo', sans-serif" }}>
                <div className="text-center border-b-[3px] border-sky-600 pb-8 mb-10 print-exact">
                    <h1 className="text-4xl font-black mb-1 text-sky-600 tracking-tighter uppercase">{isRTL ? 'رائد' : 'RAID'}</h1>
                    <h2 className="text-2xl font-black uppercase tracking-widest">{isRTL ? 'سجل مرتجعات المبيعات' : 'JOURNAL DES RETOURS'}</h2>
                    <p className="text-sm mt-3 opacity-70 font-bold uppercase tracking-widest">
                        {isRTL ? 'تاريخ التقرير:' : 'Date du rapport:'} {fmtDate(new Date())} {fmtTime(new Date())}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-12 border-b-2 border-dashed border-gray-200 pb-12">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{isRTL ? 'إجمالي المرتجعات' : 'Total des Retours'}</p>
                        <p className="text-4xl font-black">{fmtNumber(returns.reduce((sum, r) => sum + r.finalAmount, 0))} <span className="text-xs">MRU</span></p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{isRTL ? 'عدد العمليات' : 'Nombre d\'Opérations'}</p>
                        <p className="text-4xl font-black">{returns.length}</p>
                    </div>
                </div>

                <table className="w-full border-collapse mb-10 text-lg">
                    <thead>
                        <tr className="bg-sky-600 text-white print-exact border-sky-700 border-y-2 text-sm uppercase">
                            <th className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'التاريخ' : 'Date'}</th>
                            <th className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'العميل' : 'Client'}</th>
                            <th className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'رقم الفاتورة' : 'Facture N°'}</th>
                            <th className={`p-4 ${isRTL ? 'text-left' : 'text-right'}`}>{isRTL ? 'المبلغ المسترد' : 'Montant'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {returns.map(ret => (
                            <Fragment key={ret.id}>
                                <tr className="border-b border-gray-300 bg-gray-50/30">
                                    <td className={`p-4 font-bold text-xs ${isRTL ? 'text-right' : 'text-left'}`}>{fmtDate(ret.createdAt)}</td>
                                    <td className={`p-4 font-bold ${isRTL ? 'text-right' : 'text-left'}`}>{ret.customer?.name || (isRTL ? 'عميل نقدي' : 'Client Comptant')}</td>
                                    <td className={`p-4 text-xs font-black uppercase opacity-60 ${isRTL ? 'text-right' : 'text-left'}`}>#{ret.invoiceNo}</td>
                                    <td className={`p-4 font-black ${isRTL ? 'text-left' : 'text-right'}`}>{fmtNumber(ret.finalAmount)} MRU</td>
                                </tr>
                                {ret.items?.length > 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-0">
                                            <div className={`px-12 py-3 space-y-2 border-b border-gray-200 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                {ret.items.map((item, idx) => (
                                                    <div key={idx} className={`flex justify-between text-[10px] font-bold opacity-70 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                        <span>• {item.product?.name || item.name}</span>
                                                        <span>{item.qty} × {fmtNumber(item.price || 0)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>

                <div className="mt-20 border-t-2 border-black pt-10 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                    End of Returns Journal • Rapport des Retours Raid
                </div>
            </div>

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

function ReturnCard({ ret, index, isRTL }) {
    const { fmtNumber } = useLanguage();
    const date = new Date(ret.createdAt);
    const customerName = ret.customer?.name || (isRTL ? 'عميل نقدي' : 'Client Comptant');

    return (
        <div
            className={`card-premium group p-6 rounded-[2.5rem] bg-[var(--surface-1)] border border-[var(--glass-border)] flex flex-col hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}
            style={{ animationDelay: `${index * 0.05}s` }}
        >
            <div className={`absolute top-0 w-1.5 h-full rounded-full bg-warning/40 ${isRTL ? 'right-0' : 'left-0'}`} />

            <div className={`relative z-10 flex justify-between items-start mb-6 ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className={`flex items-center gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                    <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center font-black text-lg text-warning border border-warning/10 shadow-sm group-hover:scale-110 transition-transform">
                        <RotateCcw size={24} />
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <div className="font-extrabold text-[15px] text-[var(--text-primary)] group-hover:text-warning transition-colors">{customerName}</div>
                        <div className={`text-[11px] text-[--text-muted] font-bold flex items-center gap-1.5 mt-1 opacity-70 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <Calendar size={11} className="text-warning/60" />
                            {fmtDate(date)}
                        </div>
                    </div>
                </div>
                <div className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-[var(--surface-2)] text-warning border border-[var(--glass-border)] shadow-inner uppercase tracking-widest">
                    #{ret.invoiceNo?.slice(-6) || '—'}
                </div>
            </div>

            <div className={`space-y-2 mb-8 flex-1 ${isRTL ? '' : 'direction-ltr'}`}>
                {(ret.items || []).slice(0, 2).map(item => (
                    <div key={item.id} className={`flex justify-between text-[11px] font-bold text-[--text-muted] ${isRTL ? '' : 'flex-row-reverse'}`}>
                        <span className="truncate max-w-[120px]">{item.product?.name}</span>
                        <span>x{item.qty}</span>
                    </div>
                ))}
                {(ret.items || []).length > 2 && <div className={`text-[9px] text-[--text-faint] font-black italic ${isRTL ? 'text-right' : 'text-left'}`}>+{ret.items.length - 2} {isRTL ? 'أصناف أخرى' : 'autres articles'}</div>}
            </div>

            <div className={`mt-auto relative z-10 pt-5 border-t border-[var(--glass-border)] border-dashed flex justify-between items-end ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="text-[10px] font-bold text-[--text-muted] uppercase tracking-widest mb-1.5 opacity-60">{isRTL ? 'قيمة المرتجع' : 'Montant Retour'}</div>
                    <div className={`text-3xl font-black text-warning tracking-tighter ${isRTL ? '' : 'direction-ltr'}`}>
                        {fmtNumber(ret.finalAmount)}
                        <span className={`text-xs font-bold text-[--text-muted] ${isRTL ? 'mr-2' : 'ml-2'} uppercase tracking-tighter`}>MRU</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

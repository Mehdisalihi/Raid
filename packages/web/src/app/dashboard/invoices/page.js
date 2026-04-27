'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    ShoppingCart, Search, User, Trash2, Save, Plus, Minus,
    CreditCard, LayoutGrid, Receipt, History, PackagePlus,
    Printer, ChevronDown, CheckCircle2, AlertTriangle, X,
    ArrowRightLeft, FileText, Download, Edit2, ArrowRightCircle,
    Eye, Filter, Calendar, MoreVertical, Trash, FileDown, RefreshCw, Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';
import RaidDialog from '@/components/RaidDialog';
import RaidModal from '@/components/RaidModal';
import { formatInvoiceTotalWords } from '@/lib/numberToWords';

export default function InvoicesPage() {
    const { t, isRTL, fmtNumber, fmtDate, fmtTime } = useLanguage();
    
    // View state
    const [view, setView] = useState('list'); // 'list' or 'create'
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState([]);
    const [activeTab, setActiveTab] = useState('SALE'); // SALE, QUOTATION, PURCHASE for creation
    
    // Filter state
    const [filterType, setFilterType] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Data for creation
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    
    // Cart state
    const [cart, setCart] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [saving, setSaving] = useState(false);
    const [isDebt, setIsDebt] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [settings, setSettings] = useState(null);
    const [taxRate, setTaxRate] = useState(16);
    const [editingInvoiceId, setEditingInvoiceId] = useState(null);

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

    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        fetchInvoices();
        fetchCommonData();
    }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/invoices', {
                params: { 
                    type: filterType === 'ALL' ? undefined : filterType,
                    search: searchQuery
                }
            });
            setInvoices(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCommonData = async () => {
        try {
            const [p, c, s, w] = await Promise.all([
                api.get('/products'),
                api.get('/customers'),
                api.get('/suppliers'),
                api.get('/warehouses')
            ]);
            setProducts(Array.isArray(p.data) ? p.data : []);
            setCustomers(Array.isArray(c.data) ? c.data : []);
            setSuppliers(Array.isArray(s.data) ? s.data : []);
            setWarehouses(Array.isArray(w.data) ? w.data : []);
            if (Array.isArray(w.data) && w.data.length > 0) setSelectedWarehouseId(w.data[0].id);

            // Load settings from user profile in localStorage
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    setSettings({
                        store: {
                            name: user.storeName,
                            taxId: user.storeTaxId,
                            address: user.storeAddress,
                            phone: user.storePhone,
                            email: user.storeEmail,
                            logo: user.storeLogo,
                            currency: user.currency || 'MRU'
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to parse settings from localStorage:", e);
            }
            
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateNew = (type) => {
        setActiveTab(type);
        setCart([]);
        setCustomerName(type === 'PURCHASE' ? '' : t('cash_customer'));
        setCustomerId('');
        setSupplierId('');
        setIsDebt(type === 'SALE'); // Default debt for sales in this new system? Or maybe not.
        setIsCreateModalOpen(true);
    };

    const addToCart = (product) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
        } else {
            setCart([...cart, { ...product, qty: 1 }]);
        }
    };

    const updateQty = (id, delta) => {
        setCart(cart.map(item => item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const calculateTotal = () => cart.reduce((sum, item) => {
        const price = activeTab === 'PURCHASE' ? (item.buyPrice || 0) : (item.sellPrice || 0);
        return sum + (price * item.qty);
    }, 0);

    const startEditing = (inv) => {
        setEditingInvoiceId(inv.id);
        setActiveTab(inv.type);
        setCustomerName(inv.customer?.name || '');
        setSupplierId(inv.supplierId || '');
        setIsDebt(inv.isDebt);
        setTaxRate(inv.taxRate || 0);
        setSelectedWarehouseId(inv.warehouseId);
        
        // Map items back to cart format
        const items = inv.items.map(item => ({
            ...item.product,
            qty: item.qty,
            sellPrice: item.price,
            buyPrice: item.price
        }));
        setCart(items);
        setIsCreateModalOpen(true);
    };

    const cancelEditing = () => {
        setEditingInvoiceId(null);
        setCart([]);
        setCustomerName('');
        setSupplierId('');
        setIsDebt(false);
        setTaxRate(16);
        setIsCreateModalOpen(false);
    };

    const handleSaveInvoice = async () => {
        if (cart.length === 0) return;
        setSaving(true);
        try {
            const payload = {
                customerName: customerName || t('cash_customer'),
                supplierId: supplierId,
                items: cart.map(i => ({ id: i.id, qty: i.qty, price: activeTab === 'PURCHASE' ? i.buyPrice : i.sellPrice })),
                isDebt: isDebt && activeTab !== 'QUOTATION',
                cart: cart,
                totalAmount: calculateTotal(),
                taxRate: taxRate,
                taxAmount: Number((calculateTotal() * (taxRate / 100)).toFixed(2)),
                finalAmount: Number((calculateTotal() * (1 + taxRate / 100)).toFixed(2)),
                type: activeTab,
                warehouseId: selectedWarehouseId || warehouses[0]?.id,
                total: calculateTotal() // Needed for purchases
            };

            if (editingInvoiceId) {
                await api.put(`/invoices/${editingInvoiceId}`, payload);
            } else {
                if (activeTab === 'PURCHASE') {
                    await api.post('/purchases', payload);
                } else {
                    await api.post('/sales', payload);
                }
            }
            
            triggerDialog(
                isRTL ? 'نجاح ✨' : 'Succès ✨', 
                isRTL ? (editingInvoiceId ? 'تم تحديث الفاتورة بنجاح' : 'تم حفظ الفاتورة بنجاح') : (editingInvoiceId ? 'Facture mise à jour' : 'Facture enregistrée avec succès'), 
                'success'
            );
            
            setIsCreateModalOpen(false);
            setCart([]);
            setEditingInvoiceId(null);
            fetchInvoices();
        } catch (err) {
            triggerDialog(
                isRTL ? 'خطأ ❌' : 'Erreur ❌', 
                isRTL ? 'حدث خطأ أثناء حفظ الفاتورة' : 'Erreur lors de l\'enregistrement', 
                'danger'
            );
        } finally {
            setSaving(false);
        }
    };

    const convertQuoteToSale = (id) => {
        triggerDialog(
            isRTL ? 'تحويل لعرض سعر' : 'Convertir en vente',
            isRTL ? 'هل تريد تحويل عرض السعر هذا إلى فاتورة مبيعات؟' : 'Voulez-vous convertir ce devis en facture de vente ?',
            'info',
            async () => {
                try {
                    await api.post(`/invoices/convert-quote/${id}`, {
                        warehouseId: selectedWarehouseId,
                        isDebt: true
                    });
                    triggerDialog(
                        isRTL ? 'تم التحويل' : 'Converti', 
                        isRTL ? 'تم تحويل عرض السعر بنجاح' : 'Devis converti avec succès', 
                        'success'
                    );
                    fetchInvoices();
                } catch (err) {
                    triggerDialog(
                        isRTL ? 'خطأ' : 'Erreur', 
                        isRTL ? 'فشل تحويل عرض السعر' : 'Échec de la conversion', 
                        'danger'
                    );
                }
            }
        );
    };

    const deleteInvoice = (id) => {
        triggerDialog(
            isRTL ? 'تأكيد الحذف' : 'Confirmer la suppression',
            isRTL ? 'هل أنت متأكد من حذف هذه الفاتورة نهائياً؟' : 'Êtes-vous sûr de vouloir supprimer cette facture définitivement ?',
            'danger',
            async () => {
                try {
                    await api.delete(`/invoices/${id}`);
                    fetchInvoices();
                    triggerDialog(
                        isRTL ? 'تم الحذف' : 'Supprimé', 
                        isRTL ? 'تم حذف الفاتورة بنجاح' : 'Facture supprimée avec succès', 
                        'success'
                    );
                } catch (err) {
                    console.error(err);
                    triggerDialog(
                        isRTL ? 'خطأ' : 'Erreur', 
                        isRTL ? 'فشل حذف الفاتورة' : 'Échec de la suppression', 
                        'warning'
                    );
                }
            }
        );
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'QUOTATION': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'SALE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'PURCHASE': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const handlePrint = (inv) => {
        setSelectedInvoice(inv);
        setIsPrinting(true);
        // Give React time to re-render with invoice data before printing
        setTimeout(() => {
            window.print();
            // Reset after print dialog closes
            setTimeout(() => {
                setIsPrinting(false);
            }, 500);
        }, 600);
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* ─── PRINT TEMPLATE (Statement Style) ─── */}
            <div id="print-area" className={`${isPrinting ? 'block' : 'hidden'} print:block bg-white p-0 text-slate-900`} dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: "'Cairo', sans-serif" }}>
                {selectedInvoice && (
                    <>
                    <table className="w-full">
                        <tbody>
                            <tr>
                                <td>
                                    <div className="max-w-[210mm] mx-auto bg-white px-12 pt-3 pb-8 flex flex-col">
                        {/* 1. Brand & Store Header (Statement Style) */}
                        <div className="mb-4 border-b-2 border-slate-900 pb-4">
                            {/* Top row: Very small app branding */}
                            <div className={`flex items-center gap-1.5 mb-2 text-[8px] font-bold text-emerald-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <img src="/Raed.png" alt="App Logo" className="w-3.5 h-3.5 opacity-80" />
                                <span>{isRTL ? 'رائد المحاسبي • Raid Comptabilité' : 'Raid Comptabilité'}</span>
                            </div>

                            <div className="flex justify-between items-start">
                                {/* Left: Institution Info & Logo */}
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden p-1">
                                        {settings?.store?.logo ? (
                                            <img src={settings.store.logo} alt="Logo" className="w-full h-full object-contain" />
                                        ) : (
                                            <span className="text-[9px] text-slate-400 text-center font-bold">{isRTL ? 'شعار المؤسسة' : 'Logo de l\'Institution'}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                            {settings?.store?.name || 'RAID SYSTEM'}
                                        </h1>
                                        <div className="flex flex-col text-[9px] font-bold text-slate-600 uppercase tracking-tight">
                                            {settings?.store?.address && <span>{isRTL ? 'العنوان: ' : 'Address: '}{settings.store.address}</span>}
                                            {settings?.store?.phone && <span>{isRTL ? 'الهاتف: ' : 'Tel: '}{settings.store.phone}</span>}
                                            {settings?.store?.email && <span>{isRTL ? 'الإيميل: ' : 'Email: '}{settings.store.email}</span>}
                                            {settings?.store?.taxId && <span className="mt-1 text-slate-900">{isRTL ? 'الرقم الضريبي: ' : 'Tax ID: '}{settings.store.taxId}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Invoice Title & Meta */}
                                <div className="flex flex-col items-end gap-3">
                                    <h2 className="text-3xl font-black text-emerald-700 uppercase tracking-widest leading-none">
                                        {t(selectedInvoice.type.toLowerCase())}
                                    </h2>
                                    <div className="text-right space-y-0.5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {selectedInvoice.type === 'QUOTATION' ? t('quotation_number') : t('invoice_number')}
                                        </p>
                                        <p className="text-lg font-black text-slate-900">#{selectedInvoice.invoiceNo.split('-')[1] || selectedInvoice.invoiceNo}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Customer & Date Meta (Statement Style) */}
                        <div className="flex justify-between items-start mb-12">
                            <div className="flex flex-col border border-slate-300 w-full max-w-[50%]">
                                <div className="bg-emerald-700 text-white font-bold text-[11px] px-3 py-1.5 uppercase tracking-wider">
                                    {selectedInvoice.supplier ? t('supplier_label') : t('customer_label')}
                                </div>
                                <div className="p-3 text-[11px] font-bold text-slate-800 leading-relaxed">
                                    <p className="text-sm font-black mb-1">{selectedInvoice.customer?.name || selectedInvoice.supplier?.name || t('cash_customer')}</p>
                                    {(selectedInvoice.customer?.phone || selectedInvoice.supplier?.phone) && <p dir="ltr">{selectedInvoice.customer?.phone || selectedInvoice.supplier?.phone}</p>}
                                    {selectedInvoice.isDebt && (
                                        <div className="mt-2 inline-flex items-center gap-2 px-2 py-0.5 bg-red-50 text-red-500 rounded text-[9px] font-black uppercase border border-red-100">
                                            {t('debt')}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                    {selectedInvoice.type === 'QUOTATION' ? t('quotation_date') : t('invoice_date')}
                                </p>
                                <p className="text-base font-black text-slate-900">{fmtDate(selectedInvoice.createdAt)}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{fmtTime(selectedInvoice.createdAt)}</p>
                            </div>
                        </div>

                        {/* 3. Items Table */}
                        <div className="w-full">
                            <table className="w-full border-collapse border border-slate-900">
                                <thead>
                                    <tr className="bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-900 border-b border-slate-900">
                                        <th className={`py-4 px-4 border-r border-slate-900 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'البيان / المنتج' : 'Description'}</th>
                                        <th className="py-4 px-4 text-center w-24 border-r border-slate-900">{isRTL ? 'الكمية' : 'Qté'}</th>
                                        <th className={`py-4 px-4 border-r border-slate-900 w-32 ${isRTL ? 'text-left' : 'text-right'}`}>{isRTL ? 'السعر' : 'Prix'}</th>
                                        <th className={`py-4 px-4 w-40 ${isRTL ? 'text-left' : 'text-right'}`}>{isRTL ? 'الإجمالي' : 'Total'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedInvoice.items?.map((item, idx) => (
                                        <tr key={idx} className="border-b border-slate-300">
                                            <td className={`py-4 px-4 font-bold text-sm text-slate-700 border-r border-slate-300 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                {item.product?.name}
                                            </td>
                                            <td className="py-4 px-4 text-center font-black text-xs text-slate-500 border-r border-slate-300">
                                                {item.qty}
                                            </td>
                                            <td className={`py-4 px-4 font-bold text-slate-500 text-sm border-r border-slate-300 ${isRTL ? 'text-left' : 'text-right'}`}>
                                                {fmtNumber(item.price)}
                                            </td>
                                            <td className={`py-4 px-4 font-black text-slate-900 text-sm ${isRTL ? 'text-left' : 'text-right'}`}>
                                                {fmtNumber(item.total)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 4. Summary */}
                        {(() => {
                            const subTotal = selectedInvoice.totalAmount || 0;
                            const taxAmt = selectedInvoice.taxAmount || 0;
                            const rate = selectedInvoice.taxRate || 0;
                            const grandTotal = selectedInvoice.finalAmount || subTotal;
                            return (
                                <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-end gap-8">
                                    {/* Left: Amount in Words + Signature */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-slate-700 mb-6 leading-relaxed italic border-l-2 border-emerald-600 pl-3">
                                            {formatInvoiceTotalWords(grandTotal, isRTL, settings?.store?.currency, selectedInvoice.type)}
                                        </p>
                                        <div className="mt-16">
                                            <div className="border-t border-slate-300 w-44 pt-2">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {isRTL ? 'توقيع المستلم والاعتماد' : 'Signature & Approbation'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Tax Breakdown + Total */}
                                    <div className="w-64 shrink-0">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                                                <span>{isRTL ? 'المجموع الفرعي (HT)' : 'Sous-total HT'}</span>
                                                <span>{fmtNumber(subTotal)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                                                <span>{isRTL ? `ض.ق.م (TVA ${rate}%)` : `TVA (${rate}%)`}</span>
                                                <span>{fmtNumber(taxAmt)}</span>
                                            </div>
                                            <div className="h-px bg-slate-200 w-full my-1" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                                                    {isRTL ? 'الإجمالي (TTC)' : 'TOTAL TTC'}
                                                </span>
                                                <div className="text-right">
                                                    <span className="text-xl font-black text-slate-900">{fmtNumber(grandTotal)}</span>
                                                    <span className="text-[9px] font-black text-slate-400 ml-1">{settings?.store?.currency || 'MRU'}</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 bg-slate-900 w-full rounded-sm" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Footer */}
                        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                            <p className="text-[7px] font-black text-slate-300 uppercase tracking-[0.3em]">
                                {settings?.store?.name || 'RAID SYSTEM'} • {new Date().getFullYear()} • {isRTL ? 'مشغل بواسطة RAID CORE' : 'PROPULSÉ PAR RAID CORE'}
                            </p>
                        </div>

                    </div>
                </td>
            </tr>
        </tbody>
    </table>
    </>
                )}
            </div>

            {/* ─── MAIN CONTENT (Hidden during print) ─── */}
            <div className="print:hidden space-y-8">
                {/* ─── INVOICE LIST VIEW ─── */}
                <div className="space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                            <h1 className="text-3xl font-black text-[var(--text-main)] mb-2 flex items-center gap-3">
                                <Receipt className="text-primary" size={32} />
                                {t('manage_invoices')}
                            </h1>
                            <p className="text-[var(--text-muted)] font-bold">{isRTL ? 'إدارة ومتابعة جميع الفواتير وعروض الأسعار' : 'Gérer et suivre toutes les factures et devis'}</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button 
                                onClick={() => handleCreateNew('QUOTATION')}
                                className="px-6 py-3 bg-amber-500/10 text-amber-500 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-amber-500 hover:text-white transition-all border border-amber-500/20"
                            >
                                <FileText size={18} /> {t('quotation')}
                            </button>
                            <button 
                                onClick={() => handleCreateNew('SALE')}
                                className="px-6 py-3 bg-emerald-500/10 text-emerald-500 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                            >
                                <CreditCard size={18} /> {t('debt_sale')}
                            </button>
                            <button 
                                onClick={() => handleCreateNew('PURCHASE')}
                                className="px-6 py-3 bg-blue-500/10 text-blue-500 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20"
                            >
                                <PackagePlus size={18} /> {t('purchase')}
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border-color)] shadow-sm flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 group">
                            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-[var(--text-faint)] group-focus-within:text-primary transition-colors`} size={20} />
                            <input 
                                type="text" 
                                placeholder={t('search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchInvoices()}
                                className={`w-full h-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-sm font-bold text-[var(--text-main)] focus:outline-none focus:border-primary/50 transition-all placeholder:text-[var(--text-faint)]`}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                                <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl gap-1 border border-[var(--border-color)]">
                                {['ALL', 'SALE', 'QUOTATION', 'PURCHASE'].map(tkey => (
                                    <button
                                        key={tkey}
                                        onClick={() => { setFilterType(tkey); }}
                                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${filterType === tkey ? 'bg-primary text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                    >
                                        {tkey === 'ALL' ? t('all_types') : t(tkey.toLowerCase())}
                                    </button>
                                ))}
                                </div>
                                <button onClick={fetchInvoices} className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all border border-primary/20">
                                <Filter size={20} />
                                </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-[var(--card-bg)] rounded-[2rem] border border-[var(--border-color)] shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead className="bg-[var(--bg-secondary)]">
                                    <tr className={`text-[11px] uppercase tracking-widest font-black text-[var(--text-muted)] border-b border-[var(--border-color)] ${isRTL ? '' : 'text-left'}`}>
                                        <th className="px-8 py-5">{isRTL ? 'رقم الفاتورة' : 'Invoice #'}</th>
                                        <th className="px-8 py-5">{isRTL ? 'النوع' : 'Type'}</th>
                                        <th className="px-8 py-5">{isRTL ? 'العميل / المورد' : 'Entity'}</th>
                                        <th className="px-8 py-5">{isRTL ? 'التاريخ' : 'Date'}</th>
                                        <th className="px-8 py-5 text-center">{isRTL ? 'الأصناف' : 'Items'}</th>
                                        <th className="px-8 py-5">{isRTL ? 'المبلغ الإجمالي' : 'Total'}</th>
                                        <th className="px-8 py-5 text-center">{isRTL ? 'إجراءات' : 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {invoices.map(inv => (
                                        <tr key={inv.id} className="hover:bg-[var(--bg-secondary)] transition-colors group">
                                            <td className="px-8 py-5 font-black text-sm text-[var(--text-main)]">#{inv.invoiceNo.split('-')[1] || inv.invoiceNo}</td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1.5 rounded-lg text-xs font-black border uppercase tracking-widest flex items-center justify-center gap-2 w-fit ${getTypeColor(inv.type)}`}>
                                                    {inv.type === 'SALE' && <CreditCard size={14} />}
                                                    {inv.type === 'QUOTATION' && <FileText size={14} />}
                                                    {inv.type === 'PURCHASE' && <PackagePlus size={14} />}
                                                    {t(inv.type.toLowerCase())}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 font-bold text-[var(--text-muted)]">
                                                {inv.customer?.name || inv.supplier?.name || t('cash_customer')}
                                            </td>
                                            <td className="px-8 py-5 text-xs font-bold text-[var(--text-faint)]">
                                                <div className="flex flex-col">
                                                    <span>{fmtDate(inv.createdAt)}</span>
                                                    <span className="opacity-50">{fmtTime(inv.createdAt)}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="px-2 py-1 bg-[var(--bg-secondary)] rounded-lg font-black text-[10px] text-[var(--text-muted)] border border-[var(--border-color)]">
                                                    {inv.items?.length || 0}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="font-black text-primary text-lg">
                                                    {fmtNumber(inv.finalAmount)}
                                                    <span className="text-xs ml-1 text-[var(--text-muted)] opacity-80">MRU</span>
                                                </div>
                                                {inv.isDebt && (
                                                    <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1">
                                                        {t('debt')}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex justify-center items-center gap-2">
                                                    {inv.type === 'QUOTATION' && (
                                                        <button 
                                                            onClick={() => convertQuoteToSale(inv.id)}
                                                            className="p-2 text-emerald-500 bg-emerald-500/10 rounded-lg hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                                                            title={t('convert_to_sale')}
                                                        >
                                                            <ArrowRightCircle size={18} />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handlePrint(inv)} 
                                                        className="p-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm group/print" 
                                                        title={t('print_invoice')}
                                                    >
                                                        <Printer size={18} className="group-hover/print:scale-110 transition-transform" />
                                                    </button>
                                                    <button 
                                                        onClick={() => startEditing(inv)}
                                                        className="p-2 text-amber-600 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm group/edit"
                                                        title={isRTL ? 'تعديل' : 'Modifier'}
                                                    >
                                                        <Edit3 size={18} className="group-hover/edit:scale-110 transition-transform" />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedInvoice(inv);
                                                            triggerDialog(
                                                                isRTL ? 'تصدير PDF' : 'Exporter PDF',
                                                                isRTL ? 'سيتم فتح الفاتورة في نافذة جديدة للطباعة كـ PDF' : 'La facture s\'ouvrira dans une nouvelle fenêtre pour impression en PDF',
                                                                'info',
                                                                () => handlePrint(inv)
                                                            );
                                                        }}
                                                        className="p-2 text-blue-500 bg-blue-500/10 rounded-lg hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20"
                                                        title={isRTL ? 'تصدير' : 'Exporter'}
                                                    >
                                                        <FileDown size={18} />
                                                    </button>
                                                    <button onClick={() => deleteInvoice(inv.id)} className="p-2 text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 border border-red-500/20">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {invoices.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan="7" className="py-20 text-center opacity-40 font-black text-[var(--text-faint)]">
                                                <History size={48} className="mx-auto mb-4" />
                                                {t('no_transactions')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* ─── INVOICE CREATION MODAL ─── */}
                <RaidModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    title={editingInvoiceId ? t('edit_invoice') : t('create_new_invoice')}
                    maxWidth="max-w-7xl"
                >
                    <div className="space-y-8">
                        <div className="flex justify-between items-center bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-color)]">
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${getTypeColor(activeTab)}`}>
                                    {t(activeTab.toLowerCase())}
                                </span>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-[var(--text-faint)] uppercase tracking-widest mb-1">{t('warehouse')}</span>
                                    <select 
                                        className="h-10 px-4 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-main)] focus:outline-none focus:border-primary/50"
                                        value={selectedWarehouseId}
                                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                    >
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className={`flex flex-col lg:flex-row gap-8 ${isRTL ? '' : 'lg:flex-row-reverse'}`}>
                            {/* Catalog */}
                            <div className="flex-1 p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm overflow-hidden min-h-[500px]">
                                <div className="relative mb-6 group">
                                    <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-[var(--text-faint)]`} size={20} />
                                    <input 
                                        type="text" 
                                        className={`w-full h-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} text-sm font-bold text-[var(--text-main)] outline-none focus:border-primary/40 placeholder:text-[var(--text-faint)]`}
                                        placeholder={t('search_placeholder')}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scroll">
                                    {products.filter(p => !searchQuery || p.name.includes(searchQuery)).map(product => (
                                        <button 
                                            key={product.id}
                                            onClick={() => addToCart(product)}
                                            className={`flex flex-col p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--surface-1)] hover:border-primary/30 transition-all group ${isRTL ? 'text-right' : 'text-left'}`}
                                        >
                                            <div className="font-extrabold text-[var(--text-main)] mb-1 group-hover:text-primary transition-colors text-sm truncate">{product.name}</div>
                                            <div className="text-[10px] font-bold text-[var(--text-faint)] mb-2">{product.barcode || '-'}</div>
                                            <div className="flex justify-between items-center w-full mt-auto">
                                                <div className="text-sm font-black text-primary">
                                                    {fmtNumber(activeTab === 'PURCHASE' ? product.buyPrice : product.sellPrice)}
                                                </div>
                                                <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${product.stockQty <= 5 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border-color)]'}`}>
                                                    {product.stockQty}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cart Sidebar */}
                            <div className="lg:w-[400px] space-y-6">
                                <div className="p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm flex flex-col min-h-[500px]">
                                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-color)]">
                                        <h3 className="text-lg font-black text-[var(--text-main)]">{activeTab === 'PURCHASE' ? t('purchase') : t('invoice')}</h3>
                                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg font-black text-[10px]">{cart.length} {t('items')}</span>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        <label className="text-[10px] font-black uppercase text-[var(--text-faint)] tracking-widest">{activeTab === 'PURCHASE' ? t('suppliers') : t('customers')}</label>
                                        {activeTab === 'PURCHASE' ? (
                                            <select 
                                                value={supplierId}
                                                onChange={(e) => setSupplierId(e.target.value)}
                                                className="w-full h-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 text-sm font-bold text-[var(--text-main)] focus:outline-none"
                                            >
                                                <option value="">{isRTL ? 'إختر المورد...' : 'Choisir fournisseur...'}</option>
                                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        ) : (
                                            <div className="space-y-2">
                                                <select 
                                                    value={customerId}
                                                    onChange={(e) => {
                                                        setCustomerId(e.target.value);
                                                        const c = customers.find(x => x.id === e.target.value);
                                                        setCustomerName(c ? c.name : t('cash_customer'));
                                                    }}
                                                    className="w-full h-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 text-sm font-bold text-[var(--text-main)] focus:outline-none"
                                                >
                                                    <option value="">{isRTL ? 'عميل نقدي' : 'Client Comptant'}</option>
                                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                                <label className="flex items-center gap-2 cursor-pointer pt-1 px-1">
                                                    <input type="checkbox" checked={isDebt} onChange={(e) => setIsDebt(e.target.checked)} className="w-4 h-4 rounded border-[var(--border-color)] bg-[var(--bg-secondary)] text-primary" />
                                                    <span className="text-xs font-bold text-[var(--text-muted)]">{t('debt')}</span>
                                                </label>
                                                <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-[var(--border-color)]">
                                                    <label className="text-[10px] font-black uppercase text-[var(--text-faint)] tracking-widest">{t('tax_rate')}</label>
                                                    <div className="relative">
                                                        <input 
                                                            type="number" 
                                                            value={taxRate}
                                                            onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                                            className="w-full h-11 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 text-sm font-bold text-[var(--text-main)] focus:outline-none focus:border-primary/50"
                                                        />
                                                        <span className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-xs font-black text-[var(--text-faint)]`}>%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="overflow-y-auto space-y-2 mb-6 custom-scroll">
                                        {cart.map(item => (
                                            <div key={item.id} className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl flex items-center justify-between">
                                                <div className="w-full min-w-0">
                                                    <div className="text-xs font-black text-[var(--text-main)] truncate">{item.name}</div>
                                                    <div className="text-[10px] font-bold text-[var(--text-faint)]">{fmtNumber(activeTab === 'PURCHASE' ? item.buyPrice : item.sellPrice)}</div>
                                                </div>
                                                <div className="flex items-center gap-2 ml-4">
                                                    <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:text-primary text-[var(--text-faint)]"><Minus size={12} strokeWidth={3} /></button>
                                                    <span className="w-4 text-center font-black text-xs text-[var(--text-main)]">{item.qty}</span>
                                                    <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:text-primary text-[var(--text-faint)]"><Plus size={12} strokeWidth={3} /></button>
                                                    <button onClick={() => removeFromCart(item.id)} className="ml-2 text-red-500/70 hover:text-red-500 transition-colors"><X size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-4 border-t border-[var(--border-color)] space-y-2">
                                        <div className="flex justify-between items-center text-xs font-bold text-[var(--text-faint)]">
                                            <span>{isRTL ? 'المجموع الفرعي' : 'Sous-total'}</span>
                                            <span>{fmtNumber(calculateTotal())}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-bold text-emerald-500">
                                            <span>{t('tax_rate')} ({taxRate}%)</span>
                                            <span>{fmtNumber(calculateTotal() * (taxRate / 100))}</span>
                                        </div>
                                        <div className="flex justify-between items-end pt-2 border-t border-[var(--border-color)]">
                                            <div>
                                                <div className="text-[10px] font-black text-[var(--text-faint)] uppercase">{t('total_net')}</div>
                                                <div className="text-2xl font-black text-[var(--text-main)]">{fmtNumber(calculateTotal() * (1 + taxRate / 100))} <span className="text-xs">MRU</span></div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                disabled={cart.length === 0 || saving}
                                                onClick={handleSaveInvoice}
                                                className={`flex-1 py-5 rounded-2xl font-black text-lg shadow-lg transition-all flex items-center justify-center gap-3 ${
                                                    cart.length === 0 || saving 
                                                    ? 'bg-[var(--bg-secondary)] text-[var(--text-faint)] cursor-not-allowed border border-[var(--border-color)]' 
                                                    : editingInvoiceId 
                                                        ? 'bg-amber-500 text-white hover:bg-amber-600 hover:-translate-y-1'
                                                        : 'bg-primary text-white hover:bg-primary-dark hover:-translate-y-1 shadow-primary/30'
                                                }`}
                                            >
                                                {saving ? <RefreshCw size={18} className="animate-spin" /> : (editingInvoiceId ? <Edit3 size={18} /> : <Save size={18} />)}
                                                {editingInvoiceId ? (isRTL ? 'تحديث' : 'Mettre à jour') : t('save')}
                                            </button>
                                            {editingInvoiceId && (
                                                <button
                                                    onClick={cancelEditing}
                                                    className="py-5 px-6 rounded-2xl font-black text-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                                                >
                                                    {isRTL ? 'إلغاء' : 'Annuler'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
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
        </div>
    );
}

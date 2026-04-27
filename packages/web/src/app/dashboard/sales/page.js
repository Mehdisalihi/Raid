'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import {
    ShoppingCart, Search, TrendingUp, Filter, Calendar,
    CreditCard, Plus, ChevronDown, Package, Hash, DollarSign,
    Trash2, RefreshCw, ArrowUpRight, Barcode, Layers, Tag
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import RaidDialog from '@/components/RaidDialog';

export default function DailySalesPage() {
    const { t, isRTL, fmtNumber, fmtDate } = useLanguage();

    // ─── State ───────────────────────────────────────────────
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [sales, setSales] = useState([]);
    const [totalSales, setTotalSales] = useState(0);

    // Filter
    const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [filterPayment, setFilterPayment] = useState('all');
    const [historySearch, setHistorySearch] = useState('');

    // Form
    const [operationType, setOperationType] = useState('normal_sale');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productSearch, setProductSearch] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [barcode, setBarcode] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingSales, setIsLoadingSales] = useState(false);

    const [editingSaleId, setEditingSaleId] = useState(null);

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

    const dropdownRef = useRef(null);

    // ─── Effects ─────────────────────────────────────────────
    useEffect(() => {
        fetchProducts();
        fetchWarehouses();
        fetchSales(); // Initial fetch
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowProductDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ─── API Calls ───────────────────────────────────────────
    const fetchProducts = async () => {
        try {
            const { data } = await api.get('/products');
            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const { data } = await api.get('/warehouses');
            const list = Array.isArray(data) ? data : [];
            setWarehouses(list);
            if (list.length > 0 && !selectedWarehouseId) {
                setSelectedWarehouseId(list[0].id);
            }
        } catch (err) {
            console.error('Error fetching warehouses:', err);
        }
    };

    const fetchSales = async () => {
        setIsLoadingSales(true);
        try {
            console.log('Frontend: Fetching sales with:', { filterDate, filterPayment });
            const params = new URLSearchParams();
            if (filterDate) params.append('date', filterDate);
            if (filterPayment !== 'all') params.append('paymentMethod', filterPayment);
            const { data } = await api.get(`/sales?${params.toString()}`);
            const list = Array.isArray(data) ? data : (data?.sales || []);
            setSales(list);
            const total = list.reduce((sum, s) => sum + (parseFloat(s.finalAmount || s.totalAmount || 0)), 0);
            setTotalSales(total);
        } catch (err) {
            console.error('Frontend Fetch Sales Error:', err);
            setSales([]);
            setTotalSales(0);
        } finally {
            setIsLoadingSales(false);
        }
    };

    // ─── Product Selection ───────────────────────────────────
    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        setProductSearch(product.name);
        setBarcode(product.barcode || '');
        setUnitPrice(product.sellPrice || '');
        setShowProductDropdown(false);
    };

    const filteredProducts = products.filter(p =>
        p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.barcode && p.barcode.includes(productSearch))
    );

    // ─── Submit ───────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!selectedProduct) return;
        setIsSaving(true);
        try {
            const saleData = {
                customerName: isRTL ? 'عميل نقدي' : 'Client Comptant',
                cart: [{
                    id: selectedProduct.id,
                    name: selectedProduct.name,
                    qty: quantity,
                    sellPrice: parseFloat(unitPrice) || selectedProduct.sellPrice
                }],
                totalAmount: quantity * (parseFloat(unitPrice) || selectedProduct.sellPrice),
                discount: 0,
                finalAmount: quantity * (parseFloat(unitPrice) || selectedProduct.sellPrice),
                paymentMethod,
                operationType,
                warehouseId: selectedWarehouseId,
                createdAt: saleDate
            };

            if (editingSaleId) {
                await api.put(`/sales/${editingSaleId}`, saleData);
            } else {
                await api.post('/sales', saleData);
            }

            // Reset form
            setEditingSaleId(null);
            setSelectedProduct(null);
            setProductSearch('');
            setBarcode('');
            setUnitPrice('');
            setQuantity(1);
            setPaymentMethod('cash');
            fetchSales();
            triggerDialog(
                isRTL ? 'نجاح' : 'Succès', 
                isRTL ? 'تم حفظ البيانات بنجاح ✨' : 'Données enregistrées ✨', 
                'success'
            );
        } catch (err) {
            console.error('Error saving sale:', err);
            triggerDialog(isRTL ? 'خطأ' : 'Erreur', isRTL ? 'فشل حفظ البيانات' : 'Échec de l\'enregistrement', 'danger');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditSale = (sale) => {
        setEditingSaleId(sale.id);
        const item = sale.items?.[0] || {};
        const product = products.find(p => p.id === item.productId) || { name: item.productName || sale.customerName, id: item.productId, sellPrice: item.sellPrice };
        
        setSelectedProduct(product);
        setProductSearch(product.name);
        setBarcode(product.barcode || '');
        setUnitPrice(item.sellPrice || '');
        setQuantity(item.qty || 1);
        setPaymentMethod(sale.paymentMethod);
        setSelectedWarehouseId(sale.warehouseId);
        setSaleDate(new Date(sale.createdAt).toISOString().split('T')[0]);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteSale = (id) => {
        triggerDialog(
            isRTL ? 'تأكيد الحذف' : 'Confirmer la suppression',
            isRTL ? 'هل تريد حذف هذه المبيعة نهائياً؟' : 'Voulez-vous supprimer cette vente définitivement ?',
            'danger',
            async () => {
                try {
                    await api.delete(`/sales/${id}`);
                    fetchSales();
                    triggerDialog(
                        isRTL ? 'تم الحذف' : 'Supprimé', 
                        isRTL ? 'تم حذف المبيعة بنجاح' : 'Vente supprimée avec succès', 
                        'success'
                    );
                } catch (err) {
                    console.error('Error deleting sale:', err);
                    triggerDialog(
                        isRTL ? 'خطأ' : 'Erreur', 
                        isRTL ? 'فشل حذف المبيعة' : 'Échec de la suppression', 
                        'warning'
                    );
                }
            }
        );
    };

    // ─── Payment Options ──────────────────────────────────────
    const paymentOptions = [
        { value: 'cash', label: isRTL ? 'نقداً' : 'Espèces' },
        { value: 'bankily', label: 'Bankily' },
        { value: 'masrvi', label: 'Masrvi' },
        { value: 'sedad', label: 'Sedad' },
        { value: 'bimbank', label: 'Bimbank' },
        { value: 'click', label: 'Click' },
        { value: 'amanty', label: 'Amanty' },
        { value: 'gimtel', label: 'Gimtel' },
        { value: 'debt', label: isRTL ? 'دَين' : 'Crédit' },
    ];

    const operationOptions = [
        { value: 'normal_sale', label: isRTL ? 'بيع عادي' : 'Vente Normale' },
        { value: 'wholesale', label: isRTL ? 'بيع جملة' : 'Vente en Gros' },
        { value: 'return', label: isRTL ? 'مرتجع' : 'Retour' },
    ];

    const paymentLabel = (val) => paymentOptions.find(o => o.value === val)?.label || val;

    // ─── Render ───────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-6 animate-fade-in bg-slate-50 min-h-screen p-4 md:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
            
            {/* ── Header Row ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                    <TrendingUp size={16} className="text-emerald-500" />
                    <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
                        {isRTL ? 'إجمالي المبيعات:' : 'Total Sales:'} MRU {fmtNumber(totalSales)}
                    </span>
                </div>

                <h1 className="flex items-center gap-3 text-3xl font-black text-slate-900">
                    {isRTL ? 'المبيعات اليومية' : 'Daily Sales'}
                    <ShoppingCart size={32} className="text-blue-600" />
                </h1>
            </div>

            {/* ── Top Summary & Payment Breakdown ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Global Card */}
                <div className="bg-blue-600 p-6 rounded-3xl shadow-xl shadow-blue-500/20 flex items-center gap-5 text-white group hover:scale-[1.02] transition-transform">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                        <DollarSign size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] text-white/60 font-black uppercase tracking-widest mb-1">{isRTL ? 'إجمالي مبيعات اليوم' : 'Daily Total'}</p>
                        <p className="text-2xl font-black">{fmtNumber(totalSales)} <span className="text-sm opacity-70">MRU</span></p>
                    </div>
                </div>

                {/* Dynamic Payment Breakdown */}
                {['cash', 'bankily', 'masrvi'].map((method) => {
                    const methodTotal = sales
                        .filter(s => s.paymentMethod === method)
                        .reduce((sum, s) => sum + (parseFloat(s.finalAmount || s.totalAmount || 0)), 0);
                    
                    if (methodTotal === 0 && method !== 'cash') return null;

                    return (
                        <div key={method} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 group hover:scale-[1.02] transition-transform">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                                method === 'cash' ? 'bg-emerald-50 text-emerald-600' : 
                                method === 'bankily' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                            }`}>
                                {method === 'cash' ? <DollarSign size={24} /> : <CreditCard size={24} />}
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{paymentLabel(method)}</p>
                                <p className="text-xl font-black text-slate-900">{fmtNumber(methodTotal)} <span className="text-xs text-slate-400 font-bold">MRU</span></p>
                            </div>
                        </div>
                    );
                })}
            </div>


            {/* ── Filtering Section ── */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h2 className="flex items-center gap-3 text-lg font-black text-slate-800 mb-6 pb-4 border-b border-slate-50">
                    <Filter size={20} className="text-blue-500" />
                    {isRTL ? 'فلترة المبيعات' : 'Sales Filter'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Date Filter */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={14} />
                            {isRTL ? 'التاريخ' : 'Date'}
                        </label>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:bg-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                        />
                    </div>
                    {/* Payment Method Filter */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <CreditCard size={14} />
                            {isRTL ? 'طريقة الدفع' : 'Payment Method'}
                        </label>
                        <select
                            value={filterPayment}
                            onChange={(e) => setFilterPayment(e.target.value)}
                            className="w-full appearance-none bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:bg-white focus:border-blue-500/50 outline-none transition-all cursor-pointer"
                        >
                            <option value="all">{isRTL ? 'جميع طرق الدفع' : 'All Methods'}</option>
                            {paymentOptions.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                    {/* Filter Button */}
                    <div className="md:col-span-2 flex justify-end">
                        <button 
                            onClick={fetchSales}
                            disabled={isLoadingSales}
                            className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10 active:scale-95 disabled:opacity-50"
                        >
                            {isLoadingSales ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
                            {isLoadingSales ? (isRTL ? 'جاري التحميل...' : 'Loading...') : (isRTL ? 'تطبيق الفلترة' : 'Apply Filter')}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── ADD / EDIT SALE FORM SECTION ── */}
            <div className={`bg-white rounded-3xl p-8 shadow-sm border transition-all ${editingSaleId ? 'border-amber-200 ring-4 ring-amber-500/5' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                    <h2 className="flex items-center gap-3 text-lg font-black text-slate-800">
                        {editingSaleId ? (isRTL ? 'تعديل عملية بيع' : 'Edit Sale') : (isRTL ? 'إضافة مبيعات جديدة' : 'Add New Sale')}
                    </h2>
                    {editingSaleId && (
                        <button 
                            onClick={() => {
                                setEditingSaleId(null);
                                setSelectedProduct(null);
                                setProductSearch('');
                                setQuantity(1);
                            }}
                            className="text-xs font-black text-amber-600 bg-amber-50 px-4 py-2 rounded-xl hover:bg-amber-100 transition-colors"
                        >
                            {isRTL ? 'إلغاء التعديل' : 'Cancel Edit'}
                        </button>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    {/* Operation Type */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'نوع العملية' : 'Process Type'}</label>
                        <div className="relative">
                            <select
                                value={operationType}
                                onChange={(e) => setOperationType(e.target.value)}
                                className="w-full appearance-none bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                            >
                                {operationOptions.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <RefreshCw size={16} className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-6' : 'right-6'} text-slate-300 pointer-events-none`} />
                        </div>
                    </div>

                    {/* Product Search */}
                    <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'منتج' : 'Product'}</label>
                        <div className="relative">
                            <Search size={18} className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-6' : 'left-6'} text-slate-400`} />
                            <input
                                type="text"
                                value={productSearch}
                                onChange={(e) => {
                                    setProductSearch(e.target.value);
                                    setShowProductDropdown(true);
                                }}
                                onFocus={() => setShowProductDropdown(true)}
                                placeholder={isRTL ? 'ابحث عن منتج أو اكتب اسم المنتج' : 'Search for a product...'}
                                className={`w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 ${isRTL ? 'pr-14 pl-6' : 'pl-14 pr-6'} text-sm font-bold text-slate-700 outline-none focus:border-blue-500/50 transition-all`}
                            />
                            {showProductDropdown && productSearch && filteredProducts.length > 0 && (
                                <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    {filteredProducts.slice(0, 5).map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleSelectProduct(p)}
                                            className="w-full flex items-center justify-between px-6 py-4 hover:bg-blue-50 transition-colors text-sm font-bold text-slate-700 border-b border-slate-50 last:border-0"
                                        >
                                            <span>{p.name}</span>
                                            <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-lg text-xs">{fmtNumber(p.sellPrice)} MRU</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Barcode */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'رمز المنتج' : 'Product Barcode'}</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                placeholder={isRTL ? 'رمز المنتج' : 'Barcode'}
                                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 outline-none"
                            />
                            <Barcode size={18} className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-6' : 'right-6'} text-slate-300`} />
                        </div>
                    </div>

                    {/* Unit Price */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'سعر الوحدة' : 'Unit Price'}</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={unitPrice}
                                onChange={(e) => setUnitPrice(e.target.value)}
                                placeholder={isRTL ? 'سعر الوحدة' : 'Price'}
                                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 outline-none"
                            />
                            <Layers size={18} className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-6' : 'right-6'} text-slate-300`} />
                        </div>
                    </div>

                    {/* Payment Method Form */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'طريقة الدفع' : 'Payment Method'}</label>
                        <div className="relative">
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full appearance-none bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                            >
                                {paymentOptions.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <CreditCard size={18} className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-6' : 'right-6'} text-slate-300 pointer-events-none`} />
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'الكمية' : 'Quantity'}</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 outline-none"
                            />
                            <Hash size={18} className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-6' : 'right-6'} text-slate-300`} />
                        </div>
                    </div>

                    {/* Sale Date Form */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'التاريخ' : 'Date'}</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={saleDate}
                                onChange={(e) => setSaleDate(e.target.value)}
                                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 outline-none"
                            />
                            <Calendar size={18} className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-6' : 'right-6'} text-slate-300`} />
                        </div>
                    </div>

                    {/* Submit Row */}
                    <div className="md:col-span-2 flex flex-col md:flex-row items-center justify-between gap-6 pt-6 mt-4 border-t border-slate-50">
                        <div className="flex items-center gap-4 bg-blue-50/50 px-6 py-4 rounded-2xl border border-blue-100/50">
                            <span className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest">{isRTL ? 'إجمالي الفاتورة الحالية' : 'Current Total'}</span>
                            <span className="text-2xl font-black text-blue-600">MRU {fmtNumber((parseFloat(unitPrice) || 0) * quantity)}</span>
                        </div>
                        
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedProduct || isSaving}
                            className="w-full md:w-auto bg-blue-600 text-white px-16 py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-3"
                        >
                            {isSaving ? <RefreshCw className="animate-spin" size={24} /> : <Plus size={24} />}
                            {isRTL ? 'إضافة مبيعات جديدة' : 'Add Sale'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── HISTORY TABLE SECTION ── */}
            {sales.length > 0 && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                        <h2 className="text-lg font-black text-slate-800">
                            {isRTL ? 'سجل المبيعات' : 'Sales History'}
                        </h2>
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="relative">
                                <Search size={14} className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-4' : 'left-4'} text-slate-400`} />
                                <input
                                    type="text"
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    placeholder={isRTL ? 'ابحث باسم المنتج...' : 'Search product...'}
                                    className={`bg-slate-50 border border-slate-100 rounded-xl py-2 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-xs font-bold text-slate-600 outline-none focus:border-blue-500/50 transition-all`}
                                />
                            </div>
                            <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black">
                                {sales.length} {isRTL ? 'عملية' : 'Transactions'}
                            </span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className={`px-8 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'المنتجات' : 'Products'}</th>
                                    <th className="px-8 py-4 text-center">{isRTL ? 'المبلغ' : 'Amount'}</th>
                                    <th className="px-8 py-4 text-center">{isRTL ? 'طريقة الدفع' : 'Payment'}</th>
                                    <th className="px-8 py-4 text-center">{isRTL ? 'التاريخ' : 'Date'}</th>
                                    <th className="px-8 py-4 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {sales
                                    .filter(sale => {
                                        if (!historySearch) return true;
                                        return sale.items?.some(it => 
                                            (it.productName || it.name || '').toLowerCase().includes(historySearch.toLowerCase())
                                        );
                                    })
                                    .map((sale) => (
                                        <tr key={sale.id} className="hover:bg-blue-50/20 transition-colors group">
                                        <td className={`px-8 py-5 text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className="flex flex-col gap-1">
                                                {sale.items?.map((it, idx) => (
                                                    <div key={idx} className="text-sm font-black flex items-center gap-2">
                                                        <span className="text-slate-800">{it.product?.name || it.productName || it.name}</span>
                                                        <span className="text-blue-600 font-black text-xs bg-blue-50 px-2 py-0.5 rounded-lg">× {it.qty || 1}</span>
                                                    </div>
                                                )) || <span className="text-slate-400">---</span>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center font-black text-blue-600 text-lg">
                                            {fmtNumber(sale.finalAmount || sale.totalAmount)} <span className="text-[10px] text-slate-400">MRU</span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="px-4 py-1.5 bg-white border border-slate-100 rounded-xl text-xs font-black text-slate-500 shadow-sm">
                                                {paymentLabel(sale.paymentMethod)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center text-xs font-bold text-slate-400">
                                            {fmtDate(sale.createdAt)}
                                        </td>
                                        <td className="px-8 py-5 text-center flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEditSale(sale)}
                                                className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                            >
                                                <RefreshCw size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSale(sale.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {sales.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 opacity-40 gap-3">
                    <ShoppingCart size={40} className="text-[var(--text-muted)]" />
                    <p className="text-sm font-bold text-[var(--text-muted)]">
                        {isRTL ? 'لا توجد مبيعات لهذا اليوم' : 'Aucune vente pour cette journée'}
                    </p>
                </div>
            )}

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

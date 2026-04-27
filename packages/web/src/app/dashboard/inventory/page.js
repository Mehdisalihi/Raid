'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    Search, Filter, Package, Building2,
    Calendar, User, ChevronDown, Download,
    Printer, Info, Settings
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import Link from 'next/link';

export default function InventoryPage() {
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const { t, isRTL, fmtNumber, fmtDate } = useLanguage();

    useEffect(() => {
        fetchWarehouses();
    }, []);

    useEffect(() => {
        if (activeTab) {
            fetchProducts(activeTab);
        }
    }, [activeTab]);

    const fetchWarehouses = async () => {
        try {
            const res = await api.get('/warehouses');
            const data = Array.isArray(res.data) ? res.data : [];
            setWarehouses(data);
            if (data.length > 0 && !activeTab) {
                setActiveTab(data[0].id);
            }
        } catch (err) {
            console.error('Error fetching warehouses:', err);
        }
    };

    const fetchProducts = async (whId) => {
        setLoading(true);
        try {
            const res = await api.get(`/products?warehouseId=${whId}`);
            setProducts(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filter products (currently this assumes all products are in one warehouse or we just show them all for demonstration if specific warehouse stock isn't fully implemented in the backend yet)
    // To properly filter by warehouse, products should have a warehouse mapping or we use the warehouseId
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
    });

    const activeWarehouse = warehouses.find(w => w.id === activeTab);

    // Calculate Stats for the active warehouse (or all visible products)
    const totalProducts = filteredProducts.length;
    const availableProducts = filteredProducts.filter(p => p.stockQty > (p.minStockAlert || 0)).length;
    const lowStockProducts = filteredProducts.filter(p => p.stockQty <= (p.minStockAlert || 0) && p.stockQty > 0).length;
    const outOfStockProducts = filteredProducts.filter(p => p.stockQty <= 0).length;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 animate-fade-up bg-[var(--background)] min-h-[85vh] pb-10">
            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{isRTL ? 'المخزون' : 'Inventaire'}</h1>
                </div>
                <Link href="/dashboard/warehouses" className="btn-secondary bg-[var(--surface-1)] border border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] flex items-center gap-2 px-6 h-12 rounded-2xl shadow-sm transition-all font-bold">
                    <Settings size={18} />
                    <span>{isRTL ? 'إدارة المخازن' : 'Gérer les magasins'}</span>
                </Link>
            </div>

            {/* Tabs */}
            {warehouses.length > 0 && (
                <div className="flex overflow-x-auto hide-scrollbar gap-2 bg-[var(--surface-1)] p-1.5 rounded-2xl border border-[var(--glass-border)] shadow-sm">
                    {warehouses.map(w => (
                        <button
                            key={w.id}
                            onClick={() => setActiveTab(w.id)}
                            className={`flex-1 min-w-[150px] h-12 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-transparent
                                ${activeTab === w.id 
                                    ? 'bg-[var(--card-bg)] shadow-md text-primary border-[var(--glass-border)]' 
                                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'}`}
                        >
                            <Building2 size={16} />
                            <span className="truncate">{w.name}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Warehouse Content Toolbar & Stats */}
            <div className="card-premium bg-[var(--surface-1)] border border-[var(--glass-border)] rounded-[2rem] shadow-sm p-6 space-y-6">
                
                {/* inner toolbar */}
                <div className={`flex flex-col md:flex-row justify-between items-center gap-4 pb-6 border-b border-[var(--glass-border)] ${isRTL ? '' : 'flex-row-reverse'}`}>
                    <h2 className="text-xl font-black flexitems-center gap-2 text-[var(--text-primary)]">
                        {activeWarehouse?.name || (isRTL ? 'المخزن الرئيسي' : 'Magasin principal')}
                    </h2>
                    <div className="flex gap-3">
                        <button className="h-10 px-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-2)] text-[var(--text-primary)] font-bold text-xs flex items-center gap-2 hover:bg-[var(--surface-1)] transition-all shadow-sm">
                            <Download size={16} />
                            <span>Excel {isRTL ? 'تصدير' : 'Exporter'}</span>
                        </button>
                        <button onClick={handlePrint} className="h-10 px-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-2)] text-[var(--text-primary)] font-bold text-xs flex items-center gap-2 hover:bg-[var(--surface-1)] transition-all shadow-sm">
                            <Printer size={16} />
                            <span>{isRTL ? 'طباعة' : 'Imprimer'}</span>
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className={`flex flex-col md:flex-row gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                     <div className="relative flex-1 group">
                        <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-[var(--text-faint)] group-focus-within:text-primary transition-colors`} size={18} />
                        <input
                            type="text"
                            placeholder={isRTL ? "...البحث في المخزون" : "Rechercher dans le stock..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl h-12 ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} text-sm font-bold focus:outline-none focus:border-primary/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-primary)] placeholder:text-[var(--text-faint)]`}
                        />
                    </div>
                    <div className="relative min-w-[200px]">
                        <select 
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className={`w-full h-12 bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl ${isRTL ? 'pr-4 pl-10 text-right' : 'pl-4 pr-10 text-left'} text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:border-primary/40 text-[var(--text-primary)]`}
                        >
                            <option value="ALL">{isRTL ? 'جميع المنتجات' : 'Tous les produits'}</option>
                            <option value="AVAILABLE">{isRTL ? 'متوفر' : 'Disponible'}</option>
                            <option value="LOW">{isRTL ? 'منخفض' : 'Stock bas'}</option>
                            <option value="OUT">{isRTL ? 'نفد' : 'Rupture'}</option>
                        </select>
                        <ChevronDown size={16} className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-[--text-muted] pointer-events-none`} />
                    </div>
                </div>

                {/* Stat Cards Row */}
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${isRTL ? '' : 'direction-ltr'}`}>
                    <StatBox 
                        title={isRTL ? 'إجمالي المنتجات' : 'Total Produits'} 
                        value={totalProducts} 
                        colorClass="bg-blue-500/10 border-blue-500/20 text-blue-500" 
                        isRTL={isRTL} 
                    />
                    <StatBox 
                        title={isRTL ? 'المنتجات المتوفرة' : 'Produits Disponibles'} 
                        value={availableProducts} 
                        colorClass="bg-green-500/10 border-green-500/20 text-green-500" 
                        isRTL={isRTL} 
                    />
                    <StatBox 
                        title={isRTL ? 'المخزون المنخفض' : 'Stock Bas'} 
                        value={lowStockProducts} 
                        colorClass="bg-amber-500/10 border-amber-500/20 text-amber-500" 
                        isRTL={isRTL} 
                    />
                    <StatBox 
                        title={isRTL ? 'نفدت الكمية' : 'Rupture de Stock'} 
                        value={outOfStockProducts} 
                        colorClass="bg-red-500/10 border-red-500/20 text-red-500" 
                        isRTL={isRTL} 
                    />
                </div>
            </div>

            {/* Table */}
            <div className="card-premium rounded-[2rem] overflow-hidden border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-sm overflow-x-auto">
                <table className="w-full border-collapse whitespace-nowrap">
                    <thead>
                        <tr className={`bg-[var(--surface-1)] border-b border-[var(--glass-border)] ${isRTL ? '' : 'text-left'}`}>
                            <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-[var(--text-faint)]">
                                {isRTL ? 'حالة المخزون' : 'État'}
                            </th>
                            <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-[var(--text-faint)]">
                                {isRTL ? 'الحد الأدنى' : 'Min'}
                            </th>
                            <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-[var(--text-faint)]">
                                {isRTL ? 'القيمة الإجمالية' : 'Val. Totale'}
                            </th>
                            <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-[var(--text-faint)]">
                                {isRTL ? 'الكمية' : 'Qté'}
                            </th>
                            <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-[var(--text-faint)]">
                                {isRTL ? 'الربح' : 'Bénéfice'}
                            </th>
                            <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-[var(--text-faint)]">
                                {isRTL ? 'سعر البيع' : 'P. Vente'}
                            </th>
                            <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-[var(--text-faint)]">
                                {isRTL ? 'سعر الشراء' : 'P. Achat'}
                            </th>
                            <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-[var(--text-faint)]">
                                {isRTL ? 'اسم المنتج' : 'Nom Produit'}
                            </th>
                            <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-[var(--text-faint)]">
                                {isRTL ? 'رمز المنتج' : 'Code'}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--glass-border)]">
                        {loading ? (
                            <tr>
                                <td colSpan="9" className="p-12 text-center text-[--text-muted] font-bold">
                                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                                    {isRTL ? 'جاري التحميل...' : 'Chargement...'}
                                </td>
                            </tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="p-12 text-center text-[--text-muted] font-bold bg-[var(--surface-1)]">
                                    <Package size={48} className="mx-auto mb-4 opacity-50" />
                                    {isRTL ? 'لا توجد منتجات في المخزون' : 'Aucun produit dans le stock'}
                                </td>
                            </tr>
                        ) : (
                            filteredProducts.map(product => {
                                const profit = product.sellPrice - product.buyPrice;
                                const totalValue = product.stockQty * product.buyPrice;
                                const minAlert = product.minStockAlert || 0;
                                
                                let statusObj = { label: isRTL ? 'متوفر' : 'Disponible', bg: 'bg-green-500/10', text: 'text-green-500' };
                                if (product.stockQty <= 0) {
                                    statusObj = { label: isRTL ? 'نفد' : 'Rupture', bg: 'bg-red-500/10', text: 'text-red-500' };
                                } else if (product.stockQty <= minAlert) {
                                    statusObj = { label: isRTL ? 'منخفض' : 'Bas', bg: 'bg-amber-500/10', text: 'text-amber-500' };
                                }

                                return (
                                    <tr key={product.id} className={`hover:bg-[var(--surface-2)] transition-colors ${isRTL ? 'text-right' : 'text-left'}`}>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase ${statusObj.bg} ${statusObj.text}`}>
                                                {statusObj.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-[var(--text-muted)]">{minAlert}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-[var(--text-main)]">{fmtNumber(totalValue)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-lg text-primary">{product.stockQty}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-green-500">+{fmtNumber(profit)}</div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-[var(--text-muted)]">{fmtNumber(product.sellPrice)}</td>
                                        <td className="px-6 py-4 font-bold text-[var(--text-faint)]">{fmtNumber(product.buyPrice)}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-sm text-[var(--text-primary)]">{product.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono font-bold text-[--text-muted]">
                                            {product.barcode || '-'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Print View Hidden */}
            <div className="hidden print:block bg-white text-black p-8 font-sans" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: "'Cairo', sans-serif" }}>
                <div className="text-center mb-8 pb-6 border-b-2 border-slate-200">
                    <h1 className="text-3xl font-black mb-2 uppercase">{isRTL ? 'جرد المخزون' : 'INVENTAIRE DU STOCK'}</h1>
                    <h2 className="text-xl font-bold text-slate-600">{activeWarehouse?.name || ''}</h2>
                    <p className="text-sm mt-2 opacity-60 font-bold">{fmtDate(new Date())}</p>
                </div>
                
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-100 border-black border-y-2">
                            <th className={`p-3 uppercase text-xs font-black ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'رمز المنتج' : 'Code'}</th>
                            <th className={`p-3 uppercase text-xs font-black ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'اسم المنتج' : 'Nom Produit'}</th>
                            <th className={`p-3 uppercase text-xs font-black ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'سعر الشراء' : 'PA'}</th>
                            <th className={`p-3 uppercase text-xs font-black ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'سعر البيع' : 'PV'}</th>
                            <th className={`p-3 uppercase text-xs font-black text-center`}>{isRTL ? 'الكمية' : 'Qté'}</th>
                            <th className={`p-3 uppercase text-xs font-black text-center`}>{isRTL ? 'الحد الأدنى' : 'Min'}</th>
                            <th className={`p-3 uppercase text-xs font-black ${isRTL ? 'text-left' : 'text-right'}`}>{isRTL ? 'إجمالي التكلفة' : 'Val. Totale'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(p => (
                            <tr key={p.id} className="border-b border-slate-200">
                                <td className={`p-3 font-mono text-xs ${isRTL ? 'text-right' : 'text-left'}`}>{p.barcode}</td>
                                <td className={`p-3 font-bold ${isRTL ? 'text-right' : 'text-left'}`}>{p.name}</td>
                                <td className={`p-3 ${isRTL ? 'text-right' : 'text-left'}`}>{fmtNumber(p.buyPrice)}</td>
                                <td className={`p-3 ${isRTL ? 'text-right' : 'text-left'}`}>{fmtNumber(p.sellPrice)}</td>
                                <td className="p-3 text-center font-black">{p.stockQty}</td>
                                <td className="p-3 text-center opacity-60 font-bold">{p.minStockAlert || 0}</td>
                                <td className={`p-3 font-black ${isRTL ? 'text-left' : 'text-right'}`}>{fmtNumber(p.stockQty * p.buyPrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatBox({ title, value, colorClass, isRTL }) {
    return (
        <div className={`p-5 rounded-2xl border ${colorClass} ${isRTL ? 'text-right' : 'text-left'} transition-transform hover:-translate-y-1`}>
            <div className="text-[11px] font-black uppercase tracking-widest opacity-80 mb-2">{title}</div>
            <div className="text-3xl font-black">{value}</div>
        </div>
    );
}

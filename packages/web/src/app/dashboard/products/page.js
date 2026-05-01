'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import api from '@/lib/api';
import {
    Package, Plus, Search, Edit2, Trash2, X, Save,
    AlertCircle, TrendingUp, Barcode, DollarSign,
    LayoutGrid, List, ChevronRight, ChevronDown, ArrowUpDown,
    CheckCircle2, AlertTriangle, Layers, Download, Upload, FileSpreadsheet, Printer
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import RaidDialog from '@/components/RaidDialog';
import RaidModal from '@/components/RaidModal';
import * as XLSX from 'xlsx';

// ─── PROFESSIONAL PRINT COMPONENTS ───────────────────
function CorporateHeader({ isRTL, title, printDate }) {
    return (
        <div className="hidden print:flex flex-col gap-6 mb-8 border-b-2 border-slate-900 pb-6">
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                        {isRTL ? 'مؤسسة رائد للحلول' : 'RAID SOLUTIONS ENT.'}
                    </h1>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <span>{isRTL ? 'تاريخ الطباعة:' : 'PRINT DATE:'}</span>
                        <span className="text-slate-900">{printDate}</span>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {title}
                    </p>
                </div>
            </div>

            <div className="hidden print:block text-center relative py-2">
                <div className="inline-block px-8 py-1 border border-slate-200 rounded-full bg-slate-50 relative z-10 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    {isRTL ? 'تقرير جرد المخزون الرسمي' : 'OFFICIAL INVENTORY REPORT'}
                </div>
            </div>
        </div>
    );
}

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('ALL'); // ALL, LOW, OUT
    const [viewMode, setViewMode] = useState('list');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        barcode: '',
        buyPrice: '',
        sellPrice: '',
        stockQty: '',
        minStockAlert: '5'
    });
    const { t, isRTL, fmtNumber, fmtDate } = useLanguage();
    const fileInputRef = useRef(null);
    const [importRows, setImportRows] = useState([]);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importing, setImporting] = useState(false);

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
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data } = await api.get('/products');
            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching products:', err);
            // Fallback for demonstration if needed, or just stay empty
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        const total = products.length;
        const lowStock = products.filter(p => p.stockQty <= p.minStockAlert && p.stockQty > 0).length;
        const outOfStock = products.filter(p => p.stockQty <= 0).length;
        const totalValue = products.reduce((sum, p) => sum + (p.buyPrice * p.stockQty), 0);
        return { total, lowStock, outOfStock, totalValue };
    }, [products]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                buyPrice: parseFloat(formData.buyPrice),
                sellPrice: parseFloat(formData.sellPrice),
                stockQty: parseInt(formData.stockQty),
                minStockAlert: parseInt(formData.minStockAlert)
            };
            if (currentProduct) {
                await api.put(`/products/${currentProduct.id}`, payload);
            } else {
                await api.post('/products', payload);
            }
            fetchProducts();
            closeModal();
            triggerDialog(
                isRTL ? 'نجاح ✅' : 'Succès ✅', 
                isRTL ? 'تم حفظ المنتج بنجاح' : 'Produit enregistré avec succès', 
                'success'
            );
        } catch (err) {
            triggerDialog(
                isRTL ? 'خطأ ❌' : 'Erreur ❌', 
                isRTL ? 'حدث خطأ أثناء حفظ المنتج' : 'Erreur lors de l\'enregistrement', 
                'danger'
            );
        }
    };

    const handleDelete = (id) => {
        triggerDialog(
            isRTL ? 'تأكيد الحذف' : 'Confirmer la suppression',
            isRTL ? 'هل أنت متأكد من حذف هذا المنتج نهائياً؟ ستفقد كافة بياناته المخزنية.' : 'Êtes-vous sûr de vouloir supprimer ce produit ? Toutes ses données de stock seront perdues.',
            'danger',
            async () => {
                try {
                    await api.delete(`/products/${id}`);
                    fetchProducts();
                    triggerDialog(
                        isRTL ? 'تم الحذف' : 'Supprimé', 
                        isRTL ? 'تم حذف المنتج بنجاح' : 'Produit supprimé avec succès', 
                        'success'
                    );
                } catch (err) {
                    const errorMsg = err.response?.data?.message || (isRTL ? 'خطأ في حذف المنتج ❌' : 'Erreur lors de la suppression ❌');
                    triggerDialog(isRTL ? 'تنبيه' : 'Alerte', errorMsg, 'warning');
                }
            }
        );
    };

    const openModal = (product = null) => {
        if (product) {
            setCurrentProduct(product);
            setFormData({
                name: product.name,
                barcode: product.barcode || '',
                buyPrice: product.buyPrice.toString(),
                sellPrice: product.sellPrice.toString(),
                stockQty: product.stockQty.toString(),
                minStockAlert: product.minStockAlert.toString()
            });
        } else {
            setCurrentProduct(null);
            setFormData({
                name: '',
                barcode: '',
                buyPrice: '',
                sellPrice: '',
                stockQty: '',
                minStockAlert: '5'
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentProduct(null);
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search));
        if (filterType === 'LOW') return matchesSearch && p.stockQty <= p.minStockAlert && p.stockQty > 0;
        if (filterType === 'OUT') return matchesSearch && p.stockQty <= 0;
        return matchesSearch;
    });

    const handleExcelFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = new Uint8Array(ev.target.result);
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(ws, { defval: '' });

                if (json.length === 0) {
                    triggerDialog(
                        isRTL ? 'تنبيه' : 'Attention', 
                        isRTL ? 'الملف فارغ أو غير صالح' : 'Fichier vide ou invalide', 
                        'warning'
                    );
                    e.target.value = '';
                    return;
                }

                // Smart fuzzy column finder: check all column keys for any matching keyword
                const normalizeStr = (str) => {
                    if (!str) return '';
                    return String(str).toLowerCase()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents (é -> e)
                        .replace(/[أإآ]/g, 'ا') // normalize arabic alef
                        .replace(/ة/g, 'ه') // normalize teh marbuta
                        .replace(/\s/g, '') // remove spaces
                        .replace(/['"_\-.]/g, ''); // remove punctuation
                };

                const findCol = (row, keywords) => {
                    const keys = Object.keys(row);
                    for (const kw of keywords) {
                        const target = normalizeStr(kw);
                        const found = keys.find(k => {
                            const normalizedKey = normalizeStr(k);
                            return normalizedKey.includes(target);
                        });
                        
                        if (found !== undefined && row[found] !== '' && row[found] !== null && row[found] !== undefined) {
                            return row[found];
                        }
                    }
                    return null;
                };

                const cleanNum = (val) => {
                    if (val === null || val === undefined || val === '') return 0;
                    // Remove all characters except digits, dots, and commas
                    let s = String(val).replace(/[^\d.,-]/g, '');
                    // If multiple commas/dots exist, or both exist, handle common formats
                    // Common: 1,000.50 (English) or 1.000,50 (French)
                    // We'll simplify to: assume the last dot/comma is the decimal if it looks like one
                    if (s.includes(',') && s.includes('.')) {
                        const lastComma = s.lastIndexOf(',');
                        const lastDot = s.lastIndexOf('.');
                        if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
                        else s = s.replace(/,/g, '');
                    } else if (s.includes(',')) {
                        // Check if comma is likely a decimal (e.g. "100,5")
                        const parts = s.split(',');
                        if (parts[parts.length - 1].length <= 2) s = s.replace(',', '.');
                        else s = s.replace(',', ''); // Likely thousands separator
                    }
                    return parseFloat(s) || 0;
                };

                let normalized = json.map(row => {
                    const name = findCol(row, ['name','nom','اسم','منتج','produit','designation','article','title','item','صنف','بيان','وصف','مادة','سلعة']) || '';
                    const barcode = findCol(row, ['barcode','code','باركود','barre','رمز','sku','ref','upc','رقم']) || '';
                    const buyPriceRaw = findCol(row, ['buyprice','buy','شراء','achat','تكلفة','cost','cout','coût','prixachat','pa','p.a','سعرالشراء','ثمنالشراء','التكلفة','شرا']);
                    const sellPriceRaw = findCol(row, ['sellprice','sell','بيع','vente','prix','pv','p.v','prixvente','selling','rate','سعرالبيع','ثمنالبيع','السعر','بي']);
                    const stockRaw = findCol(row, ['stockqty','stock','qty','quantity','quantite','quantité','qte','qté','كمية','عدد','inventory','balance','رصيد','المخزون','الكمية','كميه']);
                    const alertRaw = findCol(row, ['minstock','alert','minimum','أدنى','حد','limit','min','stockmin','انذار','تنبيه']);

                    return {
                        name: String(name).trim(),
                        barcode: String(barcode).trim() || null,
                        buyPrice: cleanNum(buyPriceRaw),
                        sellPrice: cleanNum(sellPriceRaw),
                        stockQty: Math.round(cleanNum(stockRaw)),
                        minStockAlert: Math.round(cleanNum(alertRaw)) || 5,
                    };
                }).filter(r => r.name.length > 0);

                // Fallback: If fuzzy matching failed completely, try mapping by column index (assuming they didn't use headers or used weird ones)
                if (normalized.length === 0 && json.length > 0) {
                    normalized = json.map(row => {
                        const values = Object.values(row);
                        return {
                            name: values[0] ? String(values[0]).trim() : '',
                            barcode: values[1] ? String(values[1]).trim() : null,
                            buyPrice: cleanNum(values[2]),
                            sellPrice: cleanNum(values[3]),
                            stockQty: Math.round(cleanNum(values[4])),
                            minStockAlert: Math.round(cleanNum(values[5])) || 5,
                        };
                    }).filter(r => r.name.length > 0);
                }

                if (normalized.length === 0) {
                    const foundHeaders = Object.keys(json[0] || {}).join(' ، ');
                    triggerDialog(
                        isRTL ? 'تنبيه' : 'Attention', 
                        isRTL ? `الملف لا يحتوي على بيانات صالحة. الأعمدة الموجودة هي: (${foundHeaders}). استخدم النموذج المرفق.` : `Aucune ligne valide trouvée. Colonnes: (${foundHeaders}). Utilisez le modèle.`, 
                        'warning'
                    );
                    e.target.value = '';
                    return;
                }

                setImportRows(normalized);
                setIsImportModalOpen(true);
            } catch (err) {
                console.error('Excel parse error:', err);
                triggerDialog(
                    isRTL ? 'خطأ' : 'Erreur', 
                    isRTL ? 'خطأ في قراءة ملف Excel. تأكد من صيغة الملف.' : 'Erreur de lecture Excel', 
                    'danger'
                );
            }
        };
        reader.onerror = () => {
            triggerDialog(isRTL ? 'خطأ' : 'Erreur', isRTL ? 'فشل تحميل الملف' : 'Échec du chargement', 'danger');
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    };


    const handleImportSubmit = async () => {
        setImporting(true);
        try {
            const { data } = await api.post('/products/import', { products: importRows });
            const { created, updated } = data;
            triggerDialog(
                isRTL ? 'تم الاستيراد بنجاح! 🎉' : 'Importation réussie! 🎉', 
                isRTL ? `تم إضافة: ${created}\nتم تحديث: ${updated}` : `Créés: ${created}\nMis à jour: ${updated}`, 
                'success'
            );
            setIsImportModalOpen(false);
            setImportRows([]);
            fetchProducts();
        } catch (err) {
            console.error('Import error full details:', err);
            
            let detail = '';
            if (err.response) {
                detail = err.response.data?.details || err.response.data?.error || '';
                if (!detail) {
                    detail = typeof err.response.data === 'string' 
                        ? err.response.data.substring(0, 50) 
                        : `Status ${err.response.status}`;
                }
            } else if (err.request) {
                detail = 'Network Error (الخادم لا يستجيب)';
            } else {
                detail = err.message;
            }

            triggerDialog(
                isRTL ? 'فشل الاستيراد' : 'Échec de l\'import', 
                isRTL ? `خطأ: ${detail}` : `Erreur: ${detail}`, 
                'danger'
            );
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const example = [
            { name: isRTL ? 'منتج تجريبي 1' : 'Produit exemple 1', barcode: '1234567890', buyPrice: 100, sellPrice: 150, stockQty: 50, minStockAlert: 5 },
            { name: isRTL ? 'منتج تجريبي 2' : 'Produit exemple 2', barcode: '0987654321', buyPrice: 200, sellPrice: 280, stockQty: 30, minStockAlert: 10 },
        ];
        const ws = XLSX.utils.json_to_sheet(example);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Products');
        XLSX.writeFile(wb, 'products_template.xlsx');
    };

    const handleExport = () => {
        const headers = isRTL
            ? ['المنتج', 'الباركود', 'سعر الشراء', 'سعر البيع', 'المخزون', 'الحد الأدنى']
            : ['Produit', 'Code-barres', 'Prix d\'achat', 'Prix de vente', 'Stock', 'Alerte'];

        const rows = filteredProducts.map(p => [
            p.name,
            p.barcode || '-',
            p.buyPrice,
            p.sellPrice,
            p.stockQty,
            p.minStockAlert
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(',') + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `inventory_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-8 animate-fade-up bg-[var(--background)] min-h-[85vh] print:p-0 print:bg-white">
            {/* ─── PRINT HEADER ─── */}
            <CorporateHeader 
                isRTL={isRTL} 
                title={isRTL ? 'قائمة المنتجات والمخزون' : 'Product Inventory List'} 
                printDate={fmtDate(new Date())} 
            />
            {/* ─── Header Area (SCREEN ONLY) ─── */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{t('products')}</h1>
                    <p className="text-[--text-muted] mt-1 font-bold text-sm tracking-wide opacity-80">{isRTL ? 'إدارة المنتجات والمخزون' : 'Gestion des produits et stocks'}</p>
                </div>
            </div>

            {/* ─── STAT CARDS ─── */}
            <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden ${isRTL ? '' : 'direction-ltr'}`}>
                <StatCard 
                    title={isRTL ? 'المنتجات المسجلة' : 'Produits'} 
                    value={stats.total} 
                    colorClass="bg-blue-500/10 border-blue-500/20 text-blue-500" 
                    isRTL={isRTL} 
                    hideCurrency
                />
                <StatCard 
                    title={isRTL ? 'مخزون منخفض' : 'Stock Faible'} 
                    value={stats.lowStock} 
                    colorClass="bg-orange-500/10 border-orange-500/20 text-orange-500" 
                    isRTL={isRTL} 
                    hideCurrency
                />
                <StatCard 
                    title={isRTL ? 'نفدت الكمية' : 'Rupture'} 
                    value={stats.outOfStock} 
                    colorClass="bg-red-500/10 border-red-500/20 text-red-500" 
                    isRTL={isRTL} 
                    hideCurrency
                />
                <StatCard 
                    title={isRTL ? 'إجمالي قيمة المخزون' : 'Valeur Totale'} 
                    value={fmtNumber(stats.totalValue)} 
                    colorClass="bg-green-500/10 border-green-500/20 text-green-500" 
                    isRTL={isRTL} 
                />
            </div>

            {/* ─── Toolbar (SCREEN ONLY) ─── */}
            <div className={`flex flex-col xl:flex-row gap-4 items-center print:hidden ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto order-2 xl:order-1">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleExcelFile}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 h-11 rounded-xl hover:bg-green-500/20 hover:shadow-md flex items-center gap-2 font-bold transition-all duration-300"
                    >
                        <FileSpreadsheet size={18} />
                        <span className="hidden md:inline">{isRTL ? 'استيراد' : 'Importer'}</span>
                    </button>
                    <button
                        onClick={handleExport}
                        className="bg-[var(--surface-2)] border border-[var(--glass-border)] text-[var(--text-primary)] px-4 h-11 rounded-xl hover:bg-[var(--surface-1)] hover:shadow-md flex items-center gap-2 font-bold transition-all duration-300"
                    >
                        <Download size={18} className="text-primary" />
                        <span className="hidden md:inline">{isRTL ? 'تصدير' : 'Exporter'}</span>
                    </button>
                    <button
                        onClick={handlePrint}
                        id="print-button"
                        className="bg-[var(--text-primary)] text-[var(--background)] px-5 h-11 rounded-xl hover:opacity-90 hover:shadow-md flex items-center gap-2 font-bold transition-all duration-300"
                    >
                        <Printer size={18} />
                        <span>{isRTL ? 'طباعة' : 'Imprimer'}</span>
                    </button>
                    <button onClick={() => openModal()} className="btn-primary h-11 px-5 rounded-xl flex items-center gap-2">
                        <Plus size={18} />
                        <span>{isRTL ? 'إضافة منتج' : 'Ajouter'}</span>
                    </button>
                </div>

                <div className={`relative flex-1 group w-full order-1 xl:order-2 flex flex-col md:flex-row gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                    <div className="relative flex-1 group">
                        <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-[var(--text-faint)] group-focus-within:text-[var(--primary)] transition-colors duration-300`} size={18} />
                        <input
                            type="text"
                            placeholder={isRTL ? "البحث بالاسم أو الباركود..." : "Rechercher par nom ou code..."}
                            className={`w-full bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl h-12 ${isRTL ? 'pr-12 pl-12 text-right' : 'pl-12 pr-12 text-left'} text-[13px] font-bold focus:outline-none focus:border-primary/40 focus:bg-[var(--card-bg)] transition-all shadow-inner text-[var(--text-primary)] placeholder:text-[var(--text-faint)]`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className={`absolute top-1/2 -translate-y-1/2 p-1.5 bg-[var(--surface-1)] border border-[var(--glass-border)] rounded-lg text-[--text-muted] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors ${isRTL ? 'left-4' : 'right-4'}`}
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                    <div className="relative min-w-[200px]">
                        <select 
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className={`w-full h-12 bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl ${isRTL ? 'pr-4 pl-10 text-right' : 'pl-4 pr-10 text-left'} text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:border-primary/40 text-[var(--text-primary)]`}
                        >
                            <option value="ALL">{isRTL ? 'جميع المنتجات' : 'Tous les produits'}</option>
                            <option value="LOW">{isRTL ? 'مخزون منخفض' : 'Stock bas'}</option>
                            <option value="OUT">{isRTL ? 'نفدت الكمية' : 'Rupture de stock'}</option>
                        </select>
                        <ChevronDown size={16} className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-[--text-muted] pointer-events-none`} />
                    </div>
                </div>

                <div className="flex gap-2 p-1.5 bg-[var(--surface-2)] rounded-xl border border-[var(--glass-border)] shadow-sm shrink-0 order-3">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-[--text-muted]'}`}>
                        <LayoutGrid size={18} />
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg' : 'text-[--text-muted]'}`}>
                        <List size={18} />
                    </button>
                </div>
            </div>
            {/* ─── Products Display (SCREEN ONLY) ─── */}
            <div className="print:hidden">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {Array(8).fill(0).map((_, i) => <div key={i} className="h-64 bg-[var(--surface-2)] animate-pulse rounded-[2rem] border border-[var(--glass-border)]"></div>)}
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="py-24 text-center card-premium bg-[var(--surface-1)] border-[var(--glass-border)] flex flex-col items-center gap-4 opacity-70">
                        <Package size={64} strokeWidth={1} className="text-[var(--text-muted)]" />
                        <p className="font-extrabold text-[var(--text-primary)]">{isRTL ? 'لا توجد منتجات' : 'Aucun produit trouvé'}</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="card-premium group relative flex flex-col h-full border-[var(--glass-border)] bg-[var(--surface-2)] hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                                <div className={`flex justify-between items-start mb-6 ${isRTL ? '' : 'flex-row-reverse'}`}>
                                    <div className={`p-3.5 rounded-2xl shadow-sm ${product.stockQty <= product.minStockAlert ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                                        <Package size={22} />
                                    </div>
                                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                        <button onClick={() => openModal(product)} className="p-2.5 bg-[var(--card-bg)] hover:bg-primary/10 rounded-xl text-[var(--text-muted)] hover:text-primary border border-[var(--glass-border)] transition-colors"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(product.id)} className="p-2.5 bg-[var(--card-bg)] hover:bg-red-500/10 rounded-xl text-[var(--text-muted)] hover:text-red-500 border border-[var(--glass-border)] transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>

                                <div className="mb-6 flex-1">
                                    <h3 className={`text-[17px] font-extrabold text-[var(--text-primary)] mb-2.5 line-clamp-2 ${isRTL ? 'text-right' : 'text-left'}`}>{product.name}</h3>
                                    <div className={`flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-1)] rounded-lg w-fit border border-[var(--glass-border)] ${isRTL ? '' : 'flex-row-reverse'}`}>
                                        <Barcode size={13} className="text-[--text-muted]" />
                                        <span className="text-[10px] text-[--text-muted] font-extrabold">{product.barcode || (isRTL ? 'عام' : 'Général')}</span>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-[var(--glass-border)] grid grid-cols-2 gap-4">
                                    <div className={isRTL ? 'text-right' : 'text-left'}>
                                        <div className="text-[9px] font-bold text-[--text-muted] uppercase mb-1">{isRTL ? 'سعر البيع' : 'Prix vente'}</div>
                                        <div className="text-lg font-black text-secondary">{fmtNumber(product.sellPrice)} <span className="text-[10px] font-bold opacity-70">MRU</span></div>
                                    </div>
                                    <div className={isRTL ? 'text-right' : 'text-left'}>
                                        <div className="text-[9px] font-bold text-[--text-muted] uppercase mb-1">{isRTL ? 'متوفر' : 'Stock'}</div>
                                        <div className={`text-lg font-black ${product.stockQty <= 0 ? 'text-red-600 animate-pulse' : product.stockQty <= product.minStockAlert ? 'text-orange-600 animate-pulse' : 'text-[var(--text-primary)]'}`}>
                                            {product.stockQty} <span className="text-[9px] font-bold opacity-60">{isRTL ? 'قطعة' : 'Pcs'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card-premium rounded-[2.5rem] overflow-hidden border-[var(--glass-border)] bg-[var(--surface-1)] shadow-xl">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-[var(--surface-2)] border-b border-[var(--glass-border)]">
                                    <th className={`${isRTL ? 'text-right' : 'text-left'} p-6 text-[10px] font-black uppercase text-[var(--text-faint)] tracking-widest`}>{isRTL ? 'المنتج' : 'Désignation'}</th>
                                    <th className="text-center p-6 text-[10px] font-black uppercase text-[var(--text-faint)] tracking-widest">{isRTL ? 'الباركود' : 'Barcode'}</th>
                                    <th className="text-center p-6 text-[10px] font-black uppercase text-[var(--text-faint)] tracking-widest">{isRTL ? 'المخزن' : 'Stock'}</th>
                                    <th className="text-center p-6 text-[10px] font-black uppercase text-[var(--text-faint)] tracking-widest">{isRTL ? 'سعر التكلفة' : 'Coût'}</th>
                                    <th className="text-center p-6 text-[10px] font-black uppercase text-[var(--text-faint)] tracking-widest">{isRTL ? 'سعر البيع' : 'Prix vente'}</th>
                                    <th className="text-center p-6 text-[10px] font-black uppercase text-[var(--text-faint)] tracking-widest">{isRTL ? 'إجراءات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--glass-border)]">
                                {filteredProducts.map(p => (
                                    <tr key={p.id} className="group hover:bg-[var(--surface-2)] transition-all duration-200">
                                        <td className="p-6">
                                            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
                                                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm"><Package size={22} /></div>
                                                <span className="font-extrabold text-sm text-[var(--text-main)] group-hover:text-primary transition-colors">{p.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center text-[11px] font-bold text-[var(--text-faint)] tracking-wider font-mono">{p.barcode || '-'}</td>
                                        <td className="p-6 text-center">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border tracking-tight ${p.stockQty <= 0 ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' : p.stockQty <= p.minStockAlert ? 'bg-orange-500/10 text-orange-500 border-orange-500/20 animate-pulse' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                                                {p.stockQty} <span className="text-[9px] font-bold opacity-60 ml-1">{isRTL ? 'قطعة' : 'Pcs'}</span>
                                            </span>
                                        </td>
                                        <td className="p-6 text-center font-bold text-sm text-[var(--text-muted)] tracking-tight">{fmtNumber(p.buyPrice)}</td>
                                        <td className="p-6 text-center font-black text-sm text-secondary tracking-tight">{fmtNumber(p.sellPrice)} <span className="text-[10px] font-bold opacity-70 ml-1">MRU</span></td>
                                        <td className="p-6 text-center">
                                            <div className="flex justify-center gap-3">
                                                <button onClick={() => openModal(p)} className="w-10 h-10 flex items-center justify-center bg-[var(--surface-2)] rounded-xl text-[var(--text-faint)] hover:text-primary border border-[var(--glass-border)] transition-all"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDelete(p.id)} className="w-10 h-10 flex items-center justify-center bg-[var(--surface-2)] rounded-xl text-[var(--text-faint)] hover:text-red-500 border border-[var(--glass-border)] transition-all"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ─── PRINT ONLY TABLE (PROFESSIONAL) ─── */}
            <div className="hidden print:block mt-8">
                {/* Prevent the summary row from repeating or breaking across pages */}
                <style>{`
                    @media print {
                        .print-total-row { page-break-before: avoid; }
                        .print-table tbody tr:last-child { page-break-before: avoid; }
                    }
                `}</style>
                <table className="w-full border-collapse border border-slate-200">
                    <thead>
                        <tr className="bg-slate-900 text-white">
                            <th className="p-3 text-[10px] font-black uppercase text-left">{isRTL ? 'المنتج' : 'Product'}</th>
                            <th className="p-3 text-[10px] font-black uppercase text-center">{isRTL ? 'الباركود' : 'Barcode'}</th>
                            <th className="p-3 text-[10px] font-black uppercase text-center">{isRTL ? 'المخزن' : 'Stock'}</th>
                            <th className="p-3 text-[10px] font-black uppercase text-right">{isRTL ? 'التكلفة' : 'Cost'}</th>
                            <th className="p-3 text-[10px] font-black uppercase text-right">{isRTL ? 'سعر البيع' : 'Sell Price'}</th>
                            <th className="p-3 text-[10px] font-black uppercase text-right">{isRTL ? 'القيمة الإجمالية' : 'Total Value'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {products.map(p => (
                            <tr key={p.id} className="text-[10px] border-b border-slate-100">
                                <td className="p-3 font-black text-slate-900">{p.name}</td>
                                <td className="p-3 text-center text-slate-500 font-mono">{p.barcode || '-'}</td>
                                <td className={`p-3 text-center font-bold ${p.stockQty <= p.minStockAlert ? 'text-red-600' : 'text-slate-900'}`}>
                                    {p.stockQty}
                                </td>
                                <td className="p-3 text-right text-slate-600">{fmtNumber(p.buyPrice)}</td>
                                <td className="p-3 text-right font-black text-slate-900">{fmtNumber(p.sellPrice)}</td>
                                <td className="p-3 text-right font-black text-slate-900 bg-slate-50/50">{fmtNumber(p.buyPrice * p.stockQty)}</td>
                            </tr>
                        ))}
                        {/* Total row — inside tbody so it renders ONCE at the end of the last page */}
                        <tr className="print-total-row font-black text-[11px] border-t-2 border-slate-900 bg-slate-100">
                            <td colSpan={5} className="p-4 uppercase tracking-[0.2em] text-slate-600">{isRTL ? '• إجمالي قيمة المخزون' : '• TOTAL INVENTORY VALUE'}</td>
                            <td className="p-4 text-right text-slate-900 text-sm font-black">{fmtNumber(stats.totalValue)} MRU</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ─── Product Modal ─── */}
            <RaidModal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={currentProduct ? (isRTL ? 'تحرير المنتج' : 'Éditer le produit') : (isRTL ? 'إضافة منتج' : 'Nouveau produit')}
            >
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2 space-y-2">
                        <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] block ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'اسم المنتج' : 'Nom du produit'} <span className="text-red-500">*</span></label>
                        <input
                            required
                            className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-4 text-sm font-extrabold focus:outline-none focus:border-primary/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'} placeholder:text-[var(--text-faint)]`}
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] block ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الباركود (اختياري)' : 'Code-barres (Optionnel)'}</label>
                        <input
                            className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-4 text-sm font-extrabold focus:outline-none focus:border-primary/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'} placeholder:text-[var(--text-faint)]`}
                            value={formData.barcode}
                            placeholder={isRTL ? 'امسح الباركود أو اكتبه...' : 'Scanner ou saisir...'}
                            onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] block ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'سعر الشراء' : 'Prix d\'achat'}</label>
                        <input type="number" step="0.01" required className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-4 text-sm font-black focus:outline-none focus:border-primary/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'}`} value={formData.buyPrice} onChange={e => setFormData({ ...formData, buyPrice: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] block ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'سعر البيع' : 'Prix de vente'}</label>
                        <input type="number" step="0.01" required className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-4 text-sm font-black focus:outline-none focus:border-secondary/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'}`} value={formData.sellPrice} onChange={e => setFormData({ ...formData, sellPrice: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] block ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الكمية الابتدائية' : 'Quantité Initiale'}</label>
                        <input type="number" required className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-4 text-sm font-black focus:outline-none focus:border-primary/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'}`} value={formData.stockQty} onChange={e => setFormData({ ...formData, stockQty: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] block ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'تنبيه النقص' : 'Alerte stock'}</label>
                        <input type="number" required className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-4 text-sm font-black focus:outline-none focus:border-red-500/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'}`} value={formData.minStockAlert} onChange={e => setFormData({ ...formData, minStockAlert: e.target.value })} />
                    </div>
                    <div className="md:col-span-2 pt-4">
                        <button type="submit" className="w-full btn-primary h-14 rounded-2xl text-base flex items-center justify-center gap-3 font-extrabold shadow-primary-glow">
                            <Save size={20} />
                            <span>{currentProduct ? (isRTL ? 'تحديث البيانات' : 'Mettre à jour') : (isRTL ? 'إضافة المنتج للنظام' : 'Ajouter le produit')}</span>
                        </button>
                    </div>
                </form>
            </RaidModal>

            {/* ─── Import Preview Modal ─── */}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className="w-full max-w-4xl bg-[var(--surface-1)] rounded-[2.5rem] border border-[var(--glass-border)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className={`flex items-center justify-between p-6 border-b border-[var(--glass-border)] ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="p-2.5 bg-green-500/10 rounded-2xl text-green-500 border border-green-500/20">
                                    <FileSpreadsheet size={22} />
                                </div>
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <h2 className="text-lg font-black text-[var(--text-primary)]">
                                        {isRTL ? `معاينة الاستيراد — ${importRows.length} منتج` : `Aperçu import — ${importRows.length} produits`}
                                    </h2>
                                    <p className="text-xs font-bold text-[var(--text-muted)]">
                                        {isRTL ? 'تأكد من البيانات قبل الاستيراد' : 'Vérifiez les données avant d\'importer'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsImportModalOpen(false)} className="w-10 h-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 border border-[var(--glass-border)] transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="overflow-auto flex-1">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-[var(--surface-2)] border-b border-[var(--glass-border)]">
                                    <tr>
                                        {[isRTL ? 'المنتج' : 'Produit', isRTL ? 'الباركود' : 'Barcode', isRTL ? 'سعر الشراء' : 'Achat', isRTL ? 'سعر البيع' : 'Vente', isRTL ? 'المخزون' : 'Stock', isRTL ? 'الحد الأدنى' : 'Min'].map((h, i) => (
                                            <th key={i} className={`px-4 py-3 text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest ${isRTL ? 'text-right' : 'text-left'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--glass-border)]">
                                    {importRows.map((row, i) => (
                                        <tr key={i} className="hover:bg-[var(--surface-2)] transition-colors">
                                            <td className={`px-4 py-2 font-extrabold text-[var(--text-primary)] text-xs ${isRTL ? 'text-right' : 'text-left'}`}>{row.name}</td>
                                            <td className="px-4 py-2 text-xs text-[var(--text-muted)] font-mono">{row.barcode || '-'}</td>
                                            <td className="px-4 py-2 text-xs font-bold text-center">{row.buyPrice}</td>
                                            <td className="px-4 py-2 text-xs font-bold text-center text-secondary">{row.sellPrice}</td>
                                            <td className="px-4 py-2 text-xs font-bold text-center">{row.stockQty}</td>
                                            <td className="px-4 py-2 text-xs font-bold text-center">{row.minStockAlert}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className={`p-6 border-t border-[var(--glass-border)] flex flex-wrap gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <button
                                onClick={handleImportSubmit}
                                disabled={importing}
                                className="btn-primary flex-1 min-w-[160px] h-12 flex items-center justify-center gap-2 font-black disabled:opacity-60"
                            >
                                {importing ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Upload size={18} />
                                )}
                                {importing ? (isRTL ? 'جاري الاستيراد...' : 'Importation...') : (isRTL ? `استيراد ${importRows.length} منتج` : `Importer ${importRows.length} produits`)}
                            </button>
                            <button
                                onClick={downloadTemplate}
                                className="px-5 h-12 rounded-2xl border border-green-500/20 bg-green-500/10 text-green-500 font-bold hover:bg-green-500/20 transition-colors flex items-center gap-2"
                            >
                                <Download size={16} />
                                {isRTL ? 'تحميل نموذج' : 'Modèle Excel'}
                            </button>
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                className="px-6 h-12 rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-2)] text-[var(--text-muted)] font-bold hover:bg-red-500/10 hover:text-red-500 transition-colors"
                            >
                                {isRTL ? 'إلغاء' : 'Annuler'}
                            </button>
                        </div>
                    </div>
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

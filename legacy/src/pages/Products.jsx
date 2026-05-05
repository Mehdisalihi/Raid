import React, { useState, useEffect } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import {
    Plus,
    Search,
    Edit2,
    Trash,
    Package,
    X,
    AlertTriangle,
    Save,
    Filter,
    MoreHorizontal,
    ChevronRight,
    Download,
    ChevronUp,
    ChevronDown,
    Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '../i18n/translations';

import * as XLSX from 'xlsx';
import { fNum, fDate } from '../utils/format';

const Products = () => {
    const { products, addProduct, updateProduct, deleteProduct, bulkAddProducts, deleteAllProducts, deduplicateProducts, settings, language } = useAppStore();
    const t = translations[language];
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const itemsPerPage = 8;

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        purchasePrice: '',
        margin: '',
        price: '',
        quantity: '',
        minThreshold: '5',
        category: 'catGeneral'
    });

    useEffect(() => {
        const cost = parseFloat(formData.purchasePrice) || 0;
        const price = parseFloat(formData.price) || 0;
        if (cost > 0 && price > 0) {
            const calculatedMargin = ((price - cost) / cost) * 100;
            if (Math.abs(calculatedMargin - (parseFloat(formData.margin) || 0)) > 0.01) {
                setFormData(prev => ({ ...prev, margin: calculatedMargin.toFixed(2) }));
            }
        }
    }, [formData.price]);

    useEffect(() => {
        const cost = parseFloat(formData.purchasePrice) || 0;
        const margin = parseFloat(formData.margin) || 0;
        if (cost > 0) {
            const calculatedPrice = cost + (cost * margin / 100);
            if (Math.abs(calculatedPrice - (parseFloat(formData.price) || 0)) > 0.01) {
                setFormData(prev => ({ ...prev, price: calculatedPrice.toFixed(2) }));
            }
        }
    }, [formData.purchasePrice, formData.margin]);

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            code: product.code,
            name: product.name,
            purchasePrice: product.purchasePrice || '',
            margin: product.margin || '',
            price: product.price,
            quantity: product.quantity,
            minThreshold: product.minThreshold || '5',
            category: product.category || 'catGeneral'
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = {
            ...formData,
            purchasePrice: Math.max(0, parseFloat(formData.purchasePrice) || 0),
            margin: parseFloat(formData.margin) || 0,
            price: Math.max(0, parseFloat(formData.price) || 0),
            quantity: Math.max(0, parseInt(formData.quantity) || 0),
            minThreshold: Math.max(0, parseInt(formData.minThreshold) || 1)
        };

        if (!data.name.trim() || !data.code.trim()) {
            alert(language === 'ar' ? 'يرجى إدخال اسم المورد والكود' : 'Please enter name and code');
            return;
        }

        if (editingProduct) {
            updateProduct(editingProduct.id, data);
        } else {
            addProduct({ ...data, id: Date.now() });
        }
        setIsModalOpen(false);
    };

    const sortedProducts = [...products]
        .filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.code.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = filterStatus === 'all' ||
                (filterStatus === 'low' && p.quantity < (p.minThreshold || 5)) ||
                (filterStatus === 'available' && p.quantity >= (p.minThreshold || 5));
            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            let valA = a[sortBy];
            let valB = b[sortBy];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

    const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
    const paginatedProducts = sortedProducts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSort = (key) => {
        if (sortBy === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortOrder('asc');
        }
    };

    const exportToExcel = () => {
        const isAr = language === 'ar';

        // Column headers
        const headers = [
            isAr ? 'رمز المنتج' : 'Code Produit',
            isAr ? 'اسم المنتج' : 'Nom du Produit',
            isAr ? 'التصنيف' : 'Catégorie',
            isAr ? 'سعر الشراء' : "Prix d'Achat",
            isAr ? 'هامش الربح %' : 'Marge %',
            isAr ? 'سعر البيع' : 'Prix de Vente',
            isAr ? 'الكمية المتاحة' : 'Quantité',
            isAr ? 'الحد الأدنى' : 'Seuil Min',
            isAr ? 'القيمة الإجمالية' : 'Valeur Totale',
            isAr ? 'الحالة' : 'Statut',
        ];

        // Data rows
        const dataRows = sortedProducts.map(p => {
            const totalVal = p.purchasePrice
                ? p.purchasePrice * p.quantity
                : p.price * p.quantity * 0.8;
            const status = p.quantity === 0
                ? (isAr ? 'نفذ المخزون' : 'Épuisé')
                : p.quantity < (p.minThreshold || 5)
                    ? (isAr ? 'مخزون منخفض' : 'Stock faible')
                    : (isAr ? 'متاح' : 'Disponible');
            return [
                p.code,
                p.name,
                t[p.category] || t.catGeneral,
                p.purchasePrice || 0,
                p.margin || 0,
                p.price,
                p.quantity,
                p.minThreshold || 5,
                parseFloat(totalVal.toFixed(2)),
                status,
            ];
        });

        // Totals row
        const totalQty = sortedProducts.reduce((s, p) => s + p.quantity, 0);
        const totalValue = sortedProducts.reduce((s, p) =>
            s + (p.purchasePrice ? p.purchasePrice * p.quantity : p.price * p.quantity * 0.8), 0);
        const totalsRow = [
            isAr ? '*** الإجمالي ***' : '*** TOTAL ***',
            `${sortedProducts.length} ${isAr ? 'منتج' : 'produits'}`,
            '', '', '', '',
            totalQty,
            '',
            parseFloat(totalValue.toFixed(2)),
            '',
        ];

        // Title row
        const titleRow = [
            `${settings.businessName}  |  ${isAr ? 'قائمة المنتجات' : 'Liste des Produits'}  |  ${fDate(new Date(), language)}`
        ];

        // Build worksheet: title, empty row, headers, data, empty row, totals
        const wsData = [titleRow, [], headers, ...dataRows, [], totalsRow];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Merge title across all columns
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];

        // Auto column widths
        ws['!cols'] = [
            { wch: 16 }, // code
            { wch: 30 }, // name
            { wch: 18 }, // category
            { wch: 15 }, // purchase price
            { wch: 13 }, // margin
            { wch: 15 }, // sell price
            { wch: 13 }, // quantity
            { wch: 13 }, // min threshold
            { wch: 18 }, // total value
            { wch: 15 }, // status
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, isAr ? 'المنتجات' : 'Produits');
        XLSX.writeFile(wb, `products_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const downloadTemplate = () => {
        const headers = t.csvHeadersProducts;
        const example = `"PR101","منتج تجريبي",80,100,50,"catGeneral",5`;
        const csvContent = headers + '\n' + example;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `products_template.csv`;
        link.click();
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                let importedData = [];

                if (file.name.endsWith('.json')) {
                    importedData = JSON.parse(content);
                } else if (file.name.endsWith('.csv')) {
                    const lines = content.split('\n').filter(line => line.trim());
                    // const headers = lines[0].split(',');
                    importedData = lines.slice(1).map(line => {
                        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                        const getVal = (idx) => values[idx]?.replace(/^"|"$/g, '').trim() || '';
                        const cleanNum = (val) => parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0;

                        return {
                            code: getVal(0),
                            name: getVal(1),
                            purchasePrice: cleanNum(getVal(2)),
                            price: cleanNum(getVal(3)),
                            quantity: cleanNum(getVal(4)),
                            category: getVal(5) || 'catGeneral',
                            minThreshold: cleanNum(getVal(6)) || 5
                        };
                    });
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    const workbook = XLSX.read(content, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    importedData = jsonData.slice(1).map(row => {
                        const cleanNum = (val) => {
                            if (typeof val === 'number') return val;
                            if (!val) return 0;
                            return parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0;
                        };
                        return {
                            code: String(row[0] || '').trim(),
                            name: String(row[1] || '').trim(),
                            purchasePrice: cleanNum(row[2]),
                            price: cleanNum(row[3]),
                            quantity: cleanNum(row[4]),
                            category: String(row[5] || 'catGeneral').trim(),
                            minThreshold: cleanNum(row[6]) || 5
                        };
                    });
                }

                if (Array.isArray(importedData) && importedData.length > 0) {
                    bulkAddProducts(importedData);
                    alert(t.importSuccess || 'تم استيراد البيانات بنجاح');
                }
            } catch (err) {
                console.error(err);
                alert(t.importError || 'خطأ في تنسيق الملف');
            }
        };

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    };

    return (
        <div className="products-page scrollable-page">
            <div className="no-print">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                    <div>
                        <h2 className="title-lg">{t.manageProducts}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            <span>{t.dashboard}</span>
                            <ChevronRight size={14} style={{ transform: language === 'ar' ? 'rotate(180deg)' : 'none' }} />
                            <span>{t.products}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <input
                            type="file"
                            id="import-products-input"
                            accept=".csv,.json,.xlsx,.xls"
                            onChange={handleImport}
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="import-products-input" className="btn btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Download size={18} style={{ transform: 'rotate(180deg)' }} /> {t.importProducts}
                        </label>
                        <button className="btn btn-outline" onClick={exportToExcel}>
                            <Download size={18} /> {t.exportReport}
                        </button>
                        {products.length > 0 && (
                            <button className="btn btn-outline" onClick={deleteAllProducts} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                                <Trash size={18} /> {t.deleteAllProducts}
                            </button>
                        )}
                        {(new Set(products.map(p => String(p.code).trim().toLowerCase())).size < products.length) && (
                            <button className="btn btn-outline" onClick={deduplicateProducts} style={{ color: 'var(--warning)', borderColor: 'var(--danger)' }}>
                                <MoreHorizontal size={18} /> {t.mergeDuplicates}
                            </button>
                        )}
                        <button className="btn btn-outline" onClick={() => window.print()}>
                            <Printer size={18} color="green" /> {t.print}
                        </button>
                        <button className="btn btn-outline" onClick={downloadTemplate} style={{ color: 'var(--success)', borderColor: 'var(--success)' }}>
                            <Download size={18} style={{ transform: 'rotate(180deg)' }} /> {language === 'ar' ? 'نموذج الاستيراد' : 'Template Import'}
                        </button>
                        <button className="btn btn-primary" onClick={() => { setEditingProduct(null); setFormData({ code: '', name: '', purchasePrice: '', margin: '', price: '', quantity: '', minThreshold: '5', category: 'catGeneral' }); setIsModalOpen(true); }}>
                            <Plus size={20} /> {t.addNewProduct}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', marginBottom: '1.5rem', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                    <div className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <Search size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                            <input
                                type="text"
                                placeholder={t.searchProductPlaceholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="form-control"
                                style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '40px', border: 'none', background: 'transparent' }}
                            />
                        </div>
                    </div>
                    <div className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Filter size={18} color="var(--text-light)" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="form-control"
                            style={{ border: 'none', background: 'transparent', padding: 0, fontWeight: 600 }}
                        >
                            <option value="all">{t.allStatuses}</option>
                            <option value="available">{t.availableStock}</option>
                            <option value="low">{t.lowStockWarning}</option>
                        </select>
                    </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: language === 'ar' ? 'right' : 'left' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                                    <th style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', textAlign: language === 'ar' ? 'right' : 'left' }} onClick={() => handleSort('code')}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {t.productCode} {sortBy === 'code' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                        </div>
                                    </th>
                                    <th style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', textAlign: language === 'ar' ? 'right' : 'left' }} onClick={() => handleSort('name')}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {t.productName} {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                        </div>
                                    </th>
                                    <th style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', textAlign: language === 'ar' ? 'right' : 'left' }} onClick={() => handleSort('category')}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {t.productCategory} {sortBy === 'category' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                        </div>
                                    </th>
                                    <th style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', textAlign: language === 'ar' ? 'right' : 'left' }} onClick={() => handleSort('purchasePrice')}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {t.purchasePrice} {sortBy === 'purchasePrice' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                        </div>
                                    </th>
                                    <th style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', textAlign: language === 'ar' ? 'right' : 'left' }} onClick={() => handleSort('price')}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {t.productPrice} {sortBy === 'price' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                        </div>
                                    </th>
                                    <th style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', textAlign: language === 'ar' ? 'right' : 'left' }} onClick={() => handleSort('quantity')}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {t.productQty} {sortBy === 'quantity' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                        </div>
                                    </th>
                                    <th style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', textAlign: language === 'ar' ? 'right' : 'left' }} onClick={() => handleSort('minThreshold')}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {t.minThresholdLabel} {sortBy === 'minThreshold' && (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                        </div>
                                    </th>
                                    <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>{t.productStatus}</th>
                                    <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>{t.actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode="popLayout">
                                    {paginatedProducts.map(product => (
                                        <motion.tr
                                            key={product.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            style={{ borderBottom: '1px solid var(--border-light)' }}
                                            whileHover={{ background: '#f8fafc' }}
                                        >
                                            <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                <code>{product.code}</code>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{product.name}</div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t[product.category] || t.catGeneral}</div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                                {fNum(product.purchasePrice || 0)} <span style={{ fontSize: '0.75rem' }}>{settings.currency}</span>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>
                                                {fNum(product.price)} <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{settings.currency}</span>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{
                                                        fontWeight: 800,
                                                        color: product.quantity < (product.minThreshold || 5) ? 'var(--danger)' : 'var(--text-main)'
                                                    }}>
                                                        {product.quantity}
                                                    </span>
                                                    {product.quantity < (product.minThreshold || 5) && <AlertTriangle size={14} color="var(--warning)" />}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{product.minThreshold || 5}</div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '0.35rem 0.85rem',
                                                    borderRadius: '6px',
                                                    background: product.quantity === 0 ? 'rgba(239, 68, 68, 0.1)' : product.quantity < (product.minThreshold || 5) ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                    color: product.quantity === 0 ? 'var(--danger)' : product.quantity < (product.minThreshold || 5) ? 'var(--warning)' : 'var(--success)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 800
                                                }}>
                                                    {product.quantity === 0 ? t.outOfStockLabel : product.quantity < (product.minThreshold || 5) ? t.lowStockLabel : t.availableLabel}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                                                    <button className="icon-btn" onClick={() => handleEdit(product)} style={{ color: 'var(--primary)' }}>
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button className="icon-btn" onClick={() => deleteProduct(product.id)} style={{ color: 'var(--danger)' }}>
                                                        <Trash size={18} />
                                                    </button>
                                                    <button className="icon-btn">
                                                        <MoreHorizontal size={18} color="var(--text-light)" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {paginatedProducts.length === 0 && (
                        <div style={{ padding: '5rem 0', textAlign: 'center' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '50%', background: '#f1f5f9',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
                            }}>
                                <Package size={40} style={{ opacity: 0.2 }} />
                            </div>
                            <h4 style={{ color: 'var(--text-main)', marginBottom: '0.25rem' }}>{t.noResults}</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t.tryDifferentSearch}</p>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '0 1rem' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            {t.showing} {(currentPage - 1) * itemsPerPage + 1} {t.to} {Math.min(currentPage * itemsPerPage, sortedProducts.length)} {t.ofProducts.replace('{total}', sortedProducts.length)}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                className="btn btn-outline"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                style={{ padding: '0.5rem 1rem' }}
                            >
                                {t.prev}
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    className={`btn ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setCurrentPage(i + 1)}
                                    style={{ width: '40px', padding: 0, justifyContent: 'center' }}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                className="btn btn-outline"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                style={{ padding: '0.5rem 1.5rem' }}
                            >
                                {t.next}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Print Only: Full Inventory Audit List (All Products) */}
            <div className="print-only" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', borderBottom: '3px solid #000', paddingBottom: '1.5rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: 0 }}>{settings.businessName}</h2>
                        <p style={{ fontSize: '1rem', margin: '0.25rem 0' }}>{settings.address}</p>
                        <p style={{ fontSize: '1rem', margin: 0 }}>{settings.phone}</p>
                    </div>
                    <div style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 950, margin: 0, color: '#000' }}>{t.inventoryMonitor}</h1>
                        <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.25rem 0' }}>{fDate(new Date(), language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#000' }}>
                    <thead>
                        <tr style={{ background: '#f1f5f9', border: '1.5px solid #000' }}>
                            <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'center' }}>{t.productCode}</th>
                            <th style={{ padding: '8px', border: '1px solid #000' }}>{t.productName}</th>
                            <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'center' }}>{t.productCategory}</th>
                            <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'center' }}>{t.purchasePrice}</th>
                            <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'center' }}>{t.sellPrice}</th>
                            <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'center' }}>{t.availableQty}</th>
                            <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'center' }}>{t.totalValueLabel}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...products].sort((a, b) => a.name.localeCompare(b.name, language === 'ar' ? 'ar' : 'fr')).map((p, idx) => (
                            <tr key={p.id || idx} style={{ border: '1px solid #000' }}>
                                <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'center' }}>{p.code}</td>
                                <td style={{ padding: '6px 8px', border: '1px solid #000', fontWeight: 700 }}>{p.name}</td>
                                <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'center' }}>{t[p.category] || t.catGeneral}</td>
                                <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'center' }}>{fNum(p.purchasePrice)}</td>
                                <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'center' }}>{fNum(p.price)}</td>
                                <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'center', fontWeight: 900 }}>{p.quantity}</td>
                                <td style={{ padding: '6px 8px', border: '1px solid #000', textAlign: 'center', fontWeight: 900 }}>{fNum(p.purchasePrice ? p.purchasePrice * p.quantity : p.price * p.quantity * 0.8)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="audit-summary-print" style={{ marginTop: '2.5rem', padding: '1.5rem', border: '3px solid #000', borderRadius: '4px', pageBreakInside: 'avoid' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #000', paddingBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t.productsCount}:</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 900 }}>{products.length}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #000', paddingBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t.totalQty}:</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 900 }}>{fNum(products.reduce((sum, p) => sum + p.quantity, 0))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>{t.totalInventoryValue}:</span>
                        <span style={{ fontSize: '1.4rem', fontWeight: 900 }}>{fNum(products.reduce((sum, p) => sum + (p.quantity * (p.purchasePrice || (p.price * 0.8))), 0))} {settings.currency}</span>
                    </div>
                </div>

                <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', pageBreakInside: 'avoid' }}>
                    <div style={{ textAlign: 'center', width: '200px' }}>
                        <div style={{ borderTop: '1.5px solid #000', paddingTop: '10px', fontWeight: 800 }}>{language === 'ar' ? 'توقيع المسؤول' : 'Signature du Responsable'}</div>
                    </div>
                    <div style={{ textAlign: 'center', width: '200px' }}>
                        <div style={{ borderTop: '1.5px solid #000', paddingTop: '10px', fontWeight: 800 }}>{language === 'ar' ? 'توقيع أمين المخزن' : 'Signature du Magasinier'}</div>
                    </div>
                </div>
            </div>

            {/* Premium Product Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="modal-overlay" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)'
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="card"
                            style={{ width: '550px', maxWidth: '95vw', padding: '2rem' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                <div>
                                    <h3 className="title-md">{editingProduct ? t.editProductTitle : t.addProductTitle}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t.accuracyMsg}</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: '#f1f5f9', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                                }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div>
                                            <label className="label">{t.productCode}</label>
                                            <input
                                                type="text" className="form-control" required
                                                value={formData.code}
                                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                                placeholder={t.productCodePlaceholder}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">{t.productName}</label>
                                            <input
                                                type="text" className="form-control" required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder={t.productNamePlaceholder}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div>
                                            <label className="label">{t.purchasePrice} ({settings.currency})</label>
                                            <input
                                                type="number" className="form-control" required
                                                value={formData.purchasePrice}
                                                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">{t.profitMargin}</label>
                                            <input
                                                type="number" className="form-control" required
                                                value={formData.margin}
                                                onChange={(e) => setFormData({ ...formData, margin: e.target.value })}
                                                placeholder="%"
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div>
                                            <label className="label">{t.productCategory}</label>
                                            <select
                                                className="form-control"
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            >
                                                <option value="catGeneral">{t.catGeneral}</option>
                                                <option value="catElectronics">{t.catElectronics}</option>
                                                <option value="catFood">{t.catFood}</option>
                                                <option value="catClothing">{t.catClothing}</option>
                                                <option value="catCosmetics">{t.catCosmetics}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">{t.minThresholdLabel}</label>
                                            <input
                                                type="number" className="form-control" required
                                                value={formData.minThreshold}
                                                onChange={(e) => setFormData({ ...formData, minThreshold: e.target.value })}
                                                placeholder={t.minThresholdPlaceholder}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div>
                                            <label className="label">{t.sellPrice} ({settings.currency})</label>
                                            <input
                                                type="number" className="form-control" required
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">{t.availableQty}</label>
                                            <input
                                                type="number" className="form-control" required
                                                value={formData.quantity}
                                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '50px', justifyContent: 'center' }}>
                                        <Save size={18} />
                                        <span>{editingProduct ? t.updateData : t.saveToStock}</span>
                                    </button>
                                    <button type="button" className="btn btn-outline" style={{ flex: 1, height: '50px', justifyContent: 'center' }} onClick={() => setIsModalOpen(false)}>
                                        {t.cancelProcess}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Products;

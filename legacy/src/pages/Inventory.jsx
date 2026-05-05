import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import {
    Box,
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownLeft,
    AlertTriangle,
    CheckCircle2,
    X,
    Database,
    DollarSign,
    Printer
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { fNum, fDate, fDateTime } from '../utils/format';

const Inventory = () => {
    const { products, sales, settings, language } = useAppStore();
    const t = translations[language];
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [activeTab, setActiveTab] = useState('monitor'); // 'monitor' or 'movements'

    // Calculate inventory movements from sales and additions
    const inventoryMovements = [];
    products.forEach(p => {
        // Initial stock (simplified for demo)
        inventoryMovements.push({
            id: `init-${p.id}`,
            productId: p.id,
            productName: p.name,
            type: 'addition',
            quantityChange: p.quantity,
            date: new Date().toISOString(), // In real app, this would be creation date
            newStock: p.quantity
        });
    });

    sales.forEach(s => {
        s.items.forEach(item => {
            inventoryMovements.push({
                id: `sale-${s.id}-${item.id}`,
                productId: item.id,
                productName: item.name,
                type: 'sale',
                quantityChange: -item.quantity,
                date: s.date,
                newStock: '?' // We'd need to calculate actual stock at that point in time
            });
        });
    });

    const getMovementTypeLabel = (type) => {
        switch (type) {
            case 'sale': return { text: t.sale, color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.1)', icon: ArrowUpRight };
            case 'addition': return { text: t.addition, color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.1)', icon: ArrowDownLeft };
            default: return { text: type, color: 'var(--text-muted)', bg: '#f1f5f9' };
        }
    };

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' ||
            (filterStatus === 'low' && p.quantity < 5 && p.quantity > 0) ||
            (filterStatus === 'out' && p.quantity === 0) ||
            (filterStatus === 'ok' && p.quantity >= 5);
        return matchesSearch && matchesStatus;
    });

    const lowStock = products.filter(p => p.quantity < 5 && p.quantity > 0);
    const outOfStock = products.filter(p => p.quantity === 0);
    const totalValue = products.reduce((sum, p) => sum + (p.purchasePrice ? p.purchasePrice * p.quantity : p.price * p.quantity * 0.8), 0);

    return (
        <div className="inventory-page scrollable-page" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
            {/* Screen UI: Hidden during print */}
            <div className="no-print">
                <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h2 className="title-lg">{activeTab === 'monitor' ? t.inventoryMonitor : t.inventoryHistory}</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t.inventorySubtitle}</p>
                    </div>
                    <div style={{ background: '#f1f5f9', padding: '0.4rem', borderRadius: '12px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                            onClick={() => setActiveTab('monitor')}
                            style={{
                                padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none',
                                background: activeTab === 'monitor' ? 'white' : 'transparent',
                                color: activeTab === 'monitor' ? 'var(--primary)' : '#64748b',
                                fontWeight: 800, cursor: 'pointer', boxShadow: activeTab === 'monitor' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                            }}
                        >
                            {t.inventoryMonitor}
                        </button>
                        <button
                            onClick={() => setActiveTab('movements')}
                            style={{
                                padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none',
                                background: activeTab === 'movements' ? 'white' : 'transparent',
                                color: activeTab === 'movements' ? 'var(--primary)' : '#64748b',
                                fontWeight: 800, cursor: 'pointer', boxShadow: activeTab === 'movements' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                            }}
                        >
                            {t.stockMovement}
                        </button>
                        <button
                            className="btn btn-outline"
                            onClick={() => window.print()}
                            style={{ padding: '0.6rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-light)', background: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: 'var(--text-main)', cursor: 'pointer' }}
                        >
                            <Printer size={18} color="green" /> {t.print}
                        </button>
                    </div>
                </div>

                {activeTab === 'monitor' ? (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                            <div className="card" style={{ [language === 'ar' ? 'borderRight' : 'borderLeft']: '4px solid var(--primary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <Box size={18} color="var(--primary)" />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.totalItems}</span>
                                </div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{products.length}</h3>
                            </div>
                            <div className="card" style={{ [language === 'ar' ? 'borderRight' : 'borderLeft']: '4px solid var(--warning)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <AlertTriangle size={18} color="var(--warning)" />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.lowStockItems}</span>
                                </div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>{lowStock.length}</h3>
                            </div>
                            <div className="card" style={{ [language === 'ar' ? 'borderRight' : 'borderLeft']: '4px solid var(--danger)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <X size={18} color="var(--danger)" />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.outOfStockItems}</span>
                                </div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>{outOfStock.length}</h3>
                            </div>
                            <div className="card" style={{ [language === 'ar' ? 'borderRight' : 'borderLeft']: '4px solid var(--success)', background: 'rgba(16, 185, 129, 0.02)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <DollarSign size={18} color="var(--success)" />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.totalInventoryValue}</span>
                                </div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{fNum(totalValue)} {settings.currency}</h3>
                            </div>
                        </div>

                        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', marginBottom: '2rem' }}>
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
                                    <option value="ok">{t.abundance}</option>
                                    <option value="low">{t.lowStockItems}</option>
                                    <option value="out">{t.outOfStockFilter}</option>
                                </select>
                            </div>
                        </div>

                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.productName}</th>
                                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.productCode}</th>
                                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.productQty}</th>
                                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.purchasePrice}</th>
                                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.productPrice}</th>
                                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.totalValueLabel}</th>
                                            <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>{t.stockDensity}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(p => (
                                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)' }}>
                                                    <code>{p.code}</code>
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{
                                                            fontWeight: 800,
                                                            color: p.quantity === 0 ? 'var(--danger)' : p.quantity < 5 ? 'var(--warning)' : 'var(--text-main)'
                                                        }}>
                                                            {p.quantity}
                                                        </span>
                                                        {p.quantity === 0 ? <X size={14} color="var(--danger)" /> : p.quantity < 5 ? <AlertTriangle size={14} color="var(--warning)" /> : <CheckCircle2 size={14} color="var(--success)" />}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                                    {fNum(p.purchasePrice || 0)} {settings.currency}
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>
                                                    {fNum(p.price)} {settings.currency}
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                                                    {fNum(p.purchasePrice ? p.purchasePrice * p.quantity : p.price * p.quantity * 0.8)} {settings.currency}
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem', width: '200px' }}>
                                                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                                                        <div style={{
                                                            position: 'absolute', top: 0, [language === 'ar' ? 'right' : 'left']: 0, height: '100%',
                                                            width: `${Math.min((p.quantity / 50) * 100, 100)}%`,
                                                            background: p.quantity === 0 ? 'var(--danger)' : p.quantity < 5 ? 'var(--warning)' : 'var(--success)',
                                                            borderRadius: '4px'
                                                        }}></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filtered.length === 0 && (
                                <div style={{ padding: '5rem 0', textAlign: 'center', opacity: 0.3 }}>
                                    <p>{t.noMatchData}</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                                        <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.date}</th>
                                        <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.productName}</th>
                                        <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.movementType}</th>
                                        <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>{t.qtyChange}</th>
                                        <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>{t.newStock}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventoryMovements.map(m => {
                                        const typeInfo = getMovementTypeLabel(m.type);
                                        return (
                                            <tr key={m.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                                <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    {fDateTime(new Date(m.date), language)}
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700 }}>{m.productName}</td>
                                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                                    <span style={{
                                                        padding: '0.3rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800,
                                                        background: typeInfo.bg, color: typeInfo.color
                                                    }}>
                                                        {typeInfo.text}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center', fontWeight: 900, direction: 'ltr' }}>
                                                    <span style={{ color: m.quantityChange > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center', fontWeight: 800 }}>{m.newStock}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {inventoryMovements.length === 0 && (
                            <div style={{ padding: '5rem 0', textAlign: 'center', opacity: 0.3 }}>
                                <p>{t.noMatchData}</p>
                            </div>
                        )}
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
                            <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'center' }}>{t.productQty}</th>
                            <th style={{ padding: '8px', border: '1px solid #000', textAlign: 'center' }}>{t.totalValueLabel}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...products].sort((a, b) => a.name.localeCompare(b.name, language === 'ar' ? 'ar' : 'fr')).map((p, idx) => (
                            <tr key={idx} style={{ border: '1px solid #000' }}>
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
        </div>
    );
};

export default Inventory;

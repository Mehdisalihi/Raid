import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import {
    History,
    Search,
    Filter,
    Calendar,
    FileText,
    ShoppingCart,
    TrendingDown,
    RotateCcw,
    Download,
    Printer,
    ChevronRight,
    Eye,
    X,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '../i18n/translations';
import { fNum, fDate } from '../utils/format';

const Archive = () => {
    const { invoices, expenses, returns, settings, language } = useAppStore();
    const t = translations[language];
    const [activeTab, setActiveTab] = useState('sales');
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedItem, setSelectedItem] = useState(null);
    const itemsPerPage = 10;

    const tabs = [
        { id: 'sales', label: t.salesLog, icon: ShoppingCart },
        { id: 'expenses', label: t.expensesLog, icon: TrendingDown },
        { id: 'returns', label: t.returnsLog, icon: RotateCcw }
    ];

    const getFilteredData = () => {
        const query = searchTerm.toLowerCase();
        let baseData = [];
        switch (activeTab) {
            case 'sales': baseData = invoices; break;
            case 'expenses': baseData = expenses; break;
            case 'returns': baseData = returns; break;
            default: baseData = [];
        }

        return baseData.filter(item => {
            const matchesSearch = activeTab === 'sales' ? (item.invoiceNumber.toLowerCase().includes(query) || item.customerName.toLowerCase().includes(query)) :
                activeTab === 'expenses' ? (item.title.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)) :
                    item.customerName.toLowerCase().includes(query);

            const date = item.date;
            const matchesStartDate = !startDate || date >= startDate;
            const matchesEndDate = !endDate || date <= endDate;

            return matchesSearch && matchesStartDate && matchesEndDate;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const allFilteredData = getFilteredData();
    const totalPages = Math.ceil(allFilteredData.length / itemsPerPage);
    const paginatedData = allFilteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handlePrint = () => {
        window.print();
    };

    const exportToCSV = () => {
        let headers = [];
        let rows = [];
        const dateStr = new Date().toISOString().split('T')[0];

        if (activeTab === 'sales') {
            headers = [t.csvHeadersArchiveSales];
            rows = allFilteredData.map(i => `${i.date},${i.invoiceNumber},${i.customerName},${i.total},${i.status}`);
        } else if (activeTab === 'expenses') {
            headers = [t.csvHeadersArchiveExpenses];
            rows = allFilteredData.map(e => `${e.date},${e.title},${e.category},${e.amount}`);
        } else {
            headers = [t.csvHeadersArchiveReturns];
            rows = allFilteredData.map(r => `${r.date},${r.id},${r.customerName},${r.totalReturn}`);
        }

        const csvContent = headers.concat(rows).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `archive_${activeTab}_${dateStr}.csv`;
        link.click();
    };

    return (
        <div className="archive-page scrollable-page" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h2 className="title-lg">{t.archiveTitle}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t.archiveSubtitle}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-outline" onClick={handlePrint}><Printer size={18} /> {t.printLog}</button>
                    <button className="btn btn-outline" onClick={exportToCSV}><Download size={18} /> {t.exportExcel}</button>
                </div>
            </div>

            <div className="card" style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: '#f1f5f9', border: 'none' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
                        style={{
                            flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none', cursor: 'pointer',
                            background: activeTab === tab.id ? 'white' : 'transparent',
                            boxShadow: activeTab === tab.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                            fontWeight: 700, color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <tab.icon size={18} /> {tab.label}
                    </button>
                ))}
            </div>

            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <input
                        type="text"
                        placeholder={t.searchIn.replace('{tab}', tabs.find(tabItem => tabItem.id === activeTab).label)}
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="form-control"
                        style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '40px' }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t.from}</span>
                    <input type="date" className="form-control" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t.to}</span>
                    <input type="date" className="form-control" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }} />
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.date}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.statementEntity}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.reference}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.total}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {paginatedData.map((item, idx) => (
                                <motion.tr
                                    key={item.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ borderBottom: '1px solid var(--border-light)' }}
                                    whileHover={{ background: '#f8fafc' }}
                                >
                                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={14} />
                                            {item.date} {item.time ? `| ${item.time}` : ''}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ fontWeight: 700 }}>
                                            {activeTab === 'sales' ? item.customerName :
                                                activeTab === 'expenses' ? item.title :
                                                    item.customerName}
                                        </div>
                                        {activeTab === 'expenses' && <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{item.category}</p>}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem' }}>
                                        <code>{item.invoiceNumber || item.id}</code>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 800, color: activeTab === 'expenses' || activeTab === 'returns' ? 'var(--danger)' : 'var(--success)' }}>
                                        {activeTab === 'sales' ? fNum(item.total) :
                                            activeTab === 'expenses' ? fNum(item.amount) :
                                                fNum(item.totalReturn)} {settings.currency}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                        <button
                                            className="icon-btn"
                                            style={{ margin: '0 auto' }}
                                            onClick={() => setSelectedItem(item)}
                                        >
                                            <Eye size={18} color="var(--primary)" />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
                {paginatedData.length === 0 && (
                    <div style={{ padding: '5rem 0', textAlign: 'center', opacity: 0.3 }}>
                        <History size={48} style={{ margin: '0 auto 1rem' }} />
                        <p>{t.noDataInSection}</p>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', gap: '0.5rem' }}>
                    <button className="btn btn-outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>{t.prev}</button>
                    {[...Array(totalPages)].map((_, i) => (
                        <button key={i + 1} className={`btn ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCurrentPage(i + 1)} style={{ width: '40px', padding: 0, justifyContent: 'center' }}>
                            {i + 1}
                        </button>
                    ))}
                    <button className="btn btn-outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>{t.next}</button>
                </div>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
                            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '1rem'
                        }}
                        onClick={() => setSelectedItem(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            style={{
                                background: 'white', padding: '2rem', borderRadius: '24px',
                                width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                                <h3 style={{ fontWeight: 900 }}>{t.invoiceDetails}</h3>
                                <button className="icon-btn" onClick={() => setSelectedItem(null)}><X size={20} /></button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.date} & {t.time}</label>
                                    <p style={{ fontWeight: 700 }}>{selectedItem.date} {selectedItem.time}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.customer || t.expenseTitle}</label>
                                    <p style={{ fontWeight: 700 }}>{activeTab === 'sales' ? selectedItem.customerName : activeTab === 'expenses' ? selectedItem.title : selectedItem.customerName}</p>
                                </div>

                                {activeTab === 'sales' && (
                                    <>
                                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>{t.items}</label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {selectedItem.items.map((item, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                        <span>{item.name} x{item.quantity}</span>
                                                        <span style={{ fontWeight: 700 }}>{fNum(item.price * item.quantity)} {settings.currency}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600 }}>{t.finalTotal}</span>
                                    <span style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--primary)' }}>
                                        {activeTab === 'sales' ? fNum(selectedItem.total) : activeTab === 'expenses' ? fNum(selectedItem.amount) : fNum(selectedItem.totalReturn)} {settings.currency}
                                    </span>
                                </div>

                                {selectedItem.paymentMethod && (
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.paymentStatus}</label>
                                        <p style={{ fontWeight: 700, color: 'var(--success)' }}>{t[selectedItem.paymentMethod] || selectedItem.paymentMethod}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Print-only archive area */}
            <div className="print-only" style={{ direction: language === 'ar' ? 'rtl' : 'ltr', fontFamily: 'Cairo, sans-serif' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #000', paddingBottom: '15px', marginBottom: '25px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.8rem' }}>{settings.businessName}</h2>
                        <p style={{ margin: '4px 0 0' }}>{settings.address}</p>
                        <p style={{ margin: 0 }}>{settings.phone}</p>
                    </div>
                    <div style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>
                        <h1 style={{ margin: 0, fontSize: '2rem' }}>
                            {tabs.find(tab => tab.id === activeTab)?.label}
                        </h1>
                        <p style={{ fontWeight: 700, margin: '4px 0 0' }}>
                            {startDate && `${t.from}: ${startDate}`} {endDate && `${t.to}: ${endDate}`}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>
                            {fDate(new Date(), language)}
                        </p>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ border: '1px solid #000', padding: '8px', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.date}</th>
                            <th style={{ border: '1px solid #000', padding: '8px', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.statementEntity}</th>
                            <th style={{ border: '1px solid #000', padding: '8px', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.reference}</th>
                            <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{t.total}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allFilteredData.map((item, idx) => (
                            <tr key={idx}>
                                <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '0.8rem' }}>{item.date} {item.time ? `| ${item.time}` : ''}</td>
                                <td style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 700 }}>
                                    {activeTab === 'sales' ? item.customerName :
                                        activeTab === 'expenses' ? item.title :
                                            item.customerName}
                                </td>
                                <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '0.8rem' }}>{item.invoiceNumber || item.id}</td>
                                <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 800 }}>
                                    {activeTab === 'sales' ? fNum(item.total) :
                                        activeTab === 'expenses' ? fNum(item.amount) :
                                            fNum(item.totalReturn)} {settings.currency}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: '#f1f5f9' }}>
                            <td colSpan="3" style={{ border: '1px solid #000', padding: '10px', fontWeight: 900, textAlign: language === 'ar' ? 'left' : 'right' }}>
                                {t.finalTotal} ({allFilteredData.length} {language === 'ar' ? 'سجل' : 'enregistrements'})
                            </td>
                            <td style={{ border: '1px solid #000', padding: '10px', fontWeight: 900, textAlign: 'center' }}>
                                {fNum(allFilteredData.reduce((sum, item) =>
                                    sum + (activeTab === 'sales' ? item.total : activeTab === 'expenses' ? item.amount : item.totalReturn), 0
                                ))} {settings.currency}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default Archive;

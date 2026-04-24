import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import {
    RotateCcw,
    Search,
    User,
    Package,
    Trash,
    Save,
    X,
    CheckCircle2,
    AlertCircle,
    Clock,
    ChevronRight,
    FileText,
    Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '../i18n/translations';
import { fNum, fTime } from '../utils/format';

const Returns = () => {
    const {
        invoices,
        processReturn,
        settings,
        language
    } = useAppStore();
    const t = translations[language];

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [returnItems, setReturnItems] = useState([]);
    const [isSuccess, setIsSuccess] = useState(false);
    const [lastReturn, setLastReturn] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filteredInvoices = invoices.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectInvoice = (inv) => {
        setSelectedInvoice(inv);
        setReturnItems(inv.items.map(item => ({ ...item, returnQty: 0 })));
    };

    const updateReturnQty = (itemId, newQty) => {
        const item = returnItems.find(i => i.id === itemId);
        if (!item || newQty < 0 || newQty > item.quantity) return;
        setReturnItems(returnItems.map(item =>
            item.id === itemId ? { ...item, returnQty: newQty } : item
        ));
    };

    const deleteReturnItem = (itemId) => {
        setReturnItems(returnItems.filter(i => i.id !== itemId));
    };

    const totalReturnValue = returnItems.reduce((sum, item) => sum + (item.price * item.returnQty), 0);
    const paginatedItems = returnItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(returnItems.length / itemsPerPage);

    const handleProcessReturn = () => {
        const returnedProducts = returnItems.filter(item => item.returnQty > 0);
        if (returnedProducts.length === 0) {
            alert(t.selectItemsToReturn);
            return;
        }

        const returnData = {
            id: Date.now(),
            originalInvoiceId: selectedInvoice.id,
            customerId: selectedInvoice.customerId,
            customerName: selectedInvoice.customerName,
            items: returnedProducts,
            totalReturn: totalReturnValue,
            date: new Date().toISOString().split('T')[0],
            time: fTime(new Date(), language)
        };

        processReturn(returnData);
        setLastReturn(returnData);
        setIsSuccess(true);
        setTimeout(() => {
            setIsSuccess(false);
            setSelectedInvoice(null);
            setReturnItems([]);
            setSearchTerm('');
        }, 5000);
    };

    if (isSuccess) {
        return (
            <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card" style={{ textAlign: 'center', padding: '3rem', borderRadius: '32px', maxWidth: '500px' }}>
                    <div style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', color: 'var(--success)' }}>
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 style={{ fontWeight: 900, marginBottom: '0.5rem' }}>{t.returnSuccess}</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>#{lastReturn?.id}</p>

                    <div style={{
                        background: '#f8fafc', padding: '1.5rem', borderRadius: '20px',
                        marginBottom: '2rem', textAlign: language === 'ar' ? 'right' : 'left'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{t.customer}:</span>
                            <span style={{ fontWeight: 700 }}>{lastReturn?.customerName || t.generalCustomer}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{t.totalReturnValue}:</span>
                            <span style={{ fontWeight: 900, color: 'var(--danger)', fontSize: '1.25rem' }}>
                                {fNum(lastReturn?.totalReturn)} {settings.currency}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-primary" style={{ flex: 1, background: 'var(--danger)' }} onClick={() => window.print()}><Printer size={18} /> {t.printInvoice}</button>
                        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsSuccess(false)}>{t.back}</button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <>
            <div className="returns-page scrollable-page" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                <div style={{ marginBottom: '2.5rem' }}>
                    <h2 className="title-lg">{t.returnTitle}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t.returnSubtitle}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', height: 'calc(100vh - 220px)' }}>
                    {/* Search & Select Invoice */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'hidden' }}>
                        <div className="card" style={{ padding: '0.75rem 1.25rem' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                                <input
                                    type="text"
                                    placeholder={t.searchSalePlaceholder}
                                    className="form-control"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '40px', border: 'none', background: 'transparent' }}
                                />
                            </div>
                        </div>

                        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.25rem' }}>
                            {filteredInvoices.map(inv => (
                                <motion.div
                                    key={inv.id}
                                    whileHover={{ x: language === 'ar' ? -4 : 4 }}
                                    onClick={() => handleSelectInvoice(inv)}
                                    className="card"
                                    style={{
                                        padding: '1.25rem', cursor: 'pointer',
                                        border: selectedInvoice?.id === inv.id ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                                        background: selectedInvoice?.id === inv.id ? 'rgba(79, 70, 229, 0.02)' : 'white'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{inv.invoiceNumber}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inv.date}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <User size={14} color="var(--text-light)" />
                                        <span style={{ fontWeight: 700 }}>{inv.customerName || t.generalCustomer}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{inv.items.length} {t.itemsCount}</span>
                                        <span style={{ fontWeight: 800 }}>{fNum(inv.total)} {settings.currency}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Return Processing Panel */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '2rem' }}>
                        {!selectedInvoice ? (
                            <div style={{ textAlign: 'center', padding: '5rem 0', opacity: 0.3, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <RotateCcw size={64} style={{ margin: '0 auto 1.5rem' }} />
                                <p>{t.selectInvoiceToReturn}</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 className="title-md">{t.invoiceHash}{selectedInvoice.invoiceNumber}</h3>
                                        <button className="icon-btn" onClick={() => setSelectedInvoice(null)}><X size={20} /></button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '2rem' }}>
                                        <div style={{ fontSize: '0.85rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>{t.customer}: </span>
                                            <span style={{ fontWeight: 700 }}>{selectedInvoice.customerName || t.generalCustomer}</span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>{t.totalAmount}: </span>
                                            <span style={{ fontWeight: 700 }}>{fNum(selectedInvoice.total)} {settings.currency}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                                        <Package size={18} />
                                        <h4 style={{ fontSize: '1rem' }}>{t.selectedInvoiceItems}</h4>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {paginatedItems.map(item => (
                                            <div key={item.id} style={{
                                                padding: '1.25rem', background: '#f8fafc', borderRadius: '12px',
                                                display: 'flex', alignItems: 'center', gap: '1.5rem'
                                            }}>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.name}</p>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.soldQty}: {item.quantity}</p>
                                                </div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t.returnQty}</label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <button className="icon-btn" style={{ width: '28px', height: '28px' }} onClick={() => updateReturnQty(item.id, item.returnQty - 1)}>-</button>
                                                        <input
                                                            type="number"
                                                            style={{ width: '50px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '1rem', fontWeight: 700 }}
                                                            value={item.returnQty}
                                                            onChange={(e) => updateReturnQty(item.id, parseInt(e.target.value) || 0)}
                                                        />
                                                        <button className="icon-btn" style={{ width: '28px', height: '28px' }} onClick={() => updateReturnQty(item.id, item.returnQty + 1)}>+</button>
                                                    </div>
                                                </div>
                                                <div style={{ width: '100px', textAlign: language === 'ar' ? 'left' : 'right' }}>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.total}</p>
                                                    <p style={{ fontWeight: 800, color: 'var(--danger)' }}>{fNum(item.price * item.returnQty)}</p>
                                                </div>
                                                <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => deleteReturnItem(item.id)} title={t.delete}><X size={18} /></button>
                                            </div>
                                        ))}
                                        {totalPages > 1 && (
                                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', gap: '0.5rem' }}>
                                                <button className="btn btn-outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>{t.prev}</button>
                                                <span style={{ alignSelf: 'center' }}>{t.page} {currentPage} {t.of} {totalPages}</span>
                                                <button className="btn btn-outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>{t.next}</button>
                                            </div>
                                        )}                                </div>
                                </div>

                                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '18px', marginBottom: '1.5rem', border: '1px dashed rgba(239, 68, 68, 0.2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 700 }}>{t.totalReturnValue}</p>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.returnConfirmMsg}</p>
                                        </div>
                                        <span style={{ fontWeight: 800, fontSize: '1.75rem', color: 'var(--danger)' }}>
                                            {fNum(totalReturnValue)} {settings.currency}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    className="btn btn-primary"
                                    style={{ height: '56px', justifyContent: 'center', fontSize: '1.1rem', background: 'var(--danger)' }}
                                    onClick={handleProcessReturn}
                                    disabled={totalReturnValue === 0}
                                >
                                    <RotateCcw size={20} /> {t.confirmReturn}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Printable Area (Hidden in UI) */}
            <div id="printable-invoice" style={{ display: 'none' }}>
                <style>{`
                    @media print {
                        @page { size: A4; margin: 20mm; }
                        body { margin: 0; }
                        #printable-invoice, #printable-invoice * { visibility: visible; }
                        #printable-invoice { 
                            position: absolute; 
                            left: 0; 
                            top: 0; 
                            width: 210mm; 
                            min-height: 297mm;
                            padding: 0; 
                            margin: 0;
                            direction: \${language === 'ar' ? 'rtl' : 'ltr'}; 
                            background: white;
                        }
                        .print-header { 
                            border-bottom: 3px solid #000; 
                            padding-bottom: 15px; 
                            margin-bottom: 30px; 
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-end;
                        }
                        .print-footer { 
                            margin-top: 50px; 
                            border-top: 2px solid #000; 
                            padding-top: 20px; 
                            text-align: center;
                            font-size: 0.9rem;
                        }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #000; padding: 12px; }
                        h2 { margin: 0; font-size: 2rem; }
                        .invoice-info { margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    }
                `}</style>
                <div className="print-header">
                    <div>
                        <h2>{settings.businessName}</h2>
                        <p>{settings.address}</p>
                        <p>{settings.phone}</p>
                    </div>
                    <div style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>
                        <h1 style={{ margin: 0, color: '#000', fontSize: '2.5rem' }}>{language === 'ar' ? 'فاتورة مرتجع' : 'FACTURE DE RETOUR'}</h1>
                        <p style={{ fontWeight: 800 }}>#{lastReturn?.id}</p>
                    </div>
                </div>

                <div className="invoice-info">
                    <div>
                        <p><strong>{t.customer}:</strong> {lastReturn?.customerName || t.generalCustomer}</p>
                        <p><strong>{t.date}:</strong> {lastReturn?.date}</p>
                        <p><strong>{t.time}:</strong> {lastReturn?.time}</p>
                    </div>
                    <div style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>
                        <p><strong>{language === 'ar' ? 'تحديث المخزن' : 'Stock mis à jour'}:</strong> {lastReturn?.items.length} {t.itemsCount}</p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{t.productName}</th>
                            <th style={{ textAlign: 'center' }}>{t.qty}</th>
                            <th style={{ textAlign: 'center' }}>{t.price}</th>
                            <th style={{ textAlign: 'center' }}>{t.total}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lastReturn?.items.map((item, idx) => (
                            <tr key={idx}>
                                <td>{item.name}</td>
                                <td style={{ textAlign: 'center' }}>{item.returnQty}</td>
                                <td style={{ textAlign: 'center' }}>{fNum(item.price)}</td>
                                <td style={{ textAlign: 'center' }}>{fNum(item.price * item.returnQty)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: '#000', color: '#fff' }}>
                            <td colSpan="3" style={{ textAlign: language === 'ar' ? 'left' : 'right', fontWeight: 'bold', fontSize: '1.2rem' }}>{t.totalReturnValue}</td>
                            <td style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '1.2rem' }}>{fNum(lastReturn?.totalReturn)} {settings.currency}</td>
                        </tr>
                    </tfoot>
                </table>

                <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ textAlign: 'center', width: '200px' }}>
                        <div style={{ borderTop: '1px solid #000', paddingTop: '10px' }}>{language === 'ar' ? 'توقيع المورد' : 'Signature du fournisseur'}</div>
                    </div>
                    <div style={{ textAlign: 'center', width: '200px' }}>
                        <div style={{ borderTop: '1px solid #000', paddingTop: '10px' }}>{language === 'ar' ? 'توقيع المستلم' : 'Signature du destinataire'}</div>
                    </div>
                </div>

                <div className="print-footer">
                    <p>{t.thanks}</p>
                </div>
            </div>
        </>
    );
};

export default Returns;

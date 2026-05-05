import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import {
    Search,
    Eye,
    Calendar,
    User,
    Printer,
    X,
    ShoppingCart,
    Download,
    Pencil,
    Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '../i18n/translations';
import { fNum } from '../utils/format';

const Sales = () => {
    const { invoices, settings, language, deleteInvoice, updateInvoice } = useAppStore();
    const t = translations[language];
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSale, setSelectedSale] = useState(null);
    const [editSale, setEditSale] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const paymentMethods = ['cash', 'assadad', 'bankily', 'masrvi', 'bcipay', 'amanty', 'click', 'bficash', 'bimbank', 'debt'];

    const handleDelete = (id) => {
        deleteInvoice(id);
        setDeleteConfirm(null);
        if (selectedSale?.id === id) setSelectedSale(null);
    };

    const handleEditOpen = (sale) => {
        setEditSale(sale);
        setEditForm({ paymentMethod: sale.paymentMethod, discount: sale.discount || 0, notes: sale.notes || '' });
    };

    const handleEditSave = () => {
        updateInvoice(editSale.id, { ...editForm });
        setEditSale(null);
    };

    const filteredSales = invoices.filter(s =>
        s.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.customerName && s.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
    ).reverse();

    return (
        <div className="sales-page scrollable-page" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h2 className="title-lg">{t.saleHistory}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t.salesSubtitle}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-outline" onClick={() => window.print()}><Printer size={18} color="green" /> {t.printDaily}</button>
                    <button className="btn btn-outline"><Download size={18} /> {t.exportStatement}</button>
                </div>
            </div>

            <div className="card no-print" style={{ padding: '0.75rem 1.25rem', marginBottom: '2rem' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <input
                        type="text"
                        placeholder={t.searchSalePlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-control"
                        style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '40px', border: 'none', background: 'transparent' }}
                    />
                </div>
            </div>

            <div className="card no-print" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.invoiceNum}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.customer}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.dateTime}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.totalAmount}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>{t.status}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {filteredSales.map(sale => (
                                <motion.tr
                                    key={sale.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ borderBottom: '1px solid var(--border-light)' }}
                                    whileHover={{ background: '#f8fafc' }}
                                >
                                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                                        {t.invoiceHash}{sale.invoiceNumber}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <User size={14} color="var(--text-light)" />
                                            <span style={{ fontWeight: 600 }}>{sale.customerName || t.generalCustomer}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={14} />
                                            {sale.date} {sale.time ? `| ${sale.time}` : ''}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 800 }}>
                                        {fNum(sale.total)} {settings.currency}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem', borderRadius: '4px',
                                            background: sale.status === 'paid' ? (
                                                sale.paymentMethod === 'bankily' ? 'rgba(225, 29, 72, 0.1)' :
                                                    sale.paymentMethod === 'masrivi' ? 'rgba(22, 163, 74, 0.1)' :
                                                        sale.paymentMethod === 'bemis' ? 'rgba(37, 99, 235, 0.1)' :
                                                            sale.paymentMethod === 'assadad' ? 'rgba(8, 145, 178, 0.1)' :
                                                                sale.paymentMethod === 'bcipay' ? 'rgba(79, 70, 229, 0.1)' :
                                                                    sale.paymentMethod === 'bimbank' ? 'rgba(124, 58, 237, 0.1)' :
                                                                        sale.paymentMethod === 'amanty' ? 'rgba(219, 39, 119, 0.1)' :
                                                                            sale.paymentMethod === 'click' ? 'rgba(234, 88, 12, 0.1)' :
                                                                                sale.paymentMethod === 'bficash' ? 'rgba(101, 163, 13, 0.1)' :
                                                                                    'rgba(16, 185, 129, 0.1)'
                                            ) : 'rgba(245, 158, 11, 0.1)',
                                            color: sale.status === 'paid' ? (
                                                sale.paymentMethod === 'bankily' ? '#e11d48' :
                                                    sale.paymentMethod === 'masrivi' ? '#16a34a' :
                                                        sale.paymentMethod === 'bemis' ? '#2563eb' :
                                                            sale.paymentMethod === 'assadad' ? '#0891b2' :
                                                                sale.paymentMethod === 'bcipay' ? '#4f46e5' :
                                                                    sale.paymentMethod === 'bimbank' ? '#7c3aed' :
                                                                        sale.paymentMethod === 'amanty' ? '#db2777' :
                                                                            sale.paymentMethod === 'click' ? '#ea580c' :
                                                                                sale.paymentMethod === 'bficash' ? '#65a30d' :
                                                                                    'var(--success)'
                                            ) : 'var(--warning)',
                                            fontSize: '0.75rem', fontWeight: 700
                                        }}>
                                            {sale.status === 'paid' ? (
                                                sale.paymentMethod === 'bankily' ? t.bankily :
                                                    sale.paymentMethod === 'masrivi' ? t.masrvi :
                                                        sale.paymentMethod === 'bemis' ? t.bemis :
                                                            sale.paymentMethod === 'assadad' ? t.assadad :
                                                                sale.paymentMethod === 'bcipay' ? t.bcipay :
                                                                    sale.paymentMethod === 'bimbank' ? t.bimbank :
                                                                        sale.paymentMethod === 'amanty' ? t.amanty :
                                                                            sale.paymentMethod === 'click' ? t.click :
                                                                                sale.paymentMethod === 'bficash' ? t.bficash :
                                                                                    t.paidCash
                                            ) : t.debtLabel}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                                            <button className="icon-btn" onClick={() => setSelectedSale(sale)} title={t.viewDetails}>
                                                <Eye size={18} color="var(--primary)" />
                                            </button>
                                            <button className="icon-btn" onClick={() => handleEditOpen(sale)} title={t.edit || 'تعديل'}>
                                                <Pencil size={18} color="var(--warning)" />
                                            </button>
                                            <button className="icon-btn" onClick={() => setDeleteConfirm(sale.id)} title={t.delete || 'حذف'}>
                                                <Trash2 size={18} color="var(--danger)" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
                {filteredSales.length === 0 && (
                    <div style={{ padding: '5rem 0', textAlign: 'center', opacity: 0.3 }}>
                        <ShoppingCart size={48} style={{ margin: '0 auto 1.5rem' }} />
                        <p>{t.noSalesMatch}</p>
                    </div>
                )}
            </div>

            {/* Premium Sale Detail Modal */}
            <AnimatePresence>
                {selectedSale && (
                    <div className="modal-overlay no-print" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)',
                        direction: language === 'ar' ? 'rtl' : 'ltr'
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="card"
                            style={{ width: '650px', maxWidth: '95vw', padding: '2.5rem' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                <div>
                                    <h3 className="title-md">{t.invoiceDetails} {t.invoiceHash}{selectedSale.invoiceNumber}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t.issuedOn} {selectedSale.date} | {selectedSale.time}</p>
                                </div>
                                <button onClick={() => setSelectedSale(null)} style={{
                                    width: '36px', height: '36px', borderRadius: '4px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: '#f1f5f9', border: 'none', cursor: 'pointer'
                                }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '16px' }}>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{t.customer}</p>
                                    <p style={{ fontWeight: 700 }}>{selectedSale.customerName || t.generalCustomer}</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{t.paymentStatus}</p>
                                    <span style={{
                                        color: selectedSale.status === 'paid' ? (
                                            selectedSale.paymentMethod === 'bankily' ? '#e11d48' :
                                                selectedSale.paymentMethod === 'masrivi' ? '#16a34a' :
                                                    selectedSale.paymentMethod === 'bemis' ? '#2563eb' :
                                                        selectedSale.paymentMethod === 'assadad' ? '#0891b2' :
                                                            selectedSale.paymentMethod === 'bcipay' ? '#4f46e5' :
                                                                selectedSale.paymentMethod === 'bimbank' ? '#7c3aed' :
                                                                    selectedSale.paymentMethod === 'amanty' ? '#db2777' :
                                                                        selectedSale.paymentMethod === 'click' ? '#ea580c' :
                                                                            selectedSale.paymentMethod === 'bficash' ? '#65a30d' :
                                                                                'var(--success)'
                                        ) : 'var(--warning)',
                                        fontWeight: 800
                                    }}>
                                        {selectedSale.status === 'paid' ? (
                                            selectedSale.paymentMethod === 'bankily' ? t.bankily :
                                                selectedSale.paymentMethod === 'masrivi' ? t.masrvi :
                                                    selectedSale.paymentMethod === 'bemis' ? t.bemis :
                                                        selectedSale.paymentMethod === 'assadad' ? t.assadad :
                                                            selectedSale.paymentMethod === 'bcipay' ? t.bcipay :
                                                                selectedSale.paymentMethod === 'bimbank' ? t.bimbank :
                                                                    selectedSale.paymentMethod === 'amanty' ? t.amanty :
                                                                        selectedSale.paymentMethod === 'click' ? t.click :
                                                                            selectedSale.paymentMethod === 'bficash' ? t.bficash :
                                                                                t.paidCash
                                        ) : t.dueDebt}
                                    </span>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{t.finalTotal}</p>
                                    <p style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>{fNum(selectedSale.total)} {settings.currency}</p>
                                </div>
                            </div>

                            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '2rem', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                                        <tr>
                                            <th style={{ padding: '1rem', textAlign: language === 'ar' ? 'right' : 'left', fontSize: '0.8rem', borderBottom: '1px solid var(--border-light)' }}>{t.productName}</th>
                                            <th style={{ padding: '1rem', textAlign: language === 'ar' ? 'right' : 'left', fontSize: '0.8rem', borderBottom: '1px solid var(--border-light)' }}>{t.price}</th>
                                            <th style={{ padding: '1rem', textAlign: language === 'ar' ? 'right' : 'left', fontSize: '0.8rem', borderBottom: '1px solid var(--border-light)' }}>{t.qty}</th>
                                            <th style={{ padding: '1rem', textAlign: language === 'ar' ? 'right' : 'left', fontSize: '0.8rem', borderBottom: '1px solid var(--border-light)' }}>{t.total}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedSale.items.map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>{item.name}</td>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{fNum(item.price)}</td>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{item.quantity}</td>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 700 }}>{fNum(item.price * item.quantity)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn btn-primary" style={{ flex: 1, height: '48px', justifyContent: 'center' }} onClick={() => window.print()}>
                                    <Printer size={18} color="green" /> {t.printInvoice}
                                </button>
                                <button className="btn btn-outline" style={{ flex: 1, height: '48px', justifyContent: 'center' }} onClick={() => setSelectedSale(null)}>
                                    {t.close}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirm && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, backdropFilter: 'blur(8px)', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="card" style={{ padding: '2rem', maxWidth: '400px', width: '90vw', textAlign: 'center' }}>
                            <Trash2 size={40} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
                            <h3 style={{ marginBottom: '0.5rem' }}>{language === 'ar' ? 'تأكيد الحذف' : 'Confirmer la suppression'}</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>{language === 'ar' ? 'هل أنت متأكد من حذف هذه الفاتورة؟ سيتم إعادة المخزون.' : 'Êtes-vous sûr de vouloir supprimer cette facture ?'}</p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDeleteConfirm(null)}>{t.close}</button>
                                <button className="btn" style={{ flex: 1, background: 'var(--danger)', color: 'white' }} onClick={() => handleDelete(deleteConfirm)}>{t.delete || 'حذف'}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editSale && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, backdropFilter: 'blur(8px)', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="card" style={{ padding: '2rem', maxWidth: '480px', width: '90vw' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>{t.edit || 'تعديل'} #{editSale.invoiceNumber}</h3>
                                <button onClick={() => setEditSale(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                            </div>

                            <label className="label">{t.paymentMethod || 'طريقة الدفع'}</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                {paymentMethods.map(method => (
                                    <button key={method} onClick={() => setEditForm(f => ({ ...f, paymentMethod: method }))} style={{ padding: '0.5rem', background: editForm.paymentMethod === method ? 'var(--primary)' : 'white', color: editForm.paymentMethod === method ? 'white' : 'var(--text-muted)', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                                        {t[method] || method}
                                    </button>
                                ))}
                            </div>

                            <label className="label">{t.discount || 'الخصم'}</label>
                            <input type="number" className="form-control" style={{ marginBottom: '1.5rem' }} value={editForm.discount} onChange={e => setEditForm(f => ({ ...f, discount: Number(e.target.value) }))} min={0} />

                            <label className="label">{t.invoiceNotes || 'ملاحظات'}</label>
                            <textarea className="form-control" style={{ marginBottom: '1.5rem', resize: 'none' }} rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditSale(null)}>{t.close}</button>
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleEditSave}>{t.save || 'حفظ'}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Print-only invoice area shown during print */}
            <div className="print-only" style={{ direction: language === 'ar' ? 'rtl' : 'ltr', fontFamily: 'Cairo, sans-serif' }}>
                {selectedSale && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #000', paddingBottom: '15px', marginBottom: '30px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '2rem' }}>{settings.businessName}</h2>
                                <p style={{ margin: '4px 0 0' }}>{settings.address}</p>
                                <p style={{ margin: 0 }}>{settings.phone}</p>
                            </div>
                            <div style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>
                                <h1 style={{ margin: 0, color: '#000', fontSize: '2.5rem' }}>{language === 'ar' ? 'فاتورة' : 'FACTURE'}</h1>
                                <p style={{ fontWeight: 800, margin: '4px 0 0' }}>#{selectedSale.invoiceNumber}</p>
                            </div>
                        </div>
                        <div style={{ marginBottom: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <p><strong>{t.customer}:</strong> {selectedSale.customerName || t.generalCustomer}</p>
                                <p><strong>{t.date}:</strong> {selectedSale.date}</p>
                                <p><strong>{t.time}:</strong> {selectedSale.time}</p>
                            </div>
                            <div style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>
                                <p><strong>{t.paymentStatus}:</strong> {selectedSale.status === 'paid' ? (t[selectedSale.paymentMethod] || t.paidCash) : t.debtLabel}</p>
                            </div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: language === 'ar' ? 'right' : 'left', border: '1px solid #000', padding: '10px' }}>{t.productName}</th>
                                    <th style={{ textAlign: 'center', border: '1px solid #000', padding: '10px' }}>{t.qty}</th>
                                    <th style={{ textAlign: 'center', border: '1px solid #000', padding: '10px' }}>{t.price}</th>
                                    <th style={{ textAlign: 'center', border: '1px solid #000', padding: '10px' }}>{t.total}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedSale.items?.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ border: '1px solid #000', padding: '10px' }}>{item.name}</td>
                                        <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>{item.quantity}</td>
                                        <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>{fNum(item.price)}</td>
                                        <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>{fNum(item.price * item.quantity)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#000', color: '#fff' }}>
                                    <td colSpan="3" style={{ border: '1px solid #000', padding: '10px', textAlign: language === 'ar' ? 'left' : 'right', fontWeight: 'bold', fontSize: '1.1rem' }}>{t.finalTotal}</td>
                                    <td style={{ border: '1px solid #000', padding: '10px', fontWeight: 'bold', textAlign: 'center', fontSize: '1.1rem' }}>{fNum(selectedSale.total)} {settings.currency}</td>
                                </tr>
                            </tfoot>
                        </table>
                        <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ textAlign: 'center', width: '200px' }}>
                                <div style={{ borderTop: '1px solid #000', paddingTop: '10px' }}>{language === 'ar' ? 'توقيع المستلم' : 'Signature du destinataire'}</div>
                            </div>
                            <div style={{ textAlign: 'center', width: '200px' }}>
                                <div style={{ borderTop: '1px solid #000', paddingTop: '10px' }}>{language === 'ar' ? 'توقيع البائع' : 'Signature du vendeur'}</div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Sales;

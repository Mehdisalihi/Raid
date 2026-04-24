import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import {
    UserMinus,
    Search,
    DollarSign,
    Calendar,
    CreditCard,
    Tag,
    X,
    Save,
    ArrowUpRight,
    TrendingDown,
    ChevronRight,
    CheckCircle2,
    Clock,
    Trash,
    Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '../i18n/translations';
import { fNum } from '../utils/format';

const Debtors = () => {
    const { debts, updateDebt, deleteDebt, editDebt, settings, language } = useAppStore();
    const t = translations[language];
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [editFormData, setEditFormData] = useState({ id: '', customerName: '', date: '', notes: '', remaining: 0 });

    const handleEdit = (debt) => {
        setEditFormData({ ...debt });
        setIsEditModalOpen(true);
    };

    const submitEdit = (e) => {
        e.preventDefault();
        editDebt(editFormData.id, {
            ...editFormData,
            remaining: parseFloat(editFormData.remaining) || 0
        });
        setIsEditModalOpen(false);
    };

    const handleDelete = (id) => {
        if (window.confirm(t.confirmDeleteDebt)) {
            deleteDebt(id);
        }
    };

    const handlePay = (debt) => {
        setSelectedDebt(debt);
        setPaymentAmount('');
        setIsModalOpen(true);
    };

    const submitPayment = (e) => {
        e.preventDefault();
        const amount = parseFloat(paymentAmount);
        if (amount > selectedDebt.remaining) {
            alert(t.debtPaymentError);
            return;
        }

        updateDebt(selectedDebt.id, amount);
        setIsModalOpen(false);
    };

    const filteredDebts = debts.filter(d =>
        d.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalDebts = debts.reduce((sum, d) => sum + d.remaining, 0);

    return (
        <div className="debtors-page scrollable-page" style={{ direction: language === 'ar' ? 'rtl' : 'ltr', gap: '2rem', display: 'flex', flexDirection: 'column' }}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <div>
                    <h2 className="title-lg" style={{ color: 'white', fontWeight: 900, fontSize: '2rem' }}>{t.manageDebtors}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>{t.debtorsSubtitle}</p>
                </div>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card" style={{ padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <Search size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                        <input
                            type="text"
                            placeholder={t.searchCustomerPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-control"
                            style={{
                                paddingRight: language === 'ar' ? '40px' : '12px',
                                paddingLeft: language === 'ar' ? '12px' : '40px',
                                border: 'none', background: 'transparent', width: '100%', fontSize: '1rem'
                            }}
                        />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="card" style={{
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                        color: 'white', display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', border: 'none',
                        boxShadow: '0 10px 25px var(--primary-glow)'
                    }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                        <TrendingDown size={28} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 500, marginBottom: '2px' }}>{t.totalDebtsReceivable}</p>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 900 }}>{fNum(totalDebts)} <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{settings.currency}</span></h3>
                    </div>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ padding: '1.5rem', textAlign: language === 'ar' ? 'right' : 'left', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>{t.customer}</th>
                                <th style={{ padding: '1.5rem', textAlign: language === 'ar' ? 'right' : 'left', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>{t.date}</th>
                                <th style={{ padding: '1.5rem', textAlign: language === 'ar' ? 'right' : 'left', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>{t.notes}</th>
                                <th style={{ padding: '1.5rem', textAlign: language === 'ar' ? 'right' : 'left', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>{t.remainingAmount}</th>
                                <th style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>{t.debtStatusLabel}</th>
                                <th style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {filteredDebts.map((debt, idx) => (
                                    <motion.tr
                                        key={debt.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: 0.05 * idx }}
                                        style={{ borderBottom: '1px solid var(--glass-border)' }}
                                        whileHover={{ background: 'rgba(255,255,255,0.015)' }}
                                    >
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ fontWeight: 700, color: 'white', fontSize: '1.05rem' }}>{debt.customerName}</div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                                                <Calendar size={14} style={{ color: 'var(--primary)' }} />
                                                {debt.date}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            {debt.notes || <span style={{ opacity: 0.3 }}>---</span>}
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', fontWeight: 800, color: 'var(--warning)', fontSize: '1.1rem' }}>
                                            {fNum(debt.remaining)} <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{settings.currency}</span>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '0.4rem 0.8rem', borderRadius: '8px',
                                                background: debt.remaining === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                color: debt.remaining === 0 ? 'var(--success)' : 'var(--warning)',
                                                fontSize: '0.75rem', fontWeight: 700,
                                                border: `1px solid ${debt.remaining === 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                                            }}>
                                                {debt.remaining === 0 ? t.cleared : t.remaining}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                                <button
                                                    className="btn"
                                                    disabled={debt.remaining === 0}
                                                    onClick={() => handlePay(debt)}
                                                    style={{
                                                        padding: '0.5rem', borderRadius: '10px', fontSize: '0.75rem',
                                                        background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)',
                                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                                        cursor: debt.remaining === 0 ? 'not-allowed' : 'pointer',
                                                        opacity: debt.remaining === 0 ? 0.5 : 1
                                                    }}
                                                    title={t.recordPayment}
                                                >
                                                    <Tag size={16} />
                                                </button>
                                                <button
                                                    className="btn"
                                                    onClick={() => handleEdit(debt)}
                                                    style={{
                                                        padding: '0.5rem', borderRadius: '10px',
                                                        background: 'rgba(255, 255, 255, 0.05)', color: 'white',
                                                        border: '1px solid var(--glass-border)'
                                                    }}
                                                    title={t.editLabel}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="btn"
                                                    onClick={() => handleDelete(debt.id)}
                                                    style={{
                                                        padding: '0.5rem', borderRadius: '10px',
                                                        background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
                                                        border: '1px solid rgba(239, 68, 68, 0.2)'
                                                    }}
                                                    title={t.deleteLabel}
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
                {filteredDebts.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ padding: '6rem 0', textAlign: 'center' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
                        }}>
                            <Clock size={40} style={{ opacity: 0.2, color: 'white' }} />
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{t.noDebtsFound}</p>
                    </motion.div>
                )}
            </motion.div>

            {/* Modals with enhanced styling */}
            {/* ... Modal parts simplified for brevity, following the same premium patterns ... */}
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
                            style={{ width: '450px', maxWidth: '95vw', padding: '2rem', direction: language === 'ar' ? 'rtl' : 'ltr' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                <div>
                                    <h3 className="title-md">{t.collectFromCustomer}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{selectedDebt?.customerName}</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} style={{
                                    width: '36px', height: '36px', borderRadius: '4px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: '#f1f5f9', border: 'none', cursor: 'pointer'
                                }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={submitPayment}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div className="card" style={{ background: 'var(--bg-main)', border: 'none', padding: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.currentTotalDebt}:</span>
                                            <span style={{ fontWeight: 800 }}>{fNum(selectedDebt?.remaining)} {settings.currency}</span>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="label">{t.amountPaidNow}</label>
                                        <div style={{ position: 'relative' }}>
                                            <DollarSign size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '12px', color: 'var(--text-light)' }} />
                                            <input
                                                type="number" className="form-control" required
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                placeholder="0.00"
                                                style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '40px' }}
                                                max={selectedDebt?.remaining}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '48px', justifyContent: 'center' }}>
                                        <CheckCircle2 size={18} />
                                        <span>{t.confirmCollection}</span>
                                    </button>
                                    <button type="button" className="btn btn-outline" style={{ flex: 1, height: '48px', justifyContent: 'center' }} onClick={() => setIsModalOpen(false)}>
                                        {t.cancel}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Debt Modal */}
            <AnimatePresence>
                {isEditModalOpen && (
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
                            style={{ width: '500px', maxWidth: '95vw', padding: '2rem', direction: language === 'ar' ? 'rtl' : 'ltr' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <div>
                                    <h3 className="title-md">{t.editDebt}</h3>
                                </div>
                                <button onClick={() => setIsEditModalOpen(false)} style={{
                                    width: '36px', height: '36px', borderRadius: '4px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: '#f1f5f9', border: 'none', cursor: 'pointer'
                                }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={submitEdit}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div className="form-group">
                                        <label className="label">{t.customer}</label>
                                        <input
                                            type="text" className="form-control" required
                                            value={editFormData.customerName}
                                            onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="label">{t.remainingAmount}</label>
                                            <div style={{ position: 'relative' }}>
                                                <DollarSign size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '12px', color: 'var(--text-light)' }} />
                                                <input
                                                    type="number" className="form-control" required step="0.01"
                                                    value={editFormData.remaining}
                                                    onChange={(e) => setEditFormData({ ...editFormData, remaining: e.target.value })}
                                                    style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '40px' }}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="label">{t.date}</label>
                                            <input
                                                type="date" className="form-control" required
                                                value={editFormData.date}
                                                onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="label">{t.notes}</label>
                                        <textarea
                                            className="form-control"
                                            value={editFormData.notes || ''}
                                            onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                                            rows="3"
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '48px', justifyContent: 'center' }}>
                                        <Save size={18} />
                                        <span>{t.saveChanges}</span>
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

export default Debtors;

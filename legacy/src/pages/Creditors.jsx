import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import {
    Plus,
    UserPlus,
    Search,
    Trash,
    Calendar,
    DollarSign,
    FileText,
    X,
    Save,
    TrendingUp,
    AlertCircle,
    Clock,
    ChevronRight,
    CreditCard,
    Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '../i18n/translations';
import { fNum } from '../utils/format';

const Creditors = () => {
    const { credits, addCredit, deleteCredit, editCredit, settings, language, setActivePage, setInvoiceMode } = useAppStore();
    const t = translations[language];
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editFormData, setEditFormData] = useState({ id: '', entityName: '', amount: 0, date: '', notes: '' });

    const handleEdit = (credit) => {
        setEditFormData({ ...credit });
        setIsEditModalOpen(true);
    };

    const submitEdit = (e) => {
        e.preventDefault();
        editCredit(editFormData.id, {
            ...editFormData,
            amount: parseFloat(editFormData.amount) || 0
        });
        setIsEditModalOpen(false);
    };

    const handleDelete = (id) => {
        if (window.confirm(t.confirmDeleteCredit)) {
            deleteCredit(id);
        }
    };

    const [formData, setFormData] = useState({
        entityName: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        addCredit({
            ...formData,
            id: Date.now(),
            amount: parseFloat(formData.amount)
        });
        setIsModalOpen(false);
        setFormData({ entityName: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    };

    const filteredCredits = credits.filter(c =>
        c.entityName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalCredits = credits.reduce((sum, c) => sum + c.amount, 0);

    return (
        <div className="creditors-page scrollable-page" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h2 className="title-lg">{t.manageCreditors}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t.creditorsSubtitle}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        className="btn btn-outline"
                        onClick={() => {
                            setInvoiceMode('purchases');
                            setActivePage('invoices');
                        }}
                        style={{ borderColor: 'var(--info)', color: 'var(--info)' }}
                    >
                        <FileText size={20} /> {t.purchaseInvoice}
                    </button>
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ background: 'var(--info)' }}>
                        <Plus size={20} /> {t.addNewCreditor}
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: '1.25rem 2rem', background: 'var(--secondary)', color: 'white', display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', border: 'none' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={28} />
                </div>
                <div>
                    <p style={{ fontSize: '0.9rem', opacity: 0.8, fontWeight: 500 }}>{t.totalCreditsPayable}</p>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{fNum(totalCredits)} {settings.currency}</h3>
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.creditorName}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.amountLabel}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.dueDate}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {filteredCredits.map(credit => (
                                <motion.tr
                                    key={credit.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ borderBottom: '1px solid var(--border-light)' }}
                                    whileHover={{ background: '#f8fafc' }}
                                >
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ fontWeight: 700 }}>{credit.entityName}</div>
                                        {credit.notes && <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>{credit.notes}</p>}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 800, color: 'var(--danger)' }}>
                                        {fNum(credit.amount)} {settings.currency}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                            <Calendar size={14} />
                                            {credit.date}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            <button
                                                className="icon-btn"
                                                onClick={() => handleEdit(credit)}
                                                style={{ color: 'var(--primary)', padding: '0.4rem' }}
                                                title={t.editLabel}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="icon-btn"
                                                onClick={() => handleDelete(credit.id)}
                                                style={{ color: 'var(--danger)', padding: '0.4rem' }}
                                                title={t.deleteLabel}
                                            >
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
                {filteredCredits.length === 0 && (
                    <div style={{ padding: '5rem 0', textAlign: 'center' }}>
                        <CreditCard size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                        <p style={{ color: 'var(--text-muted)' }}>{t.noCreditsFound}</p>
                    </div>
                )}
            </div>

            {/* Creditor Modal */}
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
                            style={{ width: '500px', maxWidth: '95vw', padding: '2rem', direction: language === 'ar' ? 'rtl' : 'ltr' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                <div>
                                    <h3 className="title-md">{t.recordNewDebt}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t.creditorDataPrompt}</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} style={{
                                    width: '36px', height: '36px', borderRadius: '4px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: '#f1f5f9', border: 'none', cursor: 'pointer'
                                }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div className="form-group">
                                        <label className="label">{t.creditorName}</label>
                                        <input
                                            type="text" className="form-control" required
                                            value={formData.entityName}
                                            onChange={(e) => setFormData({ ...formData, entityName: e.target.value })}
                                            placeholder={t.enterName}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                        <div className="form-group">
                                            <label className="label">{t.amountLabel} ({settings.currency})</label>
                                            <input
                                                type="number" className="form-control" required
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="label">{t.dueDate}</label>
                                            <input
                                                type="date" className="form-control" required
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="label">{t.debtReason}</label>
                                        <textarea
                                            className="form-control"
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            rows="3"
                                            placeholder={t.debtReasonPlaceholder}
                                        ></textarea>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '48px', justifyContent: 'center', background: 'var(--info)' }}>
                                        <Save size={18} />
                                        <span>{t.saveDebt}</span>
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

            {/* Edit Creditor Modal */}
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                <div>
                                    <h3 className="title-md">{t.editCredit}</h3>
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div className="form-group">
                                        <label className="label">{t.creditorName}</label>
                                        <div style={{ position: 'relative' }}>
                                            <UserPlus size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '12px', color: 'var(--text-light)' }} />
                                            <input
                                                type="text" className="form-control" required
                                                value={editFormData.entityName}
                                                onChange={(e) => setEditFormData({ ...editFormData, entityName: e.target.value })}
                                                style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '40px' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="label">{t.amountLabel}</label>
                                            <div style={{ position: 'relative' }}>
                                                <DollarSign size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '12px', color: 'var(--text-light)' }} />
                                                <input
                                                    type="number" className="form-control" required step="0.01"
                                                    value={editFormData.amount}
                                                    onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                                                    style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '40px' }}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="label">{t.dueDate}</label>
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

                                <div style={{ marginTop: '3rem' }}>
                                    <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px', justifyContent: 'center' }}>
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



export default Creditors;

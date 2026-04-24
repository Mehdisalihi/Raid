import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import {
    Plus,
    Trash,
    Search,
    CreditCard,
    Calendar,
    Tag,
    FileText,
    X,
    Save,
    TrendingDown,
    ChevronRight,
    Filter,
    DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '../i18n/translations';
import { fNum } from '../utils/format';

const Expenses = () => {
    const { expenses, addExpense, deleteExpense, settings, language } = useAppStore();
    const t = translations[language];
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');

    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category: t.catGeneral,
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const categories = [t.catGeneral, t.catRent, t.catSalaries, t.catElectricity, t.catPurchases, t.catMaintenance, t.catMarketing];

    const handleSubmit = (e) => {
        e.preventDefault();
        addExpense({
            ...formData,
            id: Date.now(),
            amount: parseFloat(formData.amount)
        });
        setIsModalOpen(false);
        setFormData({
            title: '',
            amount: '',
            category: t.catGeneral,
            date: new Date().toISOString().split('T')[0],
            notes: ''
        });
    };

    const filteredExpenses = expenses.filter(e => {
        const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="expenses-page scrollable-page" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h2 className="title-lg">{t.manageExpenses}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t.expensesSubtitle}</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ background: 'var(--danger)' }}>
                    <Plus size={20} /> {t.addNewExpense}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <Search size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                            <input
                                type="text"
                                placeholder={t.searchExpensesPlaceholder}
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
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="form-control"
                            style={{ border: 'none', background: 'transparent', padding: 0, fontWeight: 600, [language === 'ar' ? 'marginRight' : 'marginLeft']: '8px' }}
                        >
                            <option value="all">{t.allCategories}</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="card" style={{ [language === 'ar' ? 'borderRight' : 'borderLeft']: 'none', background: 'var(--danger)', color: 'white', display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem', border: 'none' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingDown size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 500 }}>{t.totalFilteredExpenses}</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{fNum(totalExpenses)} {settings.currency}</h3>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.date}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.expenseTitle}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.expenseCategory}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.total}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {filteredExpenses.map(expense => (
                                <motion.tr
                                    key={expense.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ borderBottom: '1px solid var(--border-light)' }}
                                    whileHover={{ background: '#f8fafc' }}
                                >
                                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={14} />
                                            {expense.date}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ fontWeight: 700 }}>{expense.title}</div>
                                        {expense.notes && <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>{expense.notes}</p>}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem', borderRadius: '4px', background: 'rgba(79, 70, 229, 0.05)',
                                            color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700
                                        }}>
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 800, color: 'var(--danger)' }}>
                                        {fNum(expense.amount)} {settings.currency}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                        <button className="icon-btn" onClick={() => deleteExpense(expense.id)} style={{ color: 'var(--danger)', margin: '0 auto' }}>
                                            <Trash size={18} />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
                {filteredExpenses.length === 0 && (
                    <div style={{ padding: '5rem 0', textAlign: 'center' }}>
                        <CreditCard size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                        <p style={{ color: 'var(--text-muted)' }}>{t.noExpensesFound}</p>
                    </div>
                )}
            </div>

            {/* Premium Expense Modal */}
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
                                    <h3 className="title-md">{t.newExpenseTitle}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t.expenseDataAccuracy}</p>
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
                                        <label className="label">{t.titleLabel}</label>
                                        <input
                                            type="text" className="form-control" required
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            placeholder={t.titlePlaceholder}
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
                                            <label className="label">{t.expenseCategory}</label>
                                            <select
                                                className="form-control"
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            >
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="label">{t.date}</label>
                                        <input
                                            type="date" className="form-control" required
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">{t.additionalNotes}</label>
                                        <textarea
                                            className="form-control"
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            rows="3"
                                            placeholder={t.notesPlaceholder}
                                        ></textarea>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '48px', justifyContent: 'center', background: 'var(--danger)' }}>
                                        <Save size={18} />
                                        <span>{t.saveExpense}</span>
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
        </div>
    );
};

export default Expenses;

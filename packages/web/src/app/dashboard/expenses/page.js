'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    CreditCard, Plus, Calendar, Tag, Search, X, Save,
    TrendingDown, DollarSign, PieChart as PieChartIcon,
    ChevronDown, Filter, Edit2, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';
import RaidDialog from '@/components/RaidDialog';
import RaidModal from '@/components/RaidModal';

import { db } from '@/lib/db';

export default function ExpensesPage() {
    const { t, isRTL, fmtNumber, fmtDate, fmtTime } = useLanguage();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentExpense, setCurrentExpense] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

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
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            // 1. Try Cloud
            const [expRes, catRes] = await Promise.all([
                api.get('/expenses').catch(() => null),
                api.get('/expenses/categories').catch(() => null)
            ]);
            
            if (expRes && catRes) {
                setExpenses(expRes.data);
                setCategories(catRes.data);
            } else {
                throw new Error('Fallback to local');
            }
        } catch (err) {
            console.warn('Expenses: Falling back to local data');
            // 2. Local Fallback
            const localExpenses = await db.expenses.toArray();
            setExpenses(localExpenses);
            // Categories might be empty offline if never fetched, or we can use defaults
            setCategories([{ id: 1, name: 'General' }, { id: 2, name: 'Stock' }, { id: 3, name: 'Staff' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount)
            };

            if (currentExpense) {
                await api.put(`/expenses/${currentExpense.id}`, payload);
            } else {
                await api.post('/expenses', payload);
            }

            fetchExpenses();
            closeModal();
            triggerDialog(
                isRTL ? 'نجاح ✨' : 'Succès ✨', 
                isRTL ? 'تم حفظ بيانات المصروف بنجاح' : 'Dépense enregistrée avec succès', 
                'success'
            );
        } catch (err) {
            triggerDialog(
                isRTL ? 'خطأ ❌' : 'Erreur ❌', 
                isRTL ? 'حدث خطأ أثناء حفظ البيانات' : 'Erreur lors de l\'enregistrement', 
                'danger'
            );
        }
    };

    const handleDelete = (id) => {
        triggerDialog(
            isRTL ? 'تأكيد الحذف' : 'Confirmer la suppression',
            isRTL ? 'هل أنت متأكد من حذف هذا المصروف؟' : 'Êtes-vous sûr de vouloir supprimer cette dépense ?',
            'danger',
            async () => {
                try {
                    await api.delete(`/expenses/${id}`);
                    fetchExpenses();
                    triggerDialog(
                        isRTL ? 'تم الحذف' : 'Supprimé', 
                        isRTL ? 'تم حذف المصروف بنجاح' : 'Dépense supprimée avec succès', 
                        'success'
                    );
                } catch (err) {
                    triggerDialog(isRTL ? 'خطأ' : 'Erreur', isRTL ? 'فشل الحذف' : 'Échec de la suppression', 'danger');
                }
            }
        );
    };

    const openModal = (expense = null) => {
        if (expense) {
            setCurrentExpense(expense);
            setFormData({
                title: expense.title,
                amount: expense.amount.toString(),
                category: expense.category,
                description: expense.description || '',
                date: expense.date.split('T')[0]
            });
        } else {
            setCurrentExpense(null);
            setFormData({
                title: '',
                amount: '',
                category: categories.length > 0 ? categories[0].name : '',
                description: '',
                date: new Date().toISOString().split('T')[0]
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentExpense(null);
    };

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const todayExpenses = expenses.filter(e => e.date?.split('T')[0] === new Date().toISOString().split('T')[0])
        .reduce((sum, e) => sum + e.amount, 0);

    const filteredExpenses = expenses.filter(exp =>
        exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-up pb-10 bg-[var(--background)] min-h-[85vh]">
            {/* ─── HEADER ─── */}
            <div className="card-premium p-5 lg:p-6 rounded-[2rem] bg-[var(--surface-1)] border border-[var(--glass-border)] relative overflow-hidden shadow-[var(--shadow-card)]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/5 rounded-full blur-[80px] pointer-events-none" />

                <div className={`relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${isRTL ? '' : 'flex-row-reverse'}`}>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <div className={`flex items-center gap-3 mb-2 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className="p-2.5 bg-red-500/10 rounded-xl shadow-sm border border-red-500/20">
                                <CreditCard className="text-red-500" size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl lg:text-2xl font-black text-[var(--text-primary)]">{t('expenses')}</h1>
                            </div>
                        </div>
                        <p className="text-[var(--text-muted)] text-xs font-bold opacity-80 mt-1 tracking-tight">{isRTL ? 'إدارة النفقات والمصاريف التشغيلية' : 'Suivre les dépenses opérationnelles'}</p>
                    </div>

                    <div className={`flex flex-col md:flex-row items-center gap-4 w-full md:w-auto ${isRTL ? '' : 'flex-row-reverse'}`}>
                        <div className="relative w-full md:w-64 group">
                            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-[var(--text-faint)] group-focus-within:text-red-500 transition-colors duration-300`} size={18} />
                            <input
                                type="text"
                                placeholder={isRTL ? "بحث..." : "Rechercher..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl h-11 ${isRTL ? 'pr-12 pl-6 text-right' : 'pl-12 pr-6 text-left'} text-[13px] font-bold focus:outline-none focus:border-red-500/40 focus:bg-[var(--card-bg)] transition-all shadow-inner text-[var(--text-primary)] placeholder:text-[var(--text-faint)]`}
                            />
                        </div>
                        <button
                            onClick={() => window.print()}
                            className={`w-full md:w-auto bg-[var(--card-bg)] border border-[var(--glass-border)] text-[var(--text-muted)] flex items-center justify-center gap-3 px-6 h-11 rounded-xl shadow-sm font-bold transition-all hover:bg-[var(--surface-1)] active:scale-95 text-sm print:hidden ${isRTL ? '' : 'flex-row-reverse'}`}
                        >
                            <CreditCard size={18} />
                            {isRTL ? 'طباعة التقرير' : 'Imprimer Journal'}
                        </button>
                        <button
                            onClick={() => openModal()}
                            className={`w-full md:w-auto bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white flex items-center justify-center gap-3 px-6 h-11 rounded-xl shadow-lg shadow-red-500/20 font-bold transition-all hover:-translate-y-0.5 active:scale-95 text-sm print:hidden ${isRTL ? '' : 'flex-row-reverse'}`}
                        >
                            <Plus size={18} />
                            {isRTL ? 'إضافة مصروف' : 'Ajouter Dépense'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── QUICK STATS ─── */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${isRTL ? '' : 'direction-ltr'}`}>
                <StatCard
                    icon={<TrendingDown size={28} />}
                    label={isRTL ? "إجمالي المصاريف" : "Dépenses totales"}
                    value={fmtNumber(totalExpenses)}
                    subLabel={isRTL ? "التراكمي" : "Cumulé"}
                    color="red"
                    isRTL={isRTL}
                />
                <StatCard
                    icon={<Calendar size={28} />}
                    label={isRTL ? "مصاريف اليوم" : "Dépenses du jour"}
                    value={fmtNumber(todayExpenses)}
                    subLabel={isRTL ? "آخر 24 ساعة" : "Dernières 24h"}
                    color="orange"
                    isRTL={isRTL}
                />
                <StatCard
                    icon={<PieChartIcon size={28} />}
                    label={isRTL ? "عدد العمليات" : "Transactions"}
                    value={expenses.length}
                    subLabel={isRTL ? "سجل المعاملات" : "Journal"}
                    color="purple"
                    hideCurrency
                    isRTL={isRTL}
                />
            </div>

            {/* ─── EXPENSES LIST ─── */}
            <div className="space-y-6">
                <h2 className={`text-xl font-black text-[var(--text-primary)] px-2 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'سجل المصروفات التفصيلي' : 'Journal détaillé des dépenses'}</h2>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-6 bg-[var(--surface-1)] card-premium border-[var(--glass-border)]">
                        <div className="w-16 h-16 border-[3px] border-red-500/10 border-t-red-500 rounded-full animate-spin shadow-sm"></div>
                        <p className="font-black text-lg text-[var(--text-primary)] animate-pulse">{isRTL ? 'جاري جلب بيانات المصاريف...' : 'Chargement...'}</p>
                    </div>
                ) : (
                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${isRTL ? '' : 'direction-ltr'}`}>
                        {filteredExpenses.map((exp, index) => (
                            <div
                                key={exp.id}
                                className={`card-premium group relative border-[var(--glass-border)] bg-[var(--surface-2)] flex flex-col hover:border-red-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl rounded-[2.5rem] p-8 ${isRTL ? 'text-right' : 'text-left'}`}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className={`absolute top-0 ${isRTL ? 'right-0' : 'left-0'} w-1.5 h-full bg-red-500/10 rounded-full transition-all group-hover:bg-red-500`} />

                                <div className={`flex justify-between items-start mb-6 ${isRTL ? '' : 'flex-row-reverse'}`}>
                                    <div className={`flex flex-col gap-4 ${isRTL ? 'items-start' : 'items-end'}`}>
                                        <span className="text-[10px] font-black text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl w-fit uppercase tracking-widest group-hover:bg-red-500 group-hover:text-white transition-colors">
                                            {exp.category}
                                        </span>
                                        <h3 className="text-xl font-black text-[var(--text-main)] group-hover:text-red-600 transition-colors line-clamp-1">{exp.title}</h3>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className={`flex flex-col ${isRTL ? 'items-end' : 'items-start'} text-[10px] font-bold text-[var(--text-faint)] bg-[var(--surface-1)] border border-[var(--glass-border)] px-3 py-2 rounded-xl shadow-sm`}>
                                            <Calendar size={14} className="mb-1 text-red-500" />
                                            {fmtDate(exp.date)}
                                        </div>
                                        <div className={`flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                                            <button onClick={() => openModal(exp)} className="p-2 bg-[var(--card-bg)] rounded-lg border border-[var(--glass-border)] text-[var(--text-faint)] hover:text-blue-500 shadow-sm transition-all"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDelete(exp.id)} className="p-2 bg-[var(--card-bg)] rounded-lg border border-[var(--glass-border)] text-[var(--text-faint)] hover:text-red-500 shadow-sm transition-all"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>

                                {exp.description && (
                                    <p className={`text-sm font-bold text-[var(--text-muted)] mb-8 bg-[var(--bg-secondary)] p-5 rounded-2xl border border-[var(--border-color)] opacity-80 min-h-[4.5rem] flex items-center italic ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {exp.description}
                                    </p>
                                )}

                                <div className={`mt-auto pt-6 border-t border-[var(--glass-border)] border-dashed flex items-end justify-between ${isRTL ? '' : 'flex-row-reverse'}`}>
                                    <div className={isRTL ? 'text-right' : 'text-left'}>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)] mb-1.5 opacity-60">{isRTL ? 'قيمة المصروف' : 'Montant'}</div>
                                        <div className="text-3xl font-black text-red-500 tracking-tighter">
                                            {fmtNumber(exp.amount)}
                                            <span className={`text-xs text-[var(--text-muted)] ${isRTL ? 'mr-2' : 'ml-2'} font-black`}>MRU</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 group-hover:scale-110 transition-transform">
                                        <TrendingDown size={24} strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredExpenses.length === 0 && (
                            <div className="col-span-full py-32 flex flex-col items-center gap-6 opacity-30 bg-[var(--surface-1)] card-premium border-[var(--glass-border)] border-dashed rounded-[3rem]">
                                <Search size={80} strokeWidth={1} className="text-[var(--text-muted)]" />
                                <div className="text-center">
                                    <p className="font-black text-2xl text-[var(--text-primary)]">{isRTL ? 'لا توجد مصاريف مسجلة' : 'Aucune dépense enregistrée'}</p>
                                    <p className="text-sm font-bold mt-2">{isRTL ? 'ابدأ بإضافة أول مصروف لتتبع نفقاتك' : 'Commencez par ajouter une dépense'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ─── MODAL ─── */}
            <RaidModal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={currentExpense ? (isRTL ? 'تعديل مصروف' : 'Modifier Dépense') : (isRTL ? 'إضافة مصروف جديد' : 'Nouvelle Dépense')}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2 space-y-2">
                            <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] block ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'بيان المصروف' : 'Titre / Libellé'} <span className="text-red-500">*</span></label>
                            <input
                                required
                                placeholder={isRTL ? "مثال: فاتورة كهرباء..." : "Ex: Facture électricité..."}
                                className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-4 text-sm font-bold focus:outline-none focus:border-red-500/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'} placeholder:text-[var(--text-faint)]`}
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] block ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'المبلغ' : 'Montant'} (MRU) <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-4 text-sm font-black focus:outline-none focus:border-red-500/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'}`}
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] block ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'التاريخ' : 'Date'} <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Calendar size={14} className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-red-500 opacity-40`} />
                                <input
                                    type="date"
                                    required
                                    className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} text-sm font-bold focus:outline-none focus:border-red-500/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)]`}
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] block ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'التصنيف' : 'Catégorie'} <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Filter size={14} className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-red-500 opacity-40`} />
                                <select
                                    required
                                    className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 ${isRTL ? 'pr-12 pl-10 text-right' : 'pl-12 pr-10 text-left'} text-sm font-bold appearance-none focus:outline-none focus:border-red-500/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] cursor-pointer`}
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 pointer-events-none opacity-40`} />
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] block ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'تفاصيل إضافية' : 'Description / Notes'}</label>
                            <textarea
                                className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-bold focus:outline-none focus:border-red-500/40 focus:bg-[var(--card-bg)] transition-all text-[var(--text-main)] min-h-[100px] resize-none ${isRTL ? 'text-right' : 'text-left'} placeholder:text-[var(--text-faint)]`}
                                placeholder={isRTL ? "تفاصيل إضافية..." : "Détails supplémentaires..."}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="pt-4">
                        <button type="submit" className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white h-14 rounded-2xl text-base flex items-center justify-center gap-3 font-black shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all active:scale-95">
                            <Save size={20} />
                            <span>{currentExpense ? (isRTL ? 'تحديث البيانات' : 'Mettre à jour') : (isRTL ? 'تسجيل المصروف' : 'Enregistrer')}</span>
                        </button>
                    </div>
                </form>
            </RaidModal>

            {/* ─── HIDDEN PRINT LAYOUT ─── */}
            <div className="hidden print:block print:bg-white print:text-black print:p-12 font-sans" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: "'Cairo', sans-serif" }}>
                <div className="text-center border-b-[3px] border-red-600 pb-8 mb-10">
                    <h1 className="text-4xl font-black mb-1 text-red-600 tracking-tighter uppercase">{isRTL ? 'رائد' : 'RAID'}</h1>
                    <h2 className="text-2xl font-black uppercase tracking-widest">{isRTL ? 'سجل المصروفات والنفقات' : 'JOURNAL DES DÉPENSES'}</h2>
                    <p className="text-sm mt-3 opacity-70 font-bold uppercase tracking-widest">
                        {isRTL ? 'تاريخ التقرير:' : 'Date du rapport:'} {fmtDate(new Date())} {fmtTime(new Date())}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-12 border-b-2 border-dashed border-gray-200 pb-12">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{isRTL ? 'إجمالي المصروفات' : 'Total des Dépenses'}</p>
                        <p className="text-4xl font-black">{fmtNumber(totalExpenses)} <span className="text-xs">MRU</span></p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{isRTL ? 'عدد العمليات' : 'Nombre d\'Opérations'}</p>
                        <p className="text-4xl font-black">{expenses.length}</p>
                    </div>
                </div>

                <table className="w-full border-collapse mb-10 text-lg">
                    <thead>
                        <tr className="bg-gray-100 border-black border-y-2 text-sm uppercase">
                            <th className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'التاريخ' : 'Date'}</th>
                            <th className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'بيان المصروف' : 'Désignation'}</th>
                            <th className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'التصنيف' : 'Catégorie'}</th>
                            <th className={`p-4 ${isRTL ? 'text-left' : 'text-right'}`}>{isRTL ? 'المبلغ' : 'Montant'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.map(exp => (
                            <tr key={exp.id} className="border-b border-gray-300">
                                <td className={`p-4 font-bold text-xs ${isRTL ? 'text-right' : 'text-left'}`}>{fmtDate(exp.date)}</td>
                                <td className={`p-4 font-bold ${isRTL ? 'text-right' : 'text-left'}`}>{exp.title}</td>
                                <td className={`p-4 text-xs font-black uppercase opacity-60 ${isRTL ? 'text-right' : 'text-left'}`}>{exp.category}</td>
                                <td className={`p-4 font-black ${isRTL ? 'text-left' : 'text-right'}`}>{fmtNumber(exp.amount)} MRU</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-20 border-t-2 border-black pt-10 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                    End of Expenses Journal • Rapport des Dépenses Raid
                </div>
            </div>

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

function StatCard({ icon, label, value, subLabel, color, hideCurrency, isRTL }) {
    const { fmtNumber } = useLanguage();
    const colorStyles = {
        red: 'text-red-500 border-red-500/20 bg-red-500/10',
        orange: 'text-orange-500 border-orange-500/20 bg-orange-500/10',
        purple: 'text-purple-500 border-purple-500/20 bg-purple-500/10'
    };

    return (
        <div className={`card-premium relative overflow-hidden group border bg-[var(--surface-1)] p-8 rounded-[2.5rem] shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className={`flex items-start justify-between mb-8 relative z-10 ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className={`p-4 rounded-2xl border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500 ${colorStyles[color]}`}>
                    {icon}
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="text-[10px] font-black opacity-40 uppercase tracking-widest text-[--text-muted]">{subLabel}</div>
                    <div className={`w-12 h-1 bg-current opacity-20 rounded-full mt-2 transition-all group-hover:w-20 ${colorStyles[color].split(' ')[0]}`} />
                </div>
            </div>

            <div className="text-sm font-bold opacity-60 mb-1.5 text-[var(--text-main)] tracking-tight">{label}</div>
            <div className={`text-3xl font-black flex items-baseline gap-2 ${colorStyles[color].split(' ')[0]} ${isRTL ? '' : 'flex-row-reverse'}`}>
                {typeof value === 'number' ? fmtNumber(value) : value}
                {!hideCurrency && <span className={`text-xs font-black opacity-50 ${isRTL ? 'mr-1' : 'ml-1'}`}>MRU</span>}
            </div>
        </div>
    );
}

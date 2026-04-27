'use client';

import { useState, useEffect } from 'react';
import { 
    Users, Plus, Search, DollarSign, 
    Calendar, Briefcase, ChevronRight, 
    History, Trash2, Edit2, Wallet,
    ArrowUpCircle, ArrowDownCircle, Info, X
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import RaidDialog from '@/components/RaidDialog';
import RaidModal from '@/components/RaidModal';

export default function StaffPage() {
    const { t, lang, isRTL, fmtNumber, fmtDate } = useLanguage();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showStatement, setShowStatement] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    
    // Form States
    const [newStaff, setNewStaff] = useState({ name: '', phone: '', role: '', baseSalary: '', joinedAt: new Date().toISOString().split('T')[0] });
    const [payment, setPayment] = useState({ type: 'PAYMENT', amount: '', description: '', date: new Date().toISOString().split('T')[0] });

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
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const res = await fetch('http://localhost:5000/v1/staff');
            const data = await res.json();
            setStaff(data);
        } catch (error) {
            console.error('Error fetching staff:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStaff = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/v1/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStaff)
            });
            if (res.ok) {
                setShowAddModal(false);
                setNewStaff({ name: '', phone: '', role: '', baseSalary: '', joinedAt: new Date().toISOString().split('T')[0] });
                fetchStaff();
            }
        } catch (error) {
            console.error('Error adding staff:', error);
        }
    };

    const handleEditStaff = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`http://localhost:5000/v1/staff/${selectedStaff.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStaff)
            });
            if (res.ok) {
                setShowEditModal(false);
                setNewStaff({ name: '', phone: '', role: '', baseSalary: '', joinedAt: new Date().toISOString().split('T')[0] });
                fetchStaff();
            }
        } catch (error) {
            console.error('Error updating staff:', error);
        }
    };

    const handleDeleteStaff = async (id) => {
        triggerDialog(
            isRTL ? 'تأكيد الحذف' : 'Confirmer la suppression',
            isRTL ? 'هل أنت متأكد من حذف هذا العامل؟' : 'Supprimer cet employé ?',
            'danger',
            async () => {
                try {
                    const res = await fetch(`http://localhost:5000/v1/staff/${id}`, {
                        method: 'DELETE'
                    });
                    if (res.ok) fetchStaff();
                } catch (error) {
                    console.error('Error deleting staff:', error);
                }
            }
        );
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`http://localhost:5000/v1/staff/${selectedStaff.id}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payment)
            });
            if (res.ok) {
                setShowPayModal(false);
                setPayment({ type: 'PAYMENT', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
                fetchStaff();
            }
        } catch (error) {
            console.error('Error processing payment:', error);
        }
    };

    const filteredStaff = staff.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3">
                        <Users className="text-primary" size={28} />
                        {t('staff_mgmt')}
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1 font-medium">
                        {lang === 'ar' ? 'إدارة الموظفين والرواتب والمسحوبات' : 'Gérer les employés, les salaires et les avances'}
                    </p>
                </div>
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={20} />
                    {t('add_staff')}
                </button>
            </div>

            {/* Search and Filters */}
            <div className="relative group max-w-md">
                <Search className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-[var(--text-faint)] group-focus-within:text-primary transition-colors`} size={18} />
                <input 
                    type="text"
                    placeholder={lang === 'ar' ? 'ابحث عن عامل...' : 'Rechercher un employé...'}
                    className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all shadow-inner ${isRTL ? 'text-right' : 'text-left'} placeholder:text-[var(--text-faint)]`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1,2,3].map(i => <div key={i} className="h-48 bg-[var(--card-bg)] rounded-2xl animate-pulse border border-[var(--border-color)]" />)
                ) : filteredStaff.length > 0 ? (
                    filteredStaff.map((member) => (
                        <div key={member.id} className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all overflow-hidden group">
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[var(--text-main)]">{member.name}</h3>
                                            <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs font-bold mt-0.5">
                                                <Calendar size={12} />
                                                {fmtDate(member.joinedAt)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => { 
                                                setSelectedStaff(member); 
                                                setNewStaff({ name: member.name, phone: member.phone || '', role: member.role || '', baseSalary: member.baseSalary, joinedAt: member.joinedAt.split('T')[0] });
                                                setShowEditModal(true); 
                                            }}
                                            className="w-8 h-8 flex items-center justify-center text-[var(--text-faint)] hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteStaff(member.id)}
                                            className="w-8 h-8 flex items-center justify-center text-[var(--text-faint)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--glass-border)]">
                                        <div className="text-[10px] text-[var(--text-faint)] font-black uppercase mb-1">{t('base_salary')}</div>
                                        <div className="text-sm font-black text-[var(--text-main)]">{fmtNumber(member.baseSalary)}</div>
                                    </div>
                                    <div className={`p-3 rounded-xl border ${member.balance > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                                        <div className="text-[10px] text-[var(--text-faint)] font-black uppercase mb-1">
                                            {member.balance > 0 
                                                ? (lang === 'ar' ? 'مستحق له' : 'Dû à l\'employé') 
                                                : (lang === 'ar' ? 'عليه (مدين)' : 'Dette (Owes)')}
                                        </div>
                                        <div className={`text-sm font-black ${member.balance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                            {fmtNumber(Math.abs(member.balance))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => { setSelectedStaff(member); setShowPayModal(true); }}
                                        className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-md shadow-primary/20"
                                    >
                                        <DollarSign size={14} />
                                        {t('pay_salary')}
                                    </button>
                                    <button 
                                        onClick={() => { setSelectedStaff(member); setShowStatement(true); }}
                                        className="w-10 h-10 flex items-center justify-center bg-[var(--surface-1)] text-[var(--text-faint)] rounded-xl border border-[var(--glass-border)] hover:bg-primary/10 hover:text-primary transition-all"
                                        title={t('staff_statement')}
                                    >
                                        <History size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-24 text-center bg-[var(--card-bg)] rounded-[2.5rem] border border-dashed border-[var(--glass-border)] opacity-60">
                        <Users className="mx-auto text-[var(--text-faint)] mb-4" size={64} strokeWidth={1} />
                        <p className="text-[var(--text-faint)] font-extrabold">{lang === 'ar' ? 'لا يوجد عمال مضافون بعد' : 'Aucun employé ajouté'}</p>
                    </div>
                )}
            </div>

            {/* Add Staff Modal */}
            <RaidModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title={t('add_staff')}
            >
                <form onSubmit={handleAddStaff} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-[var(--text-faint)] uppercase">{t('staff_name')}</label>
                        <input 
                            required
                            type="text" 
                            className={`w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:border-primary/30 focus:bg-[var(--card-bg)] transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                            value={newStaff.name}
                            onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-[var(--text-faint)] uppercase">{t('staff_role')}</label>
                            <input 
                                type="text" 
                                className={`w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:border-primary/30 focus:bg-[var(--card-bg)] transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                value={newStaff.role}
                                onChange={e => setNewStaff({...newStaff, role: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-[var(--text-faint)] uppercase">{lang === 'ar' ? 'تاريخ بدء العمل' : 'Date de début'}</label>
                            <input 
                                required
                                type="date" 
                                className={`w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:border-primary/30 focus:bg-[var(--card-bg)] transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                value={newStaff.joinedAt}
                                onChange={e => setNewStaff({...newStaff, joinedAt: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="pt-4">
                        <button type="submit" className="w-full btn-primary py-4 rounded-2xl font-black shadow-lg">
                            {t('save')}
                        </button>
                    </div>
                </form>
            </RaidModal>

            {/* Edit Staff Modal */}
            <RaidModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title={t('edit')}
            >
                <form onSubmit={handleEditStaff} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-[var(--text-faint)] uppercase">{t('staff_name')}</label>
                        <input 
                            required
                            type="text" 
                            className={`w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:border-primary/30 focus:bg-[var(--card-bg)] transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                            value={newStaff.name}
                            onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-[var(--text-faint)] uppercase">{t('base_salary')}</label>
                            <input 
                                required
                                type="number" 
                                className={`w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] font-black focus:outline-none focus:border-primary/30 focus:bg-[var(--card-bg)] transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                value={newStaff.baseSalary}
                                onChange={e => setNewStaff({...newStaff, baseSalary: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-[var(--text-faint)] uppercase">{lang === 'ar' ? 'تاريخ بدء العمل' : 'Date de début'}</label>
                            <input 
                                required
                                type="date" 
                                className={`w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:border-primary/30 focus:bg-[var(--card-bg)] transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                value={newStaff.joinedAt}
                                onChange={e => setNewStaff({...newStaff, joinedAt: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="pt-4">
                        <button type="submit" className="w-full btn-primary py-4 rounded-2xl font-black shadow-lg">
                            {t('save_changes')}
                        </button>
                    </div>
                </form>
            </RaidModal>

            {/* Payment/Advance Modal */}
            <RaidModal
                isOpen={showPayModal && !!selectedStaff}
                onClose={() => setShowPayModal(false)}
                title={t('pay_salary')}
                subtitle={selectedStaff?.name}
            >
                <form onSubmit={handlePayment} className="space-y-4">
                    <div className="flex p-1 bg-[var(--surface-1)] rounded-xl mb-4 border border-[var(--glass-border)]">
                        <button 
                            type="button"
                            onClick={() => setPayment({...payment, type: 'PAYMENT'})}
                            className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all ${payment.type === 'PAYMENT' ? 'bg-primary text-white shadow-sm' : 'text-[var(--text-faint)]'}`}
                        >
                            {t('salary_payment')}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setPayment({...payment, type: 'ADVANCE'})}
                            className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all ${payment.type === 'ADVANCE' ? 'bg-primary text-white shadow-sm' : 'text-[var(--text-faint)]'}`}
                        >
                            {t('salary_advance')}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setPayment({...payment, type: 'SALARY'})}
                            className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all ${payment.type === 'SALARY' ? 'bg-primary text-white shadow-sm' : 'text-[var(--text-faint)]'}`}
                        >
                            {t('salary_credit')}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-[var(--text-faint)] uppercase">{lang === 'ar' ? 'المبلغ' : 'Montant'}</label>
                            <input 
                                required
                                type="number" 
                                className={`w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-black text-[var(--text-main)] focus:outline-none focus:border-primary/30 focus:bg-[var(--card-bg)] transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                value={payment.amount}
                                onChange={e => setPayment({...payment, amount: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-[var(--text-faint)] uppercase">{t('date_label')}</label>
                            <input 
                                required
                                type="date" 
                                className={`w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:border-primary/30 focus:bg-[var(--card-bg)] transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                                value={payment.date}
                                onChange={e => setPayment({...payment, date: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-[var(--text-faint)] uppercase">{lang === 'ar' ? 'ملاحظات' : 'Observations'}</label>
                        <textarea 
                            className={`w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:border-primary/30 focus:bg-[var(--card-bg)] transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                            rows="2"
                            value={payment.description}
                            onChange={e => setPayment({...payment, description: e.target.value})}
                        />
                    </div>

                    <div className="pt-4">
                        <button type="submit" className="w-full btn-primary py-4 rounded-2xl font-black shadow-lg">
                            {t('save_purchase')}
                        </button>
                    </div>
                </form>
            </RaidModal>

            {/* Statement Drawer/Modal */}
            {showStatement && selectedStaff && (
                <StaffStatementDrawer 
                    staffId={selectedStaff.id} 
                    onClose={() => setShowStatement(false)} 
                    t={t} 
                    lang={lang} 
                    isRTL={isRTL}
                    fmtNumber={fmtNumber}
                    fmtDate={fmtDate}
                />
            )}

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

function StaffStatementDrawer({ staffId, onClose, t, lang, isRTL, fmtNumber, fmtDate }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatement = async () => {
            try {
                const res = await fetch(`http://localhost:5000/v1/staff/${staffId}/statement`);
                const json = await res.json();
                setData(json);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchStatement();
    }, [staffId]);

    return (
        <div className="fixed inset-0 z-[120] flex justify-end bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className={`w-full max-w-2xl bg-[var(--card-bg)] h-full shadow-2xl flex flex-col border-s border-[var(--glass-border)] animate-in slide-in-from-${isRTL ? 'left' : 'right'} duration-300`}>
                <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--card-bg)] sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-black text-[var(--text-main)]">{t('staff_statement')}</h2>
                        {data && <p className="text-xs font-bold text-primary mt-1">{data.name}</p>}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--bg-secondary)] rounded-full transition-colors text-[var(--text-muted)]">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scroll">
                    {loading ? (
                        <div className="space-y-4">
                            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-[var(--bg-secondary)] rounded-xl animate-pulse" />)}
                        </div>
                    ) : data?.Transactions?.length > 0 ? (
                        <div className="space-y-3">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="text-[10px] text-emerald-500 font-black uppercase mb-1">{t('total_paid')}</div>
                                    <div className="text-xl font-black text-emerald-500">
                                        {fmtNumber(data.Transactions.filter(t => t.type !== 'SALARY').reduce((acc, curr) => acc + curr.amount, 0))}
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--glass-border)]">
                                    <div className="text-[10px] text-[var(--text-faint)] font-black uppercase mb-1">{t('total_earned')}</div>
                                    <div className="text-xl font-black text-[var(--text-main)]">
                                        {fmtNumber(data.Transactions.filter(t => t.type === 'SALARY').reduce((acc, curr) => acc + curr.amount, 0))}
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 px-1">{lang === 'ar' ? 'جدول العمليات' : 'Tableau des opérations'}</h3>
                            
                            <div className="overflow-hidden border border-[var(--glass-border)] rounded-2xl shadow-sm">
                                <table className="w-full text-left border-collapse bg-[var(--card-bg)]">
                                    <thead>
                                        <tr className="bg-[var(--surface-2)]">
                                            <th className={`px-4 py-3 text-[10px] font-black text-[var(--text-faint)] uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('date_label')}</th>
                                            <th className={`px-4 py-3 text-[10px] font-black text-[var(--text-faint)] uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{lang === 'ar' ? 'البيان / النوع' : 'Type'}</th>
                                            <th className={`px-4 py-3 text-[10px] font-black text-[var(--text-faint)] uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{lang === 'ar' ? 'المبلغ' : 'Montant'}</th>
                                            <th className={`px-4 py-3 text-[10px] font-black text-[var(--text-faint)] uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{lang === 'ar' ? 'الرصيد الجاري' : 'Solde'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--glass-border)]">
                                        {data.Transactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                                                <td className="px-4 py-3 text-[11px] font-bold text-[var(--text-muted)] whitespace-nowrap">{fmtDate(tx.date)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="text-[11px] font-black text-[var(--text-main)]">
                                                        {tx.type === 'SALARY' ? t('salary_credit') : tx.type === 'ADVANCE' ? t('salary_advance') : t('salary_payment')}
                                                    </div>
                                                    {tx.description && <div className="text-[9px] text-[var(--text-muted)] truncate max-w-[120px]">{tx.description}</div>}
                                                </td>
                                                <td className={`px-4 py-3 text-[11px] font-black ${tx.type === 'SALARY' ? 'text-[var(--text-main)]' : 'text-emerald-500'}`}>
                                                    {tx.type === 'SALARY' ? '+' : '-'}{fmtNumber(tx.amount)}
                                                </td>
                                                <td className={`px-4 py-3 text-[11px] font-black ${tx.balanceAfter > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                    {fmtNumber(tx.balanceAfter)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
                            <Info size={48} className="mb-4 opacity-20" />
                            <p className="font-bold">{t('no_transactions')}</p>
                        </div>
                    )}
                </div>
                
                <div className="p-6 border-t border-[var(--glass-border)] bg-[var(--surface-2)]">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-[var(--text-faint)] uppercase">
                            {data?.balance > 0 
                                ? (lang === 'ar' ? 'إجمالي المستحقات المتبقية له' : 'Total solde dû à l\'employé')
                                : data?.balance < 0 
                                    ? (lang === 'ar' ? 'إجمالي المبالغ المتبقية عليه' : 'Total dû par l\'employé')
                                    : t('final_balance')
                            }
                        </span>
                        <span className={`text-xl font-black ${data?.balance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {fmtNumber(Math.abs(data?.balance))}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    Building2, Plus, Search, Edit2, Trash2, X, Save,
    MapPin, User, Package, DollarSign, Activity,
    CheckCircle2, AlertTriangle, ChevronRight
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import RaidDialog from '@/components/RaidDialog';
import RaidModal from '@/components/RaidModal';

import { db } from '@/lib/db';

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentWarehouse, setCurrentWarehouse] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        manager: '',
        isActive: true
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
    const { t, isRTL, fmtNumber } = useLanguage();

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        setLoading(true);
        try {
            // 1. Try Cloud
            const { data } = await api.get('/warehouses');
            setWarehouses(Array.isArray(data) ? data : []);
        } catch (err) {
            console.warn('Warehouses: Falling back to local data');
            // 2. Local Fallback
            const localWarehouses = await db.warehouses.toArray();
            setWarehouses(localWarehouses);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (currentWarehouse) {
                await api.put(`/warehouses/${currentWarehouse.id}`, formData);
            } else {
                await api.post('/warehouses', formData);
            }
            fetchWarehouses();
            closeModal();
            triggerDialog(
                isRTL ? 'نجاح ✅' : 'Succès ✅', 
                isRTL ? 'تم حفظ بيانات المخزن بنجاح' : 'Magasin enregistré avec succès', 
                'success'
            );
        } catch (err) {
            triggerDialog(
                isRTL ? 'خطأ ❌' : 'Erreur ❌', 
                isRTL ? 'حدث خطأ أثناء حفظ بيانات المخزن' : 'Erreur lors de l\'enregistrement', 
                'danger'
            );
        }
    };

    const handleDelete = (id) => {
        triggerDialog(
            isRTL ? 'تأكيد الحذف' : 'Confirmer la suppression',
            isRTL ? 'هل أنت متأكد من حذف هذا المخزن؟ سيتم حذف كافة سجلات التواجد فيه.' : 'Êtes-vous sûr de vouloir supprimer ce magasin ? Tous ses enregistrements seront perdus.',
            'danger',
            async () => {
                try {
                    await api.delete(`/warehouses/${id}`);
                    fetchWarehouses();
                    triggerDialog(
                        isRTL ? 'تم الحذف' : 'Supprimé', 
                        isRTL ? 'تم حذف المخزن بنجاح' : 'Magasin supprimé avec succès', 
                        'success'
                    );
                } catch (err) {
                    triggerDialog(
                        isRTL ? 'تنبيه' : 'Attention', 
                        isRTL ? 'فشل الحذف. قد يكون المخزن مرتبطاً بمنتجات أو حركات مخزنية.' : 'Échec de la suppression.', 
                        'warning'
                    );
                }
            }
        );
    };

    const openModal = (warehouse = null) => {
        if (warehouse) {
            setCurrentWarehouse(warehouse);
            setFormData({
                name: warehouse.name,
                location: warehouse.location || '',
                manager: warehouse.manager || '',
                isActive: warehouse.isActive
            });
        } else {
            setCurrentWarehouse(null);
            setFormData({
                name: '',
                location: '',
                manager: '',
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentWarehouse(null);
    };

    const filteredWarehouses = warehouses.filter(w =>
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        (w.location && w.location.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-8 animate-fade-up bg-[var(--background)] min-h-[85vh]">
            {/* Header */}
            <div className="card-premium p-6 lg:p-8 bg-[var(--surface-1)] border-[var(--glass-border)] shadow-[var(--shadow-card)] relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                <div className="relative z-10 flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm"><Building2 size={28} /></div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">{t('warehouses')}</h1>
                        <p className="text-[--text-muted] mt-1 font-bold text-xs tracking-wide opacity-80">{isRTL ? 'إدارة مواقع التخزين والموزعين' : 'Gérer les lieux de stockage'}</p>
                    </div>
                </div>
                <button onClick={() => openModal()} className="btn-primary relative z-10">
                    <Plus size={20} />
                    <span>{isRTL ? 'إضافة مخزن' : 'Ajouter Magasin'}</span>
                </button>
            </div>

            {/* Toolbar */}
            <div className="relative group w-full">
                <Search className={`absolute ${isRTL ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-[var(--text-faint)] group-focus-within:text-primary transition-colors duration-300`} size={20} />
                <input
                    type="text"
                    placeholder={isRTL ? "البحث باسم المخزن أو الموقع..." : "Rechercher par nom ou emplacement..."}
                    className={`w-full bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-xl h-11 ${isRTL ? 'pr-12 pl-6 text-right' : 'pl-12 pr-6 text-left'} text-xs font-extrabold focus:outline-none focus:border-primary/40 focus:bg-[var(--card-bg)] transition-all shadow-inner text-[var(--text-primary)] placeholder:text-[var(--text-faint)]`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array(4).fill(0).map((_, i) => <div key={i} className="h-48 bg-[var(--surface-1)] animate-pulse rounded-[2rem] border border-[var(--glass-border)]"></div>)}
                </div>
            ) : filteredWarehouses.length === 0 ? (
                <div className="py-24 text-center card-premium bg-[var(--surface-1)] border-[var(--glass-border)] flex flex-col items-center gap-4 opacity-70">
                    <Building2 size={64} strokeWidth={1} className="text-[var(--text-muted)]" />
                    <p className="font-extrabold text-[var(--text-primary)]">{isRTL ? 'لا توجد مخازن' : 'Aucun magasin trouvé'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredWarehouses.map(w => (
                        <div key={w.id} className="card-premium group relative flex flex-col h-full border-[var(--glass-border)] bg-[var(--surface-2)] hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                            <div className={`flex justify-between items-start mb-6 ${isRTL ? '' : 'flex-row-reverse'}`}>
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm"><Building2 size={22} /></div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                    <button onClick={() => openModal(w)} className="p-2 bg-[var(--surface-1)] rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-primary transition-colors"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(w.id)} className="p-2 bg-[var(--surface-1)] rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            
                            <h3 className={`text-lg font-black text-[var(--text-primary)] mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{w.name}</h3>
                            <div className="space-y-3 flex-1">
                                <DetailItem icon={<MapPin size={14} />} label={w.location || (isRTL ? 'غير محدد' : 'Non défini')} isRTL={isRTL} />
                                <DetailItem icon={<User size={14} />} label={w.manager || (isRTL ? 'بدون مسؤول' : 'Sans responsable')} isRTL={isRTL} />
                            </div>

                            <div className="mt-6 pt-5 border-t border-[var(--glass-border)] flex justify-between items-center">
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <div className="text-[9px] font-black uppercase text-[--text-muted] mb-1">{isRTL ? 'المنتجات' : 'Articles'}</div>
                                    <div className="text-lg font-black text-primary">{w._count?.Inventory || 0}</div>
                                </div>
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black border ${w.isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                    {w.isActive ? (isRTL ? 'نشط' : 'Actif') : (isRTL ? 'معطل' : 'Inactif')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <RaidModal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={currentWarehouse ? (isRTL ? 'تعديل المخزن' : 'Éditer Magasin') : (isRTL ? 'إضافة مخزن جديد' : 'Nouveau Magasin')}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] block ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'اسم المخزن' : 'Nom du magasin'}</label>
                        <input required className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-4 font-bold text-sm text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'} focus:outline-none focus:border-primary/40`} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] block ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الموقع' : 'Emplacement'}</label>
                        <input className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-4 font-bold text-sm text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'} focus:outline-none focus:border-primary/40`} value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className={`text-[11px] font-black uppercase text-[var(--text-faint)] block ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'المسؤول' : 'Responsable'}</label>
                        <input className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl h-12 px-4 font-bold text-sm text-[var(--text-main)] ${isRTL ? 'text-right' : 'text-left'} focus:outline-none focus:border-primary/40`} value={formData.manager} onChange={e => setFormData({ ...formData, manager: e.target.value })} />
                    </div>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 rounded border-[var(--border-color)] bg-[var(--bg-secondary)] text-primary focus:ring-primary/20" />
                        <span className="text-sm font-bold text-[var(--text-muted)]">{isRTL ? 'مخزن نشط' : 'Magasin actif'}</span>
                    </div>
                    <button type="submit" className="btn-primary w-full h-14 text-lg font-black mt-4 flex items-center justify-center gap-3 shadow-primary-glow">
                        <Save size={20} />
                        <span>{isRTL ? 'حفظ البيانات' : 'Sauvegarder'}</span>
                    </button>
                </form>
            </RaidModal>

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

function DetailItem({ icon, label, isRTL }) {
    return (
        <div className={`flex items-center gap-3 text-xs font-bold text-[--text-muted] ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-1.5 bg-[var(--surface-1)] rounded-lg text-primary/70">{icon}</div>
            <span className="truncate">{label}</span>
        </div>
    );
}

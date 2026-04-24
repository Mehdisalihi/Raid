import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import {
    Plus,
    Search,
    Edit2,
    Trash,
    User,
    Phone,
    MapPin,
    X,
    Save,
    UserPlus,
    MessageSquare,
    History,
    ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '../i18n/translations';

const Customers = () => {
    const { customers, addCustomer, updateCustomer, deleteCustomer, language } = useAppStore();
    const t = translations[language];
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: ''
    });

    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            phone: customer.phone,
            address: customer.address
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingCustomer) {
            updateCustomer(editingCustomer.id, formData);
        } else {
            addCustomer({ ...formData, id: Date.now() });
        }
        setIsModalOpen(false);
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    return (
        <div className="customers-page scrollable-page" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h2 className="title-lg">{t.manageCustomers}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t.customersSubtitle}</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditingCustomer(null); setFormData({ name: '', phone: '', address: '' }); setIsModalOpen(true); }}>
                    <UserPlus size={20} /> {t.addNewCustomer}
                </button>
            </div>

            <div className="card" style={{ padding: '0.75rem 1.25rem', marginBottom: '2rem' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <input
                        type="text"
                        placeholder={t.searchCustomerPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-control"
                        style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '40px', border: 'none', background: 'transparent' }}
                    />
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.customer}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.phoneNum}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.addressLocation}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>{t.quickActions}</th>
                            <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {filteredCustomers.map(customer => (
                                <motion.tr
                                    key={customer.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ borderBottom: '1px solid var(--border-light)' }}
                                    whileHover={{ background: '#f8fafc' }}
                                >
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '10px',
                                                background: 'var(--primary-light)', color: 'var(--primary)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 800
                                            }}>
                                                {customer.name.charAt(0)}
                                            </div>
                                            <div style={{ fontWeight: 700 }}>{customer.name}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Phone size={14} />
                                            {customer.phone}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <MapPin size={14} />
                                            {customer.address}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                            <button className="icon-btn" title={t.message}>
                                                <MessageSquare size={16} color="var(--primary)" />
                                            </button>
                                            <button className="icon-btn" title={t.history}>
                                                <History size={16} color="var(--secondary)" />
                                            </button>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                                            <button className="icon-btn" onClick={() => handleEdit(customer)} style={{ color: 'var(--primary)' }}>
                                                <Edit2 size={18} />
                                            </button>
                                            <button className="icon-btn" onClick={() => deleteCustomer(customer.id)} style={{ color: 'var(--danger)' }}>
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
                {filteredCustomers.length === 0 && (
                    <div style={{ padding: '5rem 0', textAlign: 'center' }}>
                        <User size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                        <p style={{ color: 'var(--text-muted)' }}>{t.noCustomersFound}</p>
                    </div>
                )}
            </div>

            {/* Premium Customer Modal */}
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
                                    <h3 className="title-md">{editingCustomer ? t.editCustomerTitle : t.addNewCustomer}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t.customerDataAccuracy}</p>
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
                                        <label className="label">{t.fullCustomerName}</label>
                                        <div style={{ position: 'relative' }}>
                                            <User size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '12px', color: 'var(--text-light)' }} />
                                            <input
                                                type="text" className="form-control" required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder={t.enterName}
                                                style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '40px' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="label">{t.phoneNum}</label>
                                        <div style={{ position: 'relative' }}>
                                            <Phone size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '12px', color: 'var(--text-light)' }} />
                                            <input
                                                type="tel" className="form-control" required
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder={t.phonePlaceholder}
                                                style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '40px' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="label">{t.addressLocation}</label>
                                        <div style={{ position: 'relative' }}>
                                            <MapPin size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '12px', color: 'var(--text-light)' }} />
                                            <input
                                                type="text" className="form-control"
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                placeholder={t.enterLocation}
                                                style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '40px' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '48px', justifyContent: 'center' }}>
                                        <Save size={18} />
                                        <span>{editingCustomer ? t.updateData : t.saveCustomer}</span>
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

export default Customers;

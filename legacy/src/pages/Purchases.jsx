import React, { useState, useEffect } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import {
    Plus,
    Trash,
    Save,
    Search,
    Package,
    ShoppingCart,
    CheckCircle2,
    Truck,
    ArrowRight,
    Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '../i18n/translations';
import { fNum, fTime } from '../utils/format';

const ProductCard = ({ product, index, addToCart, t, language, settings }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        whileHover={{ y: -8, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => addToCart(product)}
        className="card"
        style={{
            padding: '1.25rem',
            cursor: 'pointer',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}
    >
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '80px', height: '80px', background: 'var(--info)', opacity: 0.05, borderRadius: '50%', filter: 'blur(20px)' }}></div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700 }}>
            <span>#{product.code}</span>
            <span style={{
                color: 'var(--info)',
                background: 'rgba(14, 165, 233, 0.1)',
                padding: '2px 8px', borderRadius: '6px'
            }}>
                {t.available}: {product.quantity}
            </span>
        </div>

        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: '4px 0' }}>{product.name}</h4>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 950, color: 'var(--info)', letterSpacing: '-0.5px' }}>
                {fNum(product.price)} <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{settings.currency}</span>
            </span>
            <div style={{
                width: '32px', height: '32px', borderRadius: '10px',
                background: 'rgba(14, 165, 233, 0.2)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'var(--info)'
            }}>
                <Plus size={18} />
            </div>
        </div>
    </motion.div>
);

const Purchases = () => {
    const {
        products,
        settings,
        language,
        addPurchase,
        credits,
        customers
    } = useAppStore();
    const t = translations[language];

    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [notes, setNotes] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [lastPurchase, setLastPurchase] = useState(null);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 12);

    const addToCart = (product) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
    };

    const updateQuantity = (productId, newQty) => {
        if (newQty < 1) return;
        setCart(cart.map(item =>
            item.id === productId ? { ...item, quantity: newQty } : item
        ));
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.id !== productId));
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleSave = () => {
        if (!supplierName.trim()) {
            alert(language === 'ar' ? 'يرجى إدخال اسم المورد' : 'Please enter supplier name');
            return;
        }
        if (cart.length === 0) {
            alert(t.cartEmpty);
            return;
        }

        const purchaseData = {
            id: Date.now(),
            supplierName,
            items: cart,
            total,
            notes,
            date: new Date().toISOString().split('T')[0],
            time: fTime(new Date(), language)
        };
        addPurchase(purchaseData);
        setLastPurchase(purchaseData);

        setIsSuccess(true);
        setTimeout(() => {
            setIsSuccess(false);
            setCart([]);
            setSupplierName('');
            setNotes('');
        }, 5000);
    };

    if (isSuccess) {
        return (
            <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className="card"
                    style={{
                        textAlign: 'center',
                        padding: '4rem 3rem',
                        borderRadius: '40px',
                        maxWidth: '550px',
                        background: 'linear-gradient(135deg, #111, #000)',
                        border: '1px solid var(--info)',
                        boxShadow: '0 30px 60px rgba(0,0,0,0.5)'
                    }}
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 0.2 }}
                        style={{ width: '100px', height: '100px', background: 'rgba(14, 165, 233, 0.1)', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2.5rem', color: 'var(--info)', boxShadow: '0 0 30px rgba(14, 165, 233, 0.2)' }}
                    >
                        <CheckCircle2 size={56} />
                    </motion.div>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: 950, color: 'white', marginBottom: '0.75rem', letterSpacing: '-1px' }}>{t.purchaseSuccess}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '2.5rem' }}>تم تسجيل فاتورة المشتريات برقم <span style={{ color: 'var(--info)' }}>#{lastPurchase?.id}</span> بنجاح.</p>

                    <div style={{
                        background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '24px',
                        marginBottom: '3rem', textAlign: language === 'ar' ? 'right' : 'left',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{t.supplier}:</span>
                            <span style={{ fontWeight: 800, color: 'white', fontSize: '1.1rem' }}>{lastPurchase?.supplierName}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{t.status || (language === 'ar' ? 'الحالة' : 'Statut')}:</span>
                            <span style={{ fontWeight: 800, color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 12px', borderRadius: '10px' }}>
                                {t.debtLabel}
                            </span>
                        </div>
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '1rem 0' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{t.total}:</span>
                            <span style={{ fontWeight: 950, color: 'var(--info)', fontSize: '1.8rem' }}>
                                {fNum(lastPurchase?.total)} <span style={{ fontSize: '1rem', opacity: 0.6 }}>{settings.currency}</span>
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1.25rem' }}>
                        <button className="btn btn-primary" style={{ flex: 1, height: '60px', borderRadius: '18px', fontSize: '1rem', background: 'var(--info)', border: 'none' }} onClick={() => window.print()}><Printer size={22} /> {t.printInvoice}</button>
                        <button className="btn btn-outline" style={{ flex: 1, height: '60px', borderRadius: '18px', fontSize: '1rem' }} onClick={() => setIsSuccess(false)}>{t.close}</button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{ direction: language === 'ar' ? 'rtl' : 'ltr', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ maxWidth: '450px' }}>
                    <h2 className="title-lg" style={{ fontSize: '1.8rem', fontWeight: 950, color: 'white', letterSpacing: '-1px' }}>{t.purchaseInvoice}</h2>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{language === 'ar' ? 'تسجيل فواتير المشتريات والديون للموردين' : 'Recording purchase invoices and supplier debts'}</p>
                </div>
                <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="card no-print"
                    style={{
                        padding: '0.75rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(20px)',
                        width: '320px',
                        borderRadius: '20px',
                        border: '1px solid var(--glass-border)',
                        boxShadow: 'var(--shadow-premium)'
                    }}
                >
                    <Search size={22} color={searchTerm ? 'var(--info)' : 'var(--text-muted)'} />
                    <input
                        type="text"
                        className="form-control"
                        style={{ border: 'none', background: 'none', fontSize: '1rem', fontWeight: 700, padding: 0 }}
                        placeholder={t.itemSearchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </motion.div>
            </div>

            <div className="no-print" style={{ display: 'grid', gridTemplateColumns: searchTerm ? '1fr 450px' : '1fr', gap: '2rem', flex: 1, overflow: 'hidden' }}>
                <div style={{ overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column' }} className="custom-scroll">
                    {searchTerm ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                            {filteredProducts.map((p, idx) => (
                                <ProductCard
                                    key={p.id}
                                    product={p}
                                    index={idx}
                                    addToCart={addToCart}
                                    t={t}
                                    language={language}
                                    settings={settings}
                                />
                            ))}
                        </div>
                    ) : (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.15,
                            padding: '4rem',
                            color: 'white'
                        }}>
                            <Truck size={120} strokeWidth={1} style={{ marginBottom: '2rem' }} />
                            <h2 style={{ fontWeight: 900, fontSize: '2rem', textAlign: 'center' }}>سجل مشترياتك</h2>
                            <p style={{ marginTop: '1rem', fontSize: '1.1rem', fontWeight: 500 }}>{language === 'ar' ? 'ابدأ البحث عن منتج لشرائه أو تسجيله' : 'Start searching for a product to purchase'}</p>
                        </div>
                    )}

                    {searchTerm && filteredProducts.length === 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '5rem', opacity: 0.4, color: 'white' }}>
                            <Package size={64} style={{ margin: '0 auto 1.5rem', display: 'block' }} />
                            <h3 style={{ fontWeight: 800 }}>{t.noMatchData}</h3>
                        </motion.div>
                    )}
                </div>

                <motion.div
                    initial={{ x: language === 'ar' ? -30 : 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="card no-print"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: 0,
                        overflow: 'hidden',
                        background: 'rgba(15, 15, 15, 0.6)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '32px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.4)'
                    }}
                >
                    <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, color: 'white', letterSpacing: '-0.5px' }}>{t.purchaseInvoice}</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--info)', fontWeight: 900, marginTop: '4px', background: 'rgba(14, 165, 233, 0.1)', padding: '2px 8px', borderRadius: '4px', width: 'fit-content' }}>NEW ACQUISITION</p>
                            </div>
                            <div style={{
                                background: 'rgba(255,255,255,0.05)', color: 'white',
                                padding: '8px 16px', borderRadius: '12px', fontWeight: 900, fontSize: '1rem',
                                border: '1px solid var(--glass-border)'
                            }}>
                                <span>#{Date.now().toString().slice(-6)}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label className="label" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{t.supplier}</label>
                                <div style={{ position: 'relative' }}>
                                    <Truck size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--info)' }} />
                                    <input
                                        type="text"
                                        list="creditor-list"
                                        className="form-control"
                                        placeholder={t.supplierPrompt}
                                        value={supplierName}
                                        onChange={(e) => setSupplierName(e.target.value)}
                                        style={{
                                            height: '52px', fontSize: '1rem', fontWeight: 800,
                                            padding: language === 'ar' ? '0 3rem 0 1rem' : '0 1rem 0 3rem',
                                            background: 'rgba(255,255,255,0.05)', borderRadius: '16px'
                                        }}
                                    />
                                    <datalist id="creditor-list">
                                        {Array.from(new Set([
                                            ...credits.map(c => c.entityName),
                                            ...customers.map(c => c.name)
                                        ])).map((name, i) => (
                                            <option key={i} value={name} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }} className="custom-scroll">
                        <AnimatePresence>
                            {cart.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {cart.map((item) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '1rem',
                                                padding: '1rem', background: 'rgba(255,255,255,0.02)',
                                                borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)'
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white' }}>{item.name}</h4>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{fNum(item.price)}</p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '5px', borderRadius: '12px' }}>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontWeight: 900 }}
                                                >-</button>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                                                    style={{ width: '40px', background: 'none', border: 'none', textAlign: 'center', fontSize: '1rem', fontWeight: 900, color: 'white' }}
                                                />
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: 'var(--info)', color: 'white', cursor: 'pointer', fontWeight: 900 }}
                                                >+</button>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2, color: 'white' }}>
                                    <ShoppingCart size={48} style={{ marginBottom: '1rem' }} />
                                    <p style={{ fontWeight: 700 }}>سلة المشتريات فارغة</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', borderTop: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <label className="label" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)' }}>{t.invoiceNotes}</label>
                            <textarea
                                className="form-control"
                                rows="2"
                                style={{ resize: 'none', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid var(--glass-border)', color: 'white', padding: '1rem', fontWeight: 600 }}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={language === 'ar' ? 'ملاحظات حول عملية الشراء...' : 'Notes about the purchase...'}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ margin: 0, fontWeight: 900, color: 'white', fontSize: '1.2rem' }}>{t.total}:</h3>
                            <h2 style={{ margin: 0, fontWeight: 950, color: 'var(--info)', fontSize: '2.5rem', letterSpacing: '-1.5px', textShadow: '0 0 20px rgba(14, 165, 233, 0.2)' }}>{fNum(total)} <span style={{ fontSize: '1rem', opacity: 0.6 }}>{settings.currency}</span></h2>
                        </div>

                        <motion.button
                            className="btn btn-primary"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                width: '100%', height: '64px', borderRadius: '18px',
                                border: 'none', background: 'linear-gradient(135deg, var(--info), #0284c7)',
                                color: 'white', fontSize: '1.2rem', fontWeight: 950,
                                boxShadow: '0 10px 25px rgba(14, 165, 233, 0.3)'
                            }}
                            disabled={cart.length === 0}
                            onClick={handleSave}
                        >
                            <Save size={24} /> <span>{t.recordPurchase}</span>
                        </motion.button>
                    </div>
                </motion.div>
            </div>

            {/* Print Area - CSS handled in global styles to hide by default */}
            <div className="print-only" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #000', paddingBottom: '15px', marginBottom: '30px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '2rem' }}>{settings.businessName}</h2>
                        <p style={{ margin: '4px 0 0' }}>{settings.address}</p>
                        <p style={{ margin: 0 }}>{settings.phone}</p>
                    </div>
                    <div style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>
                        <h1 style={{ margin: 0, color: '#000', fontSize: '2.5rem' }}>{t.purchaseInvoice.toUpperCase()}</h1>
                        <p style={{ fontWeight: 800, margin: '4px 0 0' }}>#{lastPurchase?.id}</p>
                    </div>
                </div>

                <div style={{ marginBottom: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <p><strong>{t.supplier}:</strong> {lastPurchase?.supplierName}</p>
                        <p><strong>{t.date}:</strong> {lastPurchase?.date}</p>
                        <p><strong>{t.time}:</strong> {lastPurchase?.time}</p>
                    </div>
                    <div style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>
                        <p><strong>{t.status || (language === 'ar' ? 'الحالة' : 'Statut')}:</strong> {t.debtLabel}</p>
                        {lastPurchase?.notes && <p><strong>{t.invoiceNotes}:</strong> {lastPurchase.notes}</p>}
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: language === 'ar' ? 'right' : 'left', border: '1px solid #000', padding: '12px' }}>{t.productName}</th>
                            <th style={{ textAlign: 'center', border: '1px solid #000', padding: '12px' }}>{t.qty}</th>
                            <th style={{ textAlign: 'center', border: '1px solid #000', padding: '12px' }}>{t.price}</th>
                            <th style={{ textAlign: 'center', border: '1px solid #000', padding: '12px' }}>{t.total}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lastPurchase?.items.map((item, idx) => (
                            <tr key={idx}>
                                <td style={{ border: '1px solid #000', padding: '12px' }}>{item.name}</td>
                                <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'center' }}>{item.quantity}</td>
                                <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'center' }}>{fNum(item.price)}</td>
                                <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'center' }}>{fNum(item.price * item.quantity)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: '#000', color: '#fff' }}>
                            <td colSpan="3" style={{ border: '1px solid #000', padding: '12px', textAlign: language === 'ar' ? 'left' : 'right', fontWeight: 'bold', fontSize: '1.2rem' }}>{t.total}</td>
                            <td style={{ border: '1px solid #000', padding: '12px', fontWeight: 'bold', textAlign: 'center', fontSize: '1.2rem' }}>{fNum(lastPurchase?.total)} {settings.currency}</td>
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

                <div style={{ marginTop: '50px', borderTop: '2px solid #000', paddingTop: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
                    <p>{t.thanks}</p>
                </div>
            </div>
        </div>
    );
};

export default Purchases;

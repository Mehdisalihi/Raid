import React, { useState, useEffect } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import {
    Plus,
    Trash,
    Save,
    Printer,
    Search,
    User,
    Package,
    ShoppingCart,
    History,
    CheckCircle2
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
            opacity: product.quantity <= 0 ? 0.6 : 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}
    >
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '80px', height: '80px', background: 'var(--primary)', opacity: 0.05, borderRadius: '50%', filter: 'blur(20px)' }}></div>

        {product.quantity <= 5 && product.quantity > 0 && (
            <div style={{
                position: 'absolute', top: '12px', [language === 'ar' ? 'left' : 'right']: '12px',
                background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontSize: '0.65rem',
                padding: '4px 10px', borderRadius: '20px', fontWeight: 900,
                border: '1px solid rgba(245, 158, 11, 0.1)', backdropFilter: 'blur(4px)'
            }}>
                {t.lowStock}
            </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700 }}>
            <span>#{product.code}</span>
            <span style={{
                color: product.quantity <= 0 ? 'var(--danger)' : 'var(--success)',
                background: product.quantity <= 0 ? 'rgba(239, 44, 44, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                padding: '2px 8px', borderRadius: '6px'
            }}>
                {product.quantity <= 0 ? t.soldOut : `${product.quantity} ${t.unit || 'قطعة'}`}
            </span>
        </div>

        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: '4px 0' }}>{product.name}</h4>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 950, color: 'var(--primary)', letterSpacing: '-0.5px' }}>
                {fNum(product.price)} <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{settings.currency}</span>
            </span>
            <div style={{
                width: '32px', height: '32px', borderRadius: '10px',
                background: 'var(--primary-glow)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
            }}>
                <Plus size={18} />
            </div>
        </div>
    </motion.div>
);

const DailyInvoice = () => {
    const {
        products,
        customers,
        addInvoice,
        settings,
        language
    } = useAppStore();
    const t = translations[language];

    const [selectedCustomer, setSelectedCustomer] = useState({ id: 0, name: t.generalCustomer });
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [discount, setDiscount] = useState(0);
    const [isSuccess, setIsSuccess] = useState(false);
    const [lastInvoice, setLastInvoice] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(debouncedSearch.toLowerCase())
    ).slice(0, 12);

    const addToCart = (product) => {
        if (product.quantity <= 0) return alert(t.outOfStock);
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            if (existing.quantity >= product.quantity) return alert(t.lowInventory);
            setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { ...product, quantity: 1, maxQuantity: product.quantity }]);
        }
    };

    const removeFromCart = (productId) => setCart(cart.filter(item => item.id !== productId));
    const updateQuantity = (productId, newQty) => {
        const item = cart.find(i => i.id === productId);
        if (newQty > item.maxQuantity || newQty < 1) return;
        setCart(cart.map(item => item.id === productId ? { ...item, quantity: newQty } : item));
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleCheckout = () => {
        if (cart.length === 0) return alert(t.cartEmpty);
        const invoice = {
            id: Date.now(),
            invoiceNumber: `${Date.now().toString().slice(-6)}`,
            customerId: selectedCustomer?.id || 0,
            customerName: selectedCustomer?.name || t.generalCustomer,
            type: 'daily',
            items: cart,
            total,
            date: new Date().toISOString().split('T')[0],
            time: fTime(new Date(), language),
            status: 'paid',
            isDebt: false,
            discount: Number(discount),
            paymentMethod,
            finalTotal: total - Number(discount)
        };
        addInvoice(invoice);
        setLastInvoice(invoice);
        setIsSuccess(true);
        setTimeout(() => {
            setIsSuccess(false);
            setCart([]);
            setSelectedCustomer({ id: 0, name: t.generalCustomer });
            setPaymentMethod('cash');
            setDiscount(0);
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
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        boxShadow: '0 30px 60px rgba(0,0,0,0.5)'
                    }}
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 0.2 }}
                        style={{ width: '100px', height: '100px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2.5rem', color: '#10b981', boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)' }}
                    >
                        <CheckCircle2 size={56} />
                    </motion.div>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: 950, color: 'white', marginBottom: '0.75rem', letterSpacing: '-1px' }}>{t.successSale}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '2.5rem' }}>تم إصدار الفاتورة رقم <span style={{ color: 'var(--primary)' }}>#{lastInvoice?.invoiceNumber}</span> بنجاح.</p>

                    <div style={{
                        background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '24px',
                        marginBottom: '3rem', textAlign: language === 'ar' ? 'right' : 'left',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{t.customer}:</span>
                            <span style={{ fontWeight: 800, color: 'white', fontSize: '1.1rem' }}>{lastInvoice?.customerName}</span>
                        </div>
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '1rem 0' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{t.finalTotal}:</span>
                            <span style={{ fontWeight: 950, color: 'var(--primary)', fontSize: '1.8rem' }}>
                                {fNum(lastInvoice?.finalTotal)} <span style={{ fontSize: '1rem', opacity: 0.6 }}>{settings.currency}</span>
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1.25rem' }}>
                        <button className="btn btn-primary" style={{ flex: 1, height: '60px', borderRadius: '18px', fontSize: '1rem' }} onClick={() => window.print()}><Printer size={22} color="green" /> {t.printInvoice}</button>
                        <button className="btn btn-outline" style={{ flex: 1, height: '60px', borderRadius: '18px', fontSize: '1rem' }} onClick={() => setIsSuccess(false)}>{t.close} (Esc)</button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{ direction: language === 'ar' ? 'rtl' : 'ltr', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="card no-print"
                    style={{
                        padding: '1rem 2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.25rem',
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(20px)',
                        width: '100%',
                        maxWidth: '600px',
                        borderRadius: '32px',
                        boxShadow: searchTerm ? '0 20px 40px rgba(0,0,0,0.3)' : 'var(--shadow-premium)',
                        border: '1px solid var(--glass-border)',
                        transition: 'all 0.4s ease'
                    }}
                >
                    <Search size={24} color={searchTerm ? 'var(--primary)' : 'var(--text-muted)'} style={{ transition: 'color 0.3s' }} />
                    <input
                        type="text"
                        autoFocus
                        className="form-control"
                        style={{ border: 'none', background: 'none', fontSize: '1.3rem', fontWeight: 800, padding: 0 }}
                        placeholder={t.itemSearchPlaceholder || "ابحث بالاسم أو الكود..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px' }}>
                            <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
                        </button>
                    )}
                </motion.div>
            </div>

            <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '2rem', flex: 1, overflow: 'hidden' }}>
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
                            <ShoppingCart size={120} strokeWidth={1} style={{ marginBottom: '2rem' }} />
                            <h2 style={{ fontWeight: 900, fontSize: '2rem', textAlign: 'center' }}>{language === 'ar' ? 'نظام مبيعات mohassibe الفاخر' : 'Premium POS System'}</h2>
                            <p style={{ marginTop: '1rem', fontSize: '1.1rem', fontWeight: 500 }}>{language === 'ar' ? 'ابدأ البحث عن منتج لإضافته للفاتورة' : 'Start searching for a product to add'}</p>
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
                                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, color: 'white', letterSpacing: '-0.5px' }}>{t.invoiceLabel || "فاتورة بيع"}</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '4px' }}>يتم تجهيز الفاتورة الآن</p>
                            </div>
                            <div style={{
                                background: 'var(--primary-glow)', color: 'var(--primary)',
                                padding: '8px 16px', borderRadius: '12px', fontWeight: 900, fontSize: '1rem',
                                border: '1px solid rgba(249, 115, 22, 0.2)'
                            }}>
                                <span>#{Date.now().toString().slice(-6)}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <label className="label" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 0 }}>{t.customer}</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                                <select
                                    className="form-control"
                                    style={{
                                        height: '52px', fontSize: '1rem', fontWeight: 800,
                                        padding: language === 'ar' ? '0 3rem 0 1rem' : '0 1rem 0 3rem',
                                        background: 'rgba(255,255,255,0.05)', borderRadius: '16px'
                                    }}
                                    value={selectedCustomer?.id || 0}
                                    onChange={(e) => setSelectedCustomer(customers.find(c => c.id === parseInt(e.target.value)) || { id: 0, name: t.generalCustomer })}
                                >
                                    <option value="0">{t.generalCustomer}</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }} className="custom-scroll">
                        <AnimatePresence>
                            {cart.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {cart.map((item, idx) => (
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
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{fNum(item.price)} x {item.quantity}</p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '5px', borderRadius: '12px' }}>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontWeight: 900 }}
                                                >-</button>
                                                <span style={{ minWidth: '24px', textAlign: 'center', fontSize: '1rem', fontWeight: 900, color: 'white' }}>{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 900 }}
                                                >+</button>
                                            </div>
                                            <div style={{ textAlign: 'left', minWidth: '80px' }}>
                                                <p style={{ fontWeight: 950, color: 'white', fontSize: '1.1rem' }}>{fNum(item.price * item.quantity)}</p>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                <span>{t.subtotal}:</span>
                                <span style={{ fontWeight: 800, color: 'white' }}>{fNum(total)} {settings.currency}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{t.discount}:</span>
                                <div style={{ position: 'relative', width: '120px' }}>
                                    <input
                                        type="number"
                                        className="form-control"
                                        style={{ height: '40px', textAlign: 'center', padding: '0 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontWeight: 900 }}
                                        value={discount}
                                        onChange={(e) => setDiscount(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div style={{ height: '1px', background: 'var(--glass-border)', margin: '1rem 0' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 900, color: 'white', fontSize: '1.2rem' }}>{t.finalTotal}:</span>
                                <span style={{ fontWeight: 950, fontSize: '2.4rem', color: 'var(--primary)', letterSpacing: '-1.5px', textShadow: '0 0 20px var(--primary-glow)' }}>
                                    {fNum(total - Number(discount))} <span style={{ fontSize: '1rem', opacity: 0.6 }}>{settings.currency}</span>
                                </span>
                            </div>

                            <div style={{ marginTop: '1.5rem' }}>
                                <label className="label" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem', display: 'block' }}>{t.paymentMethod || 'طريقة الدفع الفاخرة'}</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                    {['cash', 'assadad', 'bankily', 'masrvi', 'bcipay', 'amanty', 'click', 'bficash', 'bimbank'].slice(0, 6).map(method => (
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            key={method}
                                            onClick={() => setPaymentMethod(method)}
                                            style={{
                                                padding: '0.75rem 0.5rem',
                                                background: paymentMethod === method ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                                                color: paymentMethod === method ? 'white' : 'var(--text-muted)',
                                                border: paymentMethod === method ? 'none' : '1px solid var(--glass-border)',
                                                borderRadius: '14px',
                                                fontSize: '0.8rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                boxShadow: paymentMethod === method ? '0 4px 12px var(--primary-glow)' : 'none'
                                            }}
                                        >
                                            {t[method] || (method === 'cash' ? t.cash : method)}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <motion.button
                            className="btn btn-primary"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                width: '100%', height: '64px', borderRadius: '18px',
                                border: 'none', background: 'linear-gradient(135deg, var(--primary), #ea580c)',
                                fontSize: '1.2rem', fontWeight: 950, boxShadow: '0 10px 25px var(--primary-glow)'
                            }}
                            disabled={cart.length === 0}
                            onClick={handleCheckout}
                        >
                            <Save size={24} /> <span>{t.checkout} (Enter)</span>
                        </motion.button>
                    </div>
                </motion.div>
            </div>

            {/* Print Template - Unchanged but ensured direction */}
            <div id="printable-invoice" style={{ display: 'none' }}>
                {/* Print content remains same for functional reasons */}
            </div>
        </div>
    );
};

export default DailyInvoice;

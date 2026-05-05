import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import {
    FileText,
    Printer,
    Calendar,
    User,
    Download,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    Trash
} from 'lucide-react';
import { motion } from 'framer-motion';
import { translations } from '../i18n/translations';
import { fDate, fNum } from '../utils/format';

const CustomerStatement = () => {
    const {
        customers, invoices, returns, debts, purchases, credits, settings, language,
        deleteInvoice, deletePurchase, deleteCredit, deleteDebt
    } = useAppStore();
    const t = translations[language];
    const [selectedEntityId, setSelectedEntityId] = useState('');

    let entity = null;
    let activities = [];
    let totalTransactions = 0;
    let totalReturns = 0;
    let netBalance = 0;
    let currentDebt = 0;
    let totalPaid = 0;

    entity = customers.find(c => c.name === selectedEntityId);
    if (entity) {
        // Get all data for this entity
        const customerInvoices = invoices.filter(inv => inv.customerName === selectedEntityId);
        const customerReturns = returns.filter(r => r.customerName === selectedEntityId);
        const customerDebts = debts.filter(d => d.customerName === selectedEntityId);
        const customerPurchases = purchases.filter(p => p.supplierName === selectedEntityId);
        const customerCredits = (credits || []).filter(c => c.entityName === selectedEntityId);

        // عليه (عليه): All sales we made to him (Cash + Debt)
        totalTransactions = customerInvoices.reduce((sum, inv) => sum + (Number(inv.total || inv.finalTotal) || 0), 0);

        // له (له): Payments + Returns + Credits (Purchases + manual credits)
        const cashSales = customerInvoices.filter(inv => !inv.isDebt).reduce((sum, inv) => sum + (Number(inv.total || inv.finalTotal) || 0), 0);
        const debtPayments = customerDebts.reduce((sum, d) => sum + (Math.max(0, (Number(d.amount) || 0) - (Number(d.remaining) || 0))), 0);
        totalPaid = cashSales + debtPayments;

        totalReturns = customerReturns.reduce((sum, r) => sum + (Number(r.totalReturn) || 0), 0);
        const totalCreditsAmount = customerCredits.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

        // The "له" total
        const totalToHim = totalPaid + totalReturns + totalCreditsAmount;

        // Final Result: Debit - Credit
        netBalance = totalTransactions - totalToHim;
        currentDebt = customerDebts.reduce((sum, d) => sum + (Number(d.remaining) || 0), 0);

        activities = [
            ...customerInvoices.map(inv => ({
                ...inv,
                type: 'sale',
                label: inv.isDebt ? t.debtInvoice : (t.invoiceLabel || 'فاتورة'),
                total: (Number(inv.total || inv.finalTotal) || 0),
                items: inv.cart || inv.items || []
            })),
            ...customerReturns.map(r => ({
                ...r,
                type: 'return',
                label: t.returns,
                invoiceNumber: r.referenceId || r.id,
                total: (Number(r.totalReturn) || 0),
                items: r.items || []
            })),
            ...customerPurchases.map(p => ({
                ...p,
                type: 'purchase',
                label: t.purchaseInvoice || 'فاتورة دائنين',
                invoiceNumber: p.id,
                total: (Number(p.total) || 0),
                items: p.items || []
            })),
            ...customerCredits.filter(c => !customerPurchases.some(p => p.id === c.id)).map(c => ({
                ...c,
                type: 'credit',
                label: t.creditorStatement || 'رصيد دائن',
                total: Number(c.amount) || 0
            }))
        ].sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt || 0);
            const dateB = new Date(b.date || b.createdAt || 0);
            return dateB - dateA;
        });

        // Store intermediate values for UI
        entity.totalToHim = totalToHim;
        entity.netBalance = netBalance;
    }

    const handleDeleteTransaction = (act) => {
        if (!window.confirm(t.confirmDeleteAction || 'Are you sure?')) return;

        if (act.type === 'sale') {
            // Find if there's a debt record for this invoice
            const linkedDebt = debts.find(d => d.invoiceId === act.id);
            if (linkedDebt) {
                deleteDebt(linkedDebt.id); // This already calls deleteInvoice
            } else {
                deleteInvoice(act.id);
            }
        } else if (act.type === 'purchase') {
            // Find if there's a credit record for this purchase
            const linkedCredit = credits.find(c => c.purchaseId === act.id);
            if (linkedCredit) {
                deleteCredit(linkedCredit.id); // This already calls deletePurchase
            } else {
                deletePurchase(act.id);
            }
        } else if (act.type === 'credit') {
            deleteCredit(act.id);
        } else if (act.type === 'return') {
            // Returns don't have a direct delete handler in store yet, 
            // but for now we focus on Sales, Purchases, and Credits as requested.
            alert(language === 'ar' ? 'حذف المرتجع غير مدعوم حالياً' : 'Deleting returns is not yet supported');
        }
    };

    return (
        <div className="statement-page scrollable-page" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }} className="no-print">
                <div>
                    <h2 className="title-lg">{t.accountStatement}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t.statementSubtitle}</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-outline" onClick={() => window.print()} disabled={!entity}>
                        <Printer size={18} color="green" /> {t.printStatement}
                    </button>
                    <button className="btn btn-outline" disabled={!entity}>
                        <Download size={18} /> {t.exportPDF}
                    </button>
                </div>
            </div>

            <div className="card no-print" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <label className="label">{t.selectCustomerReport}</label>
                <div style={{ flex: 1, position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    <select
                        className="form-control"
                        value={selectedEntityId}
                        onChange={(e) => setSelectedEntityId(e.target.value)}
                        style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '40px', height: '50px', fontSize: '1rem', fontWeight: 600 }}
                    >
                        <option value="">{t.selectCustomerPrompt}</option>
                        {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            {!entity ? (
                <div style={{ textAlign: 'center', padding: '5rem 0', opacity: 0.5 }} className="no-print">
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <FileText size={48} />
                    </div>
                    <p>{t.chooseCustomerFirst}</p>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Print Header */}
                    <div className="print-only" style={{ marginBottom: '2rem', borderBottom: '3px solid #000', paddingBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0 }}>{settings?.businessName}</h2>
                                <p style={{ margin: '0.25rem 0' }}>{settings?.address}</p>
                                <p style={{ margin: 0 }}>{settings?.phone}</p>
                            </div>
                            <div style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>
                                <h1 style={{ fontSize: '2rem', fontWeight: 950, margin: 0 }}>{t.accountStatement}</h1>
                                <p style={{ fontWeight: 700, margin: '0.25rem 0' }}>{fDate(new Date(), language)}</p>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '1rem', border: '1px solid #eee', borderRadius: '4px' }}>
                            <div><strong>{t.customer}:</strong> {entity?.name}</div>
                            <div><strong>{t.phoneNum}:</strong> {entity?.phone}</div>
                            <div><strong>{t.reportDate}:</strong> {fDate(new Date(), language)}</div>
                        </div>
                    </div>


                    <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                        <div className="card" style={{ [language === 'ar' ? 'borderRight' : 'borderLeft']: '4px solid var(--primary)' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{language === 'ar' ? 'إجمالي عليه (مدين)' : 'Total Débit (Dû)'}</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{fNum(totalTransactions)} {settings.currency}</h3>
                        </div>
                        <div className="card" style={{ [language === 'ar' ? 'borderRight' : 'borderLeft']: '4px solid var(--success)' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{language === 'ar' ? 'إجمالي له (دائن)' : 'Total Crédit'}</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{fNum(entity.totalToHim)} {settings.currency}</h3>
                        </div>
                        <div className="card" style={{ [language === 'ar' ? 'borderRight' : 'borderLeft']: '4px solid var(--info)' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{language === 'ar' ? 'صافي الرصيد' : 'Solde Net'}</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                                {fNum(Math.abs(netBalance))} {settings.currency}
                            </h3>
                        </div>
                        <div className="card" style={{
                            [language === 'ar' ? 'borderRight' : 'borderLeft']: '4px solid ' + (netBalance > 0 ? 'var(--danger)' : 'var(--success)'),
                            background: netBalance > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(34, 197, 94, 0.05)'
                        }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{language === 'ar' ? 'النتيجة النهائية' : 'Résultat Final'}</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: netBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                {netBalance > 0
                                    ? (language === 'ar' ? 'مديون (عليه)' : 'Débiteur')
                                    : netBalance < 0
                                        ? (language === 'ar' ? 'دائن (له)' : 'Créditeur')
                                        : (language === 'ar' ? 'خالص' : 'Soldé')
                                }
                            </h3>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="title-md" style={{ fontSize: '1.1rem' }}>{t.financialActivity}</h3>
                            <button className="btn btn-outline no-print" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                                <Filter size={14} /> {t.filterDate}
                            </button>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                                    <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.date}</th>
                                    <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.activityType}</th>
                                    <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.referenceNum}</th>
                                    <th style={{ padding: '1.25rem 1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>{t.total}</th>
                                    <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>{t.productStatus}</th>
                                    <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }} className="no-print">{t.actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activities.map((act, idx) => (
                                    <React.Fragment key={idx}>
                                        <tr style={{ borderBottom: act.items?.length > 0 ? 'none' : '1px solid var(--border-light)', background: act.items?.length > 0 ? '#fcfcfc' : 'transparent' }}>
                                            <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Calendar size={14} />
                                                    {fDate(new Date(act.date), language)}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    {act.type === 'sale' ? <ArrowUpRight size={16} color="var(--success)" /> :
                                                        act.type === 'purchase' ? <ArrowDownRight size={16} color="#ea580c" /> :
                                                            act.type === 'credit' ? <ArrowDownRight size={16} color="#0284c7" /> :
                                                                <ArrowDownRight size={16} color="var(--danger)" />}
                                                    <span style={{ fontWeight: 700 }}>{act.label}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem' }}>
                                                <code>{act.invoiceNumber || act.id}</code>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', fontWeight: 800 }}>
                                                {fNum(act.total)} {settings.currency}
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.65rem', borderRadius: '4px',
                                                    background: act.type === 'sale' ? 'rgba(79, 70, 229, 0.05)' :
                                                        act.type === 'purchase' ? 'rgba(234, 88, 12, 0.05)' :
                                                            act.type === 'credit' ? 'rgba(56, 189, 248, 0.05)' :
                                                                'rgba(239, 68, 68, 0.05)',
                                                    color: act.type === 'sale' ? 'var(--primary)' :
                                                        act.type === 'purchase' ? '#ea580c' :
                                                            act.type === 'credit' ? '#0284c7' :
                                                                'var(--danger)',
                                                    fontSize: '0.7rem', fontWeight: 800
                                                }}>
                                                    {act.type === 'sale' ? (act.status === 'paid' ? t.paidStatus : t.debtStatus) :
                                                        act.type === 'purchase' ? t.paidStatus :
                                                            act.type === 'credit' ? t.debtStatus :
                                                                t.returns}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }} className="no-print">
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => handleDeleteTransaction(act)}
                                                    style={{ color: 'var(--danger)', padding: '0.4rem' }}
                                                    title={t.deleteLabel}
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                        {act.items?.length > 0 && (
                                            <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                                                <td colSpan="6" style={{ padding: '0 1.5rem 1rem' }}>
                                                    <div style={{
                                                        background: '#fff',
                                                        border: '1px dashed #e2e8f0',
                                                        borderRadius: '6px',
                                                        padding: '0.75rem'
                                                    }}>
                                                        <table style={{ width: '100%', fontSize: '0.8rem' }}>
                                                            <thead>
                                                                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid #f1f5f9' }}>
                                                                    <th style={{ textAlign: language === 'ar' ? 'right' : 'left', padding: '0.4rem' }}>{t.product}</th>
                                                                    <th style={{ textAlign: 'center', padding: '0.4rem' }}>{t.quantity}</th>
                                                                    <th style={{ textAlign: 'center', padding: '0.4rem' }}>{t.price}</th>
                                                                    <th style={{ textAlign: language === 'ar' ? 'left' : 'right', padding: '0.4rem' }}>{t.total}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {act.items.map((item, i) => (
                                                                    <tr key={i}>
                                                                        <td style={{ padding: '0.4rem', fontWeight: 600 }}>{item.name}</td>
                                                                        <td style={{ padding: '0.4rem', textAlign: 'center' }}>{fNum(item.quantity)}</td>
                                                                        <td style={{ padding: '0.4rem', textAlign: 'center' }}>{fNum(item.price)}</td>
                                                                        <td style={{ padding: '0.4rem', textAlign: language === 'ar' ? 'left' : 'right', fontWeight: 700 }}>
                                                                            {fNum(item.quantity * item.price)}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                        {activities.length === 0 && (
                            <div style={{ padding: '4rem 0', textAlign: 'center', opacity: 0.3 }}>
                                <p>{t.noActivity}</p>
                            </div>
                        )}

                        {/* Final Balance Summary */}
                        {activities.length > 0 && (
                            <div style={{ padding: '1.5rem 1.5rem', background: '#f8fafc', borderTop: '2px solid var(--border-light)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                            {language === 'ar' ? 'إجمالي عليه (مدين)' : 'Total Débit'}
                                        </p>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)' }}>
                                            {fNum(totalTransactions)} {settings.currency}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                            {language === 'ar' ? 'إجمالي له (دائن)' : 'Total Crédit'}
                                        </p>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--success)' }}>
                                            {fNum(entity.totalToHim)} {settings.currency}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                            {language === 'ar' ? 'الرصيد النهائي' : 'Solde Final'}
                                        </p>
                                        <span style={{
                                            fontSize: '1.2rem', fontWeight: 900,
                                            color: netBalance > 0 ? 'var(--danger)' : 'var(--success)'
                                        }}>
                                            {fNum(Math.abs(netBalance))} {settings.currency}
                                            <span style={{ fontSize: '0.7rem', marginRight: '0.3rem', marginLeft: '0.3rem' }}>
                                                {netBalance > 0
                                                    ? (language === 'ar' ? '(مديون)' : '(Débiteur)')
                                                    : netBalance < 0
                                                        ? (language === 'ar' ? '(دائن)' : '(Créditeur)')
                                                        : (language === 'ar' ? '(خالص)' : '(Soldé)')
                                                }
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            <style>{`
                @media print {
                    .only-print { display: block !important; }
                    .no-print { display: none !important; }
                    .card { border: 1px solid #eee !important; box-shadow: none !important; }
                    body { background: white !important; }
                }
            `}</style>
        </div>
    );
};

export default CustomerStatement;

import { ChevronUp, ChevronDown, Package } from 'lucide-react';

export default function TxRow({ tx, isRTL, lang, fmt, fmtDate, isExpanded, onToggle, className, isSupplier }) {
    const hasItems = tx.items && tx.items.length > 0;
    
    // Support both 'invoice' (customer) and 'purchase'/'return' (supplier) for sub-tables
    const showSubTable = hasItems && (tx.type === 'invoice' || tx.type === 'purchase' || tx.type === 'return');

    // Values based on entity type
    // Customers: Col4=Debit, Col5=Credit
    // Suppliers: Col4=Credit, Col5=Debit
    const val1 = isSupplier ? tx.credit : tx.debit;
    const val2 = isSupplier ? tx.debit : tx.credit;

    return (
        <>
            <tr 
                onClick={hasItems ? onToggle : undefined}
                className={`border-b border-slate-200 print:border-b-0 transition-colors ${isExpanded ? 'bg-primary/[0.05]' : 'hover:bg-slate-50/50'} ${hasItems ? 'cursor-pointer' : ''} ${className || ''}`}
            >
                {/* 1. Date */}
                <td className={`print:border-x print:border-slate-300 px-5 py-4 print:px-3 print:py-2 text-[11px] print:text-[10px] font-bold text-slate-600 print:text-slate-900 print:font-black ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="flex flex-col">
                        <span>{new Date(tx.date).getDate()}</span>
                        <span className="text-[9px] print:text-[8px] opacity-70 print:opacity-100 uppercase">{new Date(tx.date).toLocaleString(lang === 'ar' ? 'ar-SA' : 'fr-FR', { month: 'short', year: 'numeric' })}</span>
                    </div>
                </td>

                {/* 2. Ref No (N° Facture) */}
                <td className={`print:border-x print:border-slate-300 px-5 py-4 print:px-3 print:py-2 text-[11px] print:text-[10px] font-black text-slate-800 print:text-slate-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {tx.refNo || '—'}
                </td>

                {/* 3. Description */}
                <td className={`print:border-x print:border-slate-300 px-5 py-4 print:px-3 print:py-2 text-[11px] print:text-[10px] font-black text-slate-800 print:text-slate-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                   <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                            <span className="leading-tight break-words">{tx.description}</span>
                            {hasItems && (
                                <span className="print:hidden">
                                    {isExpanded ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-slate-400" />}
                                </span>
                            )}
                        </div>
                        
                        {/* Integrated Items List for Print (No Table) */}
                        {showSubTable && (
                            <div className="hidden print:block mt-1 pt-1.5 border-t border-slate-200">
                                <div className="flex flex-col gap-1 opacity-100">
                                    {tx.items.map((item, i) => {
                                        const productName = item.productName || item.product?.name || item.name || item.ProductName || 'Item';
                                        return (
                                            <div key={i} className={`flex justify-between items-start text-[9px] font-bold text-slate-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <span className="leading-tight">
                                                    {isRTL ? '' : '• '}<span className="font-black text-slate-900">{productName}</span>
                                                    <span className="text-slate-500 mx-1">({item.qty} x {fmt(item.price || item.UnitPrice || item.sellPrice || 0)})</span>
                                                    {isRTL ? ' •' : ''}
                                                </span>
                                                <span className="text-slate-900 font-black whitespace-nowrap ml-4">
                                                    {fmt(item.total || (item.qty * (item.price || item.UnitPrice || item.sellPrice || 0)))}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </td>
                
                {/* 4. Value 1 (Debit for Customer, Credit for Supplier) */}
                <td className={`print:border-x print:border-slate-300 px-5 py-4 print:px-3 print:py-2 text-[11px] print:text-[10px] font-black text-slate-800 print:text-slate-900 text-right`}>
                    {val1 > 0 ? `${fmt(val1)}` : '0.00'}
                </td>

                {/* 5. Value 2 (Credit for Customer, Debit for Supplier) */}
                <td className={`print:border-x print:border-slate-300 px-5 py-4 print:px-3 print:py-2 text-[11px] print:text-[10px] font-black text-slate-800 print:text-slate-900 text-right`}>
                    {val2 > 0 ? `${fmt(val2)}` : '0.00'}
                </td>

                {/* 6. Balance */}
                <td className={`print:border-x print:border-slate-300 px-5 py-4 print:px-3 print:py-2 text-[11px] print:text-[10px] font-black text-slate-800 print:text-slate-900 text-right bg-slate-50/30 print:bg-transparent`}>
                    {fmt(tx.balance)}
                </td>
            </tr>
            
            {/* ─── SCREEN ONLY SUB-TABLE ─── */}
            {showSubTable && (
                <tr className={`${isExpanded ? 'table-row' : 'hidden'} print:hidden bg-slate-50/30`}>
                    <td colSpan={6} className="p-0 border-b border-slate-200">
                        <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[2000px] py-4 px-2 lg:px-6' : 'max-h-0'} print:max-h-none print:py-4 print:px-6`}>
                            <div className="bg-white rounded-[1.5rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden print:shadow-none print:rounded-none print:border-2 print:border-slate-800 mx-2 lg:mx-8 mb-4 relative">
                                {/* Decorative receipt edge top */}
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSI2Ij48cGF0aCBkPSJNMCAwdjZsNS02bDUgNmw1LTZsNSA2VjB6IiBmaWxsPSIjZjhmYWZjIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-50 print:hidden" />
                                
                                <div className="flex items-center justify-between gap-2 mb-0 print:mb-3 bg-slate-50 border-b border-slate-200 print:bg-transparent p-5 print:p-0 print:border-none pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center print:hidden">
                                            <Package size={20} className="text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="text-[13px] print:text-[11px] font-black text-slate-900 tracking-tight uppercase">
                                                {isRTL ? 'تفاصيل فاتورة المبيعات' : (lang === 'fr' ? 'DÉTAILS DE LA FACTURE' : 'INVOICE DETAILS')}
                                            </h4>
                                            <p className="text-[10px] font-bold text-slate-500 mt-0.5 print:hidden">
                                                {tx.refNo || '—'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right print:hidden">
                                        <span className="inline-flex items-center justify-center px-3 py-1.5 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-green-100">
                                            {isRTL ? 'مكتمل' : (lang === 'fr' ? 'COMPLÉTÉ' : 'COMPLETED')}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="p-0 print:p-0">
                                    <table className="w-full text-[11px] print:text-[9px] border-collapse">
                                        <thead className="bg-white print:bg-slate-100/50">
                                            <tr className="border-b border-slate-200 print:border-b-2 print:border-slate-800">
                                                <th className={`print:border-x print:border-slate-300 px-5 py-3.5 print:px-3 print:py-2 text-[10px] font-black print:font-black text-slate-400 print:text-slate-900 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'المنتج' : (lang === 'fr' ? 'Produit' : 'Product')}</th>
                                                <th className="print:border-x print:border-slate-300 px-5 py-3.5 print:px-3 print:py-2 text-[10px] font-black print:font-black text-slate-400 print:text-slate-900 uppercase tracking-widest text-center">{isRTL ? 'الكمية' : (lang === 'fr' ? 'Qté' : 'Qty')}</th>
                                                <th className={`print:border-x print:border-slate-300 px-5 py-3.5 print:px-3 print:py-2 text-[10px] font-black print:font-black text-slate-400 print:text-slate-900 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'سعر الوحدة' : (lang === 'fr' ? 'Prix Unitaire' : 'Unit Price')}</th>
                                                <th className={`print:border-x print:border-slate-300 px-5 py-3.5 print:px-3 print:py-2 text-[10px] font-black print:font-black text-slate-400 print:text-slate-900 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الإجمالي' : (lang === 'fr' ? 'Total' : 'Total')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 print:divide-y-0">
                                            {tx.items.map((it, i) => (
                                                <tr key={i} className="hover:bg-slate-50/80 transition-colors font-medium group">
                                                    <td className={`print:border-x print:border-slate-300 px-5 py-4 print:px-3 print:py-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-[12px] font-black text-slate-800 print:text-slate-900">{it.product?.name || it.name}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider">{it.product?.barcode || it.product?.code || it.barcode || it.code || '—'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="print:border-x print:border-slate-300 px-5 py-4 print:px-3 print:py-2 text-center align-top pt-5">
                                                        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-slate-100 group-hover:bg-white print:bg-transparent print:border print:border-slate-300 rounded-lg text-[11px] font-black text-slate-700 print:text-slate-900 transition-colors shadow-sm">
                                                            {it.qty}
                                                        </span>
                                                    </td>
                                                    <td className={`print:border-x print:border-slate-300 px-5 py-4 print:px-3 print:py-2 text-slate-600 font-bold print:text-slate-900 align-top pt-5 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                        {fmt(it.price || 0)} <span className="text-[8px] uppercase tracking-widest opacity-60">MRU</span>
                                                    </td>
                                                    <td className={`print:border-x print:border-slate-300 px-5 py-4 print:px-3 print:py-2 font-black text-slate-900 print:text-slate-900 align-top pt-5 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                        {fmt(it.total || (it.qty * (it.price || 0)))} <span className="text-[8px] uppercase tracking-widest text-slate-400">MRU</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="bg-slate-50 print:bg-slate-100/50 border-t border-slate-200 print:border-slate-800 p-5 print:p-3 flex justify-between items-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest print:text-slate-900">
                                        {isRTL ? 'إجمالي الفاتورة المرفقة' : (lang === 'fr' ? 'TOTAL DE LA FACTURE' : 'INVOICE TOTAL')}
                                    </div>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-2xl print:text-sm font-black text-slate-900">
                                            {fmt(tx.items.reduce((sum, it) => sum + (it.total || (it.qty * (it.price || 0))), 0))}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">MRU</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

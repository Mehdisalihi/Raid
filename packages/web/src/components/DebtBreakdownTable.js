'use client';
import { FileText, Calendar, Wallet, CheckCircle, AlertCircle, TrendingDown } from 'lucide-react';

export default function DebtBreakdownTable({ items, balance, isRTL, fmt, fmtDate }) {
    if (!items || items.length === 0) return null;

    const isCredit = balance < 0;

    return (
        <div className="mt-8 space-y-4 print:mt-6">
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-xl ${isCredit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} print:p-0 print:bg-transparent`}>
                    {isCredit ? <Wallet size={18} className="print:w-3 print:h-3" /> : <TrendingDown size={18} className="print:w-3 print:h-3" />}
                </div>
                <h3 className="text-sm print:text-[11px] font-black text-slate-800 uppercase tracking-widest">
                    {isRTL 
                        ? (isCredit ? 'تفاصيل الرصيد الدائن (الفائض)' : 'تحليل الفواتير غير المدفوعة (المديونية)') 
                        : (isCredit ? 'DÉTAILS DU SOLDE CRÉDITEUR' : 'DÉTAILS DES FACTURES NON SOLDÉES')}
                </h3>
            </div>

            <div className="card-premium bg-white/60 backdrop-blur-md border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-sm print:rounded-xl print:shadow-none print:border-[2px] print:border-slate-900">
                <table className="w-full text-sm print:text-[10px]">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 print:bg-slate-100/80 print:border-b-[2px] print:border-slate-900 print-exact">
                        <tr>
                            <th className={`px-6 py-4 print:px-3 print:py-2 text-[10px] print:text-[8px] font-black text-slate-400 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'}`}>
                                {isRTL ? 'التاريخ' : 'Date'}
                            </th>
                            <th className={`px-6 py-4 print:px-3 print:py-2 text-[10px] print:text-[8px] font-black text-slate-400 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'}`}>
                                {isRTL ? 'رقم الفاتورة' : 'N° Réf'}
                            </th>
                            <th className="px-6 py-4 print:px-3 print:py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                                {isRTL ? (isCredit ? 'المبلغ الأصلي' : 'قيمة الفاتورة') : 'Montant Initial'}
                            </th>
                            <th className={`px-6 py-4 print:px-3 print:py-2 text-[10px] print:text-[8px] font-black text-slate-400 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'}`}>
                                {isRTL ? 'المبلغ المتبقي' : 'Reste à Payer'}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                        {items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/30 transition-colors group">
                                <td className={`px-6 py-4 print:px-3 print:py-2 font-bold text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                                    {fmtDate(item.date)}
                                </td>
                                <td className={`px-6 py-4 print:px-3 print:py-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-800 dark:text-slate-200">{item.refNo}</span>
                                        <span className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">{item.description}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 print:px-3 print:py-2 text-center font-bold text-slate-500">
                                    {fmt(item.originalAmount)}
                                </td>
                                <td className={`px-6 py-4 print:px-3 print:py-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-base font-black ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                                            {fmt(item.amount)}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400">MRU</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-900 text-white print:bg-slate-100/80 print:text-slate-900 border-t-2 border-slate-900 print:border-t-[2px] print:border-slate-900 print-exact">
                        <tr>
                            <td colSpan={3} className={`px-6 py-5 print:px-3 print:py-2 font-black text-xs uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'}`}>
                                {isRTL ? 'إجمالي الرصيد القائم:' : 'TOTAL SOLDE RÉSIDUEL:'}
                            </td>
                            <td className={`px-6 py-5 print:px-3 print:py-2 text-lg font-black ${isRTL ? 'text-right' : 'text-left'}`}>
                                {fmt(Math.abs(balance))} <span className="text-[10px] opacity-70">MRU</span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl print:hidden">
                <AlertCircle size={14} className="text-slate-400" />
                <p className="text-[10px] font-bold text-slate-500 italic">
                    {isRTL 
                        ? 'هذا الجدول يوضح الفواتير التي لم تسدد بالكامل بعد، حيث تم خصم الدفعات من أقدم الفواتير أولاً (FIFO).' 
                        : 'Ce tableau détaille les factures non soldées, les paiements ayant été imputés aux plus anciennes (FIFO).'}
                </p>
            </div>
        </div>
    );
}

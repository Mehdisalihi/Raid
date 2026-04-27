'use client';
import { Wallet, TrendingUp, TrendingDown, CreditCard, ChevronUp, ChevronDown } from 'lucide-react';

export default function SummaryBox({ summary, isRTL, fmt, lang }) {
    const isDebtor = summary.finalBalance > 0;
    
    return (
        <div className="mt-8 relative overflow-hidden print:mt-1">
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none print:hidden" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-secondary/5 rounded-full blur-3xl pointer-events-none print:hidden" />
            
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. TOTAL DÉBIT */}
                <div className="card-premium group bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all duration-300 print:p-2 print:border print:border-slate-200 print:rounded-xl">
                    <div className="flex items-center justify-between mb-4 print:mb-1">
                        <div className={`p-2.5 rounded-xl bg-red-50 text-red-500 print:bg-transparent print:p-0`}>
                            <TrendingDown size={18} className="print:w-3 print:h-3" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] print:text-[8px]">
                            {isRTL ? 'إجمالي المدين' : (lang === 'fr' ? 'TOTAL DÉBIT' : 'TOTAL DEBIT')}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900 dark:text-white print:text-sm">
                                {fmt(summary.totalDebit)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 print:text-[7px]">MRU</span>
                        </div>
                        <div className="mt-1 h-1 w-full bg-slate-100 rounded-full overflow-hidden print:hidden">
                            <div className="h-full bg-red-400/30 w-full" />
                        </div>
                    </div>
                </div>

                {/* 2. TOTAL CRÉDIT */}
                <div className="card-premium group bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all duration-300 print:p-2 print:border print:border-slate-200 print:rounded-xl">
                    <div className="flex items-center justify-between mb-4 print:mb-1">
                        <div className={`p-2.5 rounded-xl bg-green-50 text-green-500 print:bg-transparent print:p-0`}>
                            <TrendingUp size={18} className="print:w-3 print:h-3" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] print:text-[8px]">
                            {isRTL ? 'إجمالي الدائن' : (lang === 'fr' ? 'TOTAL CRÉDIT' : 'TOTAL CREDIT')}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900 dark:text-white print:text-sm">
                                {fmt(summary.totalCredit)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 print:text-[7px]">MRU</span>
                        </div>
                        <div className="mt-1 h-1 w-full bg-slate-100 rounded-full overflow-hidden print:hidden">
                            <div className="h-full bg-green-400/30 w-full" />
                        </div>
                    </div>
                </div>

                {/* 3. SOLDE FINAL */}
                <div className={`card-premium group backdrop-blur-md border rounded-[2rem] p-6 shadow-lg transition-all duration-300 print:p-2 print:border print:border-slate-200 print:rounded-xl ${
                    isDebtor 
                    ? 'bg-red-50/80 border-red-100 dark:bg-red-950/20 dark:border-red-900/30 shadow-red-500/5' 
                    : 'bg-green-50/80 border-green-100 dark:bg-green-950/20 dark:border-green-900/30 shadow-green-500/5'
                }`}>
                    <div className="flex items-center justify-between mb-4 print:mb-1">
                        <div className={`p-2.5 rounded-xl bg-white shadow-sm print:bg-transparent print:p-0 print:shadow-none ${isDebtor ? 'text-red-600' : 'text-green-600'}`}>
                            <Wallet size={18} className="print:w-3 print:h-3" />
                        </div>
                        <span className="text-[10px] font-black text-slate-500/60 uppercase tracking-[0.15em] print:text-[8px]">
                            {isRTL ? 'الرصيد النهائي' : (lang === 'fr' ? 'SOLDE FINAL' : 'FINAL BALANCE')}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-1">
                            <span className={`text-3xl font-black print:text-base ${isDebtor ? 'text-red-600' : 'text-green-600'}`}>
                                {fmt(Math.abs(summary.finalBalance))}
                            </span>
                            <span className={`text-[10px] font-bold print:text-[7px] ${isDebtor ? 'text-red-400' : 'text-green-400'}`}>MRU</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDebtor ? 'bg-red-400' : 'bg-green-400'}`} />
                            <span className={`text-xs font-black print:text-[7px] ${isDebtor ? 'text-red-500' : 'text-green-500'}`}>
                                {isDebtor ? (isRTL ? 'مدين / دين بذمته' : (lang === 'fr' ? 'Montant Dû' : 'Amount Due')) : (isRTL ? 'دائن / رصيد متبقي' : (lang === 'fr' ? 'Solde en Faveur' : 'Remaining Balance'))}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

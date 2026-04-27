import { useState, useEffect, useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { 
    TrendingUp, TrendingDown, PieChart as PieIcon, BarChart3, Package, 
    Activity, CheckCircle, Info, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';

export default function StatementCharts({ isRTL, summary, filtered, fmtDate, fmt }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const chartData = useMemo(() => {
        if (!mounted) return {};

        // 1. Transaction Type Distribution
        const typeDist = [
            { name: isRTL ? 'فواتير' : 'Factures', value: filtered.filter(t => t.type === 'invoice' || t.type === 'purchase').length, color: '#3b82f6' },
            { name: isRTL ? 'دفعات' : 'Paiements', value: filtered.filter(t => t.type === 'payment').length, color: '#10b981' },
            { name: isRTL ? 'مرتجعات' : 'Retours', value: filtered.filter(t => t.type === 'return').length, color: '#f59e0b' },
            { name: isRTL ? 'ديون' : 'Dettes', value: filtered.filter(t => t.type === 'debt').length, color: '#ef4444' },
        ].filter(d => d.value > 0);

        // 2. Monthly Trend (Group by Month)
        const monthlyMap = {};
        filtered.forEach(tx => {
            const date = new Date(tx.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { month: monthKey, debit: 0, credit: 0 };
            monthlyMap[monthKey].debit += tx.debit;
            monthlyMap[monthKey].credit += tx.credit;
        });
        const monthlyTrend = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

        // 3. Top Products
        const productMap = {};
        filtered.forEach(tx => {
            if (tx.items) {
                tx.items.forEach(item => {
                    const name = item.product?.name || item.name || 'Unknown';
                    if (!productMap[name]) productMap[name] = 0;
                    productMap[name] += item.qty || 0;
                });
            }
        });
        const topProducts = Object.entries(productMap)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);

        // 4. Recovery Progress
        const recoveryRate = summary.totalDebit > 0 ? (summary.totalCredit / summary.totalDebit) * 100 : 0;
        
        // 5. Insights
        const topProduct = topProducts[0]?.name || '—';
        const mostUsedType = typeDist.sort((a, b) => b.value - a.value)[0]?.name || '—';

        return { typeDist, monthlyTrend, topProducts, recoveryRate, topProduct, mostUsedType };
    }, [mounted, filtered, isRTL, summary]);

    if (!mounted) {
        return <div className="h-[250px] w-full flex items-center justify-center opacity-50">Loading charts...</div>;
    }

    const { typeDist, monthlyTrend, topProducts, recoveryRate, topProduct, mostUsedType } = chartData;

    return (
        <div className="space-y-6">
            {/* ─── INSIGHT CARDS (NEW) ─── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 print:hidden">
                <InsightCard 
                    title={isRTL ? 'نسبة التحصيل' : 'Taux de Récupération'} 
                    value={`${recoveryRate.toFixed(1)}%`} 
                    icon={<Activity size={18} />} 
                    color="green" 
                    progress={recoveryRate}
                />
                <InsightCard 
                    title={isRTL ? 'المنتج المفضل' : 'Produit Phare'} 
                    value={topProduct} 
                    icon={<Package size={18} />} 
                    color="blue" 
                />
                <InsightCard 
                    title={isRTL ? 'النشاط الغالب' : 'Activité Dominante'} 
                    value={mostUsedType} 
                    icon={<CheckCircle size={18} />} 
                    color="purple" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:gap-4">
                {/* 1. Ventes vs Recouvrement */}
                <CardWrapper title={isRTL ? 'تحليل المبيعات والتحصيل' : 'ANALYSE VENTES & RECOUVREMENT'} icon={<TrendingUp size={16} className="text-secondary" />}>
                    <div className="h-[250px] w-full print:h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: isRTL ? 'مبيعات' : 'Ventes', value: summary.totalDebit, color: '#3b82f6' },
                                { name: isRTL ? 'تحصيل' : 'Recouvrement', value: summary.totalCredit, color: '#10b981' }
                            ]}>
                                <defs>
                                    <linearGradient id="barBlue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                                    </linearGradient>
                                    <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                                <XAxis dataKey="name" fontSize={11} fontWeight="800" axisLine={false} tickLine={false} dy={10} />
                                <YAxis hide domain={[0, 'auto']} />
                                <RechartsTooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" radius={[15, 15, 15, 15]} barSize={50}>
                                    <Cell fill="url(#barBlue)" />
                                    <Cell fill="url(#barGreen)" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardWrapper>

                {/* 2. Evolution du Solde */}
                <CardWrapper title={isRTL ? 'تطور الرصيد التراكمي' : 'ÉVOLUTION DU SOLDE CUMULÉ'} icon={<TrendingDown size={16} className="text-red-500" />}>
                    <div className="h-[250px] w-full print:h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={filtered.slice(-15)}>
                                <defs>
                                    <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                                <XAxis dataKey="date" tickFormatter={fmtDate} fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} dy={10} />
                                <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                                <RechartsTooltip 
                                    labelFormatter={fmtDate}
                                    contentStyle={{ borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorBal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardWrapper>

                {/* 3. Transaction Type Distribution */}
                <CardWrapper title={isRTL ? 'توزيع أنواع العمليات' : 'DISTRIBUTION DES OPÉRATIONS'} icon={<PieIcon size={16} className="text-purple-500" />}>
                    <div className="h-[250px] w-full print:h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={typeDist}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={95}
                                    paddingAngle={8}
                                    dataKey="value"
                                    cornerRadius={10}
                                >
                                    {typeDist.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ borderRadius: '15px' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '800', paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardWrapper>

                {/* 4. Top Sold Products */}
                <CardWrapper title={isRTL ? 'المنتجات الأكثر طلباً' : 'PRODUITS LES PLUS ACHETÉS'} icon={<Package size={16} className="text-orange-500" />}>
                    <div className="h-[250px] w-full print:h-[180px]">
                        {topProducts.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProducts} layout="vertical" margin={{ left: 20, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.05} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={110} fontSize={10} fontWeight="900" axisLine={false} tickLine={false} />
                                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '15px' }} />
                                    <Bar dataKey="qty" fill="#f97316" radius={[0, 10, 10, 0]} barSize={22}>
                                        {topProducts.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'][index % 5]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs font-black text-slate-300">
                                {isRTL ? 'لا توجد بيانات متاحة' : 'Aucune donnée disponible'}
                            </div>
                        )}
                    </div>
                </CardWrapper>
            </div>

            {/* 5. Monthly Trend (Full width) */}
            <div className="print:hidden">
                <CardWrapper title={isRTL ? 'نشاط المبيعات والتحصيل الشهري' : 'ACTIVITÉ MENSUELLE VENTES VS PAIEMENTS'} icon={<BarChart3 size={16} className="text-blue-500" />}>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyTrend} margin={{ top: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                                <XAxis dataKey="month" fontSize={11} fontWeight="800" axisLine={false} tickLine={false} dy={10} />
                                <YAxis fontSize={11} fontWeight="800" axisLine={false} tickFormatter={(v) => fmt(v)} />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }}
                                    formatter={(v) => [`${fmt(v)} MRU`]}
                                />
                                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '30px' }} />
                                <Bar name={isRTL ? 'مبيعات' : 'Ventes'} dataKey="debit" fill="#3b82f6" radius={[8, 8, 8, 8]} barSize={25} />
                                <Bar name={isRTL ? 'تحصيل' : 'Paiements'} dataKey="credit" fill="#10b981" radius={[8, 8, 8, 8]} barSize={25} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardWrapper>
            </div>
        </div>
    );
}

// ─── SUB-COMPONENTS ────────────────────────────────────

function CardWrapper({ title, icon, children }) {
    return (
        <div className="card-premium group bg-white/60 backdrop-blur-md border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 rounded-[2.25rem] p-7 shadow-sm hover:shadow-xl transition-all duration-500 print:rounded-2xl print:p-5 print:shadow-none print:border-slate-200">
            <h3 className="text-[11px] font-black mb-8 flex items-center gap-3 uppercase tracking-[0.2em] text-slate-400 group-hover:text-primary transition-colors print:mb-4 print:text-[8px] print:tracking-normal">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                {title}
            </h3>
            {children}
        </div>
    );
}

function InsightCard({ title, value, icon, color, progress }) {
    const colors = {
        green: 'text-green-600 bg-green-50 border-green-100',
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        purple: 'text-purple-600 bg-purple-50 border-purple-100'
    };
    
    return (
        <div className="card-premium bg-white/40 backdrop-blur-sm border border-slate-100 rounded-[1.75rem] p-5 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            <div className="relative z-10 flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${colors[color]} group-hover:rotate-12 transition-transform`}>
                    {icon}
                </div>
                <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{title}</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white truncate max-w-[150px]">{value}</div>
                </div>
            </div>
            {progress !== undefined && (
                <div className="absolute bottom-0 left-0 h-1 bg-slate-100 w-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-1000 ${color === 'green' ? 'bg-green-500' : 'bg-primary'}`} 
                        style={{ width: `${Math.min(100, progress)}%` }} 
                    />
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    BarChart3, TrendingUp, TrendingDown, PieChart, Activity,
    Download, ArrowUpRight, ArrowDownRight, Package, Users,
    AlertTriangle, DollarSign, Target, Zap, Calendar, Printer
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { useLanguage } from '@/lib/LanguageContext';

import { db } from '@/lib/db';

export default function ReportsPage() {
    const { t, isRTL, fmtNumber, fmtDate, fmtTime } = useLanguage();
    const [stats, setStats] = useState(null);
    const [charts, setCharts] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, chartRes, topRes] = await Promise.all([
                    api.get('/reports/stats').catch(() => ({ data: null })),
                    api.get('/reports/charts').catch(() => ({ data: [] })),
                    api.get('/reports/top-products').catch(() => ({ data: [] })),
                ]);
                
                let statsData = statsRes.data;
                
                // If stats came back null (offline), compute from local DB
                if (!statsData || (typeof statsData === 'object' && !statsData.sales && !statsData.expenses)) {
                    try {
                        const cached = await db.cached_stats.get('dashboard_stats');
                        if (cached) {
                            const { key, ...rest } = cached;
                            statsData = rest;
                        } else {
                            // Compute from local tables
                            const products = await db.products.count();
                            const customers = await db.clients.count();
                            const invoices = await db.invoices.toArray();
                            const expenses = await db.expenses.toArray();
                            const totalSales = invoices.filter(i => i.type === 'SALE').reduce((s, i) => s + (i.finalAmount || 0), 0);
                            const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
                            const lowStock = (await db.products.toArray()).filter(p => (p.stockQty || 0) <= 5).length;
                            statsData = { sales: totalSales, expenses: totalExpenses, profit: totalSales - totalExpenses, products, customers, lowStock };
                        }
                    } catch {
                        statsData = { sales: 0, expenses: 0, profit: 0, products: 0, customers: 0, lowStock: 0 };
                    }
                }
                
                setStats(statsData);
                setCharts(Array.isArray(chartRes.data) ? chartRes.data : []);
                setTopProducts(Array.isArray(topRes.data) ? topRes.data : []);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchData();
        setTimeout(() => setAnimated(true), 400);
    }, []);

    if (loading || !stats) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 opacity-60">
            <div className="w-14 h-14 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-lg font-black animate-pulse text-[var(--text-primary)]">{t('syncing')}</p>
        </div>
    );

    const profitMargin = stats.sales > 0
        ? Math.round((stats.profit / stats.sales) * 100)
        : 0;

    const handlePrint = () => {
        // Increased timeout for better compatibility with WebView/Reactor
        setTimeout(() => {
            window.print();
        }, 500);
    };

    return (
        <div className="space-y-8 pb-12 animate-fade-up print:p-0 bg-[var(--background)]">
            {/* ─── HEADER ─── */}
            <div className="card-premium p-8 lg:p-10 rounded-[2.5rem] bg-[var(--surface-1)] border-none shadow-[var(--shadow-card)] relative overflow-hidden print:border-none print:shadow-none">
                <div className="absolute top-0 right-0 w-full h-full bg-primary/5 pointer-events-none" />
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/5 rounded-full blur-[100px] print:hidden pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-[80px] print:hidden pointer-events-none" />

                <div className={`relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 ${isRTL ? '' : 'flex-row-reverse'}`}>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <div className={`flex items-center gap-4 mb-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className="p-3.5 bg-primary/10 rounded-2xl border border-primary/5 shadow-sm">
                                <BarChart3 size={32} className="text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl lg:text-3xl font-black text-[var(--text-primary)]">{t('reports')}</h1>
                                <p className="text-[--text-muted] text-sm mt-1.5 font-bold opacity-80 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse print:hidden" />
                                    {t('reports_summary')}
                                </p>
                            </div>
                        </div>
                        <div className={`text-[10px] font-black text-[--text-muted] uppercase tracking-widest mt-2 flex items-center gap-2 opacity-60 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <Calendar size={12} className="text-primary" />
                            {t('last_update')}: {fmtDate(new Date())}
                        </div>
                    </div>

                    <button
                        onClick={handlePrint}
                        className={`btn-ghost flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm bg-[var(--surface-2)] border border-[var(--glass-border)] hover:bg-[var(--surface-1)] hover:shadow-md transition-all print:hidden group ${isRTL ? '' : 'flex-row-reverse'}`}
                    >
                        <Printer size={20} className="group-hover:scale-110 transition-transform"  color="#10b981" />
                        {t('print_report')}
                    </button>
                </div>
            </div>

            {/* ─── FINANCIAL KPIs ─── */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${isRTL ? '' : 'direction-ltr'}`}>
                <FinancialCard
                    icon={<TrendingUp size={24} />}
                    title={t('total_sales')}
                    value={fmtNumber(stats.sales || 0)}
                    trend="+12.5%"
                    positive
                    gradient="from-secondary/10 to-transparent"
                    borderColor="secondary"
                    iconStyle={{ background: 'rgba(52,211,153,0.1)', color: 'var(--secondary)' }}
                    isRTL={isRTL}
                />
                <FinancialCard
                    icon={<TrendingDown size={24} />}
                    title={t('total_expenses')}
                    value={fmtNumber(stats.expenses || 0)}
                    trend="-5.2%"
                    positive={false}
                    gradient="from-error/10 to-transparent"
                    borderColor="error"
                    iconStyle={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}
                    isRTL={isRTL}
                />
                <FinancialCard
                    icon={<DollarSign size={24} />}
                    title={t('net_profit')}
                    value={fmtNumber(stats.profit || 0)}
                    trend="+18.7%"
                    positive
                    gradient="from-primary/10 to-transparent"
                    borderColor="primary"
                    iconStyle={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}
                    highlight
                    isRTL={isRTL}
                />
            </div>

            {/* ─── ANALYSIS ROW (Bento Grid Style) ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Trend Chart */}
                <div className={`lg:col-span-2 card-premium p-8 rounded-[2.5rem] border border-[var(--glass-border)] bg-[var(--surface-1)] shadow-sm flex flex-col relative overflow-hidden print:shadow-none ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center justify-between mb-8 relative z-10 ${isRTL ? '' : 'flex-row-reverse'}`}>
                        <div className={`flex items-center gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/5 shadow-sm">
                                <Activity size={20} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-xl text-[var(--text-primary)]">{t('sales_analysis')}</h3>
                                <p className="text-[10px] text-[--text-muted] font-black uppercase tracking-widest mt-1 opacity-60">{t('daily_performance')}</p>
                            </div>
                        </div>
                        <div className="badge border-primary/10 bg-primary/5 text-primary text-[10px] font-black px-4 py-1.5 rounded-full print:hidden">{t('last_7_days')}</div>
                    </div>

                    <div className="h-[320px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={charts}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.03)" vertical={false} />
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }}
                                    reversed={isRTL}
                                />
                                <YAxis hide orientation={isRTL ? 'right' : 'left'} />
                                <Tooltip
                                    cursor={{ stroke: 'var(--primary)', strokeWidth: 2, strokeDasharray: '5 5' }}
                                    contentStyle={{
                                        background: 'var(--card-bg)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '16px',
                                        fontSize: '12px',
                                        fontWeight: '800',
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                                        backdropFilter: 'blur(8px)',
                                        textAlign: isRTL ? 'right' : 'left',
                                        color: 'var(--text-main)'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="var(--primary)"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                    animationDuration={2000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Products */}
                <div className={`card-premium p-8 rounded-[2.5rem] border border-[var(--glass-border)] bg-[var(--surface-1)] shadow-sm flex flex-col relative overflow-hidden print:shadow-none ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center justify-between mb-8 relative z-10 ${isRTL ? '' : 'flex-row-reverse'}`}>
                        <div className={`flex items-center gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className="p-3 bg-secondary/10 rounded-2xl text-secondary border border-secondary/5 shadow-sm">
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-xl text-[var(--text-primary)]">{t('top_articles')}</h3>
                                <p className="text-[10px] text-[--text-muted] font-black uppercase tracking-widest mt-1 opacity-60">{t('most_sold_products')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="h-[320px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProducts.slice(0, 5)} layout="vertical">
                                <XAxis type="number" hide reversed={isRTL} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 900 }}
                                    width={100}
                                    orientation={isRTL ? 'right' : 'left'}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                    contentStyle={{
                                        background: 'var(--card-bg)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '16px',
                                        fontWeight: '800',
                                        textAlign: isRTL ? 'right' : 'left',
                                        color: 'var(--text-main)'
                                    }}
                                />
                                <Bar dataKey="sales" radius={isRTL ? [8, 0, 0, 8] : [0, 8, 8, 0]} barSize={25}>
                                    {topProducts.slice(0, 5).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--primary)' : 'var(--secondary)'} opacity={1 - (index * 0.15)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Operational KPIs Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`card-premium p-8 rounded-[2.5rem] border border-[var(--glass-border)] bg-[var(--surface-1)] shadow-sm flex flex-col relative overflow-hidden print:shadow-none ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center justify-between mb-8 relative z-10 ${isRTL ? '' : 'flex-row-reverse'}`}>
                        <div className={`flex items-center gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className="p-3 bg-secondary/10 rounded-2xl text-secondary shadow-sm">
                                <Activity size={20} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-xl text-[var(--text-primary)]">{t('operational_efficiency')}</h3>
                                <p className="text-[10px] text-[--text-muted] font-black uppercase tracking-widest mt-1 opacity-60">{t('live_stats')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 relative z-10">
                        <EfficiencyItem
                            icon={<Package size={18} className="text-blue-500" />}
                            iconBg="bg-blue-500/10"
                            label={t('total_products')}
                            value={stats.products || 0}
                            sub={t('active_in_stock')}
                            isRTL={isRTL}
                        />
                        <EfficiencyItem
                            icon={<Users size={18} className="text-purple-500" />}
                            iconBg="bg-purple-500/10"
                            label={t('customer_base')}
                            value={stats.customers || 0}
                            sub={t('registered_customers')}
                            isRTL={isRTL}
                        />
                        <EfficiencyItem
                            icon={<AlertTriangle size={18} className="text-yellow-600" />}
                            iconBg="bg-yellow-500/10"
                            label={t('stock_alerts')}
                            value={stats.lowStock || 0}
                            sub={t('low_stock_reached')}
                            warning={(stats.lowStock || 0) > 0}
                            isRTL={isRTL}
                        />
                        <EfficiencyItem
                            icon={<Zap size={18} className="text-secondary" />}
                            iconBg="bg-secondary/10"
                            label={t('inactive_30d')}
                            value="0"
                            sub={t('no_recent_sales')}
                            isRTL={isRTL}
                        />
                    </div>
                </div>

                <div className={`card-premium p-8 rounded-[2.5rem] border border-[var(--glass-border)] bg-gradient-to-br from-[var(--surface-1)] to-primary/5 shadow-sm flex flex-col relative overflow-hidden print:shadow-none ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
                    <div className={`flex items-center justify-between mb-8 relative z-10 ${isRTL ? '' : 'flex-row-reverse'}`}>
                        <div className={`flex items-center gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm">
                                <Target size={20} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-xl text-[var(--text-primary)]">{t('profitability_analysis')}</h3>
                                <p className="text-[10px] text-[--text-muted] font-black uppercase tracking-widest mt-1 opacity-60">{t('net_performance')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center gap-8 relative z-10">
                        <div className={`flex justify-between items-end ${isRTL ? '' : 'flex-row-reverse'}`}>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <div className="text-[11px] font-black text-[--text-muted] uppercase tracking-widest mb-3 opacity-60">{t('profit_margin_ratio')}</div>
                                <div className={`text-6xl font-black text-primary tracking-tighter ${isRTL ? '' : 'direction-ltr'}`}>{profitMargin}<span className="text-2xl ml-2">%</span></div>
                            </div>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <div className={`px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest border shadow-sm ${profitMargin > 15 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                    {profitMargin > 15 ? t('excellent_perf') : t('good_perf')}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="w-full h-5 bg-[var(--surface-2)] rounded-full overflow-hidden border border-[var(--glass-border)] shadow-inner">
                                <div
                                    className={`h-full rounded-full transition-all duration-[2000ms] relative ${isRTL ? 'float-right' : 'float-left'}`}
                                    style={{
                                        width: animated ? `${Math.min(profitMargin, 100)}%` : '0%',
                                        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                                    }}
                                >
                                    <div className="absolute top-0 right-0 w-full h-full bg-white/20 animate-pulse" />
                                </div>
                            </div>
                            <div className={`flex justify-between text-[10px] font-black text-[--text-muted] uppercase tracking-widest px-1 ${isRTL ? '' : 'flex-row-reverse'}`}>
                                <span>0%</span>
                                <span>{t('target_level')}: 25%</span>
                                <span>100%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── HIDDEN PRINT LAYOUT ─── */}
                <div className="hidden print:block print:bg-white print:text-black print:p-12 font-sans" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: "'Cairo', sans-serif" }}>
                    <div className="text-center border-b-[3px] border-black pb-8 mb-10">
                        <h1 className="text-4xl font-black mb-1 text-black tracking-tighter uppercase">RAID</h1>
                        <h2 className="text-2xl font-black uppercase tracking-widest">{isRTL ? 'تقرير الأداء المالي والتشغيلي' : 'RAPPORT DE PERFORMANCE'}</h2>
                        <p className="text-sm mt-3 opacity-70 font-bold uppercase tracking-widest">
                            {isRTL ? 'تاريخ التقرير:' : 'Date du rapport:'} {fmtDate(new Date())} {fmtTime(new Date())}
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-8 mb-12 border-b-2 border-dashed border-gray-200 pb-12">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{isRTL ? 'إجمالي المبيعات' : 'Ventes Totales'}</p>
                            <p className="text-3xl font-black">{fmtNumber(stats.sales)} <span className="text-xs">MRU</span></p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{isRTL ? 'إجمالي المصاريف' : 'Dépenses Totales'}</p>
                            <p className="text-3xl font-black">{fmtNumber(stats.expenses)} <span className="text-xs">MRU</span></p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{isRTL ? 'صافي الربح' : 'Bénéfice Net'}</p>
                            <p className="text-3xl font-black text-primary">{fmtNumber(stats.profit)} <span className="text-xs">MRU</span></p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-10 mb-12">
                        <div className="border border-gray-200 rounded-3xl p-8 bg-gray-50/50">
                            <h3 className="font-black text-lg mb-6 uppercase tracking-widest border-b border-gray-200 pb-4">{isRTL ? 'أهم المؤشرات' : 'Indicateurs clés'}</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between font-bold text-sm">
                                    <span>{isRTL ? 'قوة لمنتجات' : 'Base Produits'}</span>
                                    <span>{stats.products} {isRTL ? 'صنف' : 'articles'}</span>
                                </div>
                                <div className="flex justify-between font-bold text-sm">
                                    <span>{isRTL ? 'قاعدة العملاء' : 'Base Clients'}</span>
                                    <span>{stats.customers} {isRTL ? 'عميل' : 'clients'}</span>
                                </div>
                                <div className="flex justify-between font-bold text-sm">
                                    <span>{isRTL ? 'أصناف منخفضة المخزون' : 'Stock en alerte'}</span>
                                    <span className={stats.lowStock > 0 ? 'text-red-600' : ''}>{stats.lowStock} {isRTL ? 'صنف' : 'articles'}</span>
                                </div>
                                <div className="pt-4 border-t border-gray-200 flex justify-between font-black text-md">
                                    <span>{isRTL ? 'نسبة هامش الربح' : 'Marge bénéficiaire'}</span>
                                    <span className="text-primary">{profitMargin}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="border border-gray-200 rounded-3xl p-8 bg-gray-50/50">
                            <h3 className="font-black text-lg mb-6 uppercase tracking-widest border-b border-gray-200 pb-4">{isRTL ? 'الأصناف الأكثر مبيعاً' : 'Top Articles'}</h3>
                            <div className="space-y-4">
                                {topProducts.slice(0, 5).map((p, i) => (
                                    <div key={i} className="flex justify-between text-sm font-bold">
                                        <span className="truncate max-w-[150px]">{p.name}</span>
                                        <span className="text-gray-500">{fmtNumber(p.sales)} MRU</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-20 border-t-2 border-black pt-10 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                        {isRTL ? 'نهاية التقرير' : 'Fin du rapport'} • Rapport de Performance Raid
                    </div>
                </div>
            </div>
        </div>
    );
}

function FinancialCard({ icon, title, value, trend, positive, gradient, borderColor, iconStyle, highlight, isRTL }) {
    const borderColors = {
        primary: 'border-primary/20 bg-primary/5',
        secondary: 'border-secondary/20 bg-secondary/5',
        error: 'border-error/20 bg-error/5',
    };
    return (
        <div className={`card-premium p-8 rounded-[2.5rem] relative overflow-hidden bg-gradient-to-br ${gradient} border border-[var(--glass-border)] border-b-4 ${borderColors[borderColor]} ${highlight ? 'shadow-lg shadow-primary/5' : ''} transition-all duration-300 group/fin print:shadow-none print:border-slate-200 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className={`absolute -top-12 -left-12 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover/fin:opacity-100 transition-opacity pointer-events-none`}
                style={{ background: iconStyle.color + '20' }} />

            <div className={`flex items-start justify-between mb-6 relative z-10 ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className="p-3.5 rounded-2xl border border-white/40 shadow-sm" style={iconStyle}>{icon}</div>
                <div className={`flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-xl border shadow-sm print:hidden
                    ${positive ? 'bg-secondary/10 text-secondary border-secondary/10' : 'bg-error/10 text-error border-error/10'}`}>
                    {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {trend}
                </div>
            </div>
            <div className="text-[11px] font-black text-[--text-muted] uppercase tracking-widest mb-2 relative z-10 opacity-60">{title}</div>
            <div className={`text-3xl font-black text-[var(--text-primary)] group-hover/fin:translate-x-1 transition-transform relative z-10 origin-right ${isRTL ? '' : 'direction-ltr flex-row-reverse flex justify-end gap-2'}`}>
                {value}
                <span className={`text-xs font-bold text-[--text-muted] ${isRTL ? 'mr-2' : 'ml-2'} uppercase tracking-tighter`}>MRU</span>
            </div>
        </div>
    );
}

function EfficiencyItem({ icon, iconBg, label, value, sub, warning, isRTL }) {
    return (
        <div className={`flex items-center justify-between p-5 bg-[var(--surface-2)] rounded-3xl border border-[var(--glass-border)] hover:bg-[var(--surface-1)] hover:shadow-md transition-all duration-300 group/ei ${warning ? 'border-yellow-500/30 bg-yellow-500/5' : ''} print:border-slate-200 ${isRTL ? '' : 'flex-row-reverse'}`}>
            <div className={`flex items-center gap-4 ${isRTL ? '' : 'flex-row-reverse'}`}>
                <div className={`p-3 rounded-2xl ${iconBg} group-hover/ei:scale-110 transition-transform ${warning ? 'animate-pulse' : ''} shadow-sm`}>
                    {icon}
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="text-sm font-black text-[var(--text-primary)]">{label}</div>
                    <div className="text-[9px] text-[--text-muted] font-bold uppercase tracking-widest mt-0.5 opacity-60">{sub}</div>
                </div>
            </div>
            <div className={`text-2xl font-black ${warning ? 'text-yellow-600' : 'text-[var(--text-primary)]'}`}>{value}</div>
        </div>
    );
}

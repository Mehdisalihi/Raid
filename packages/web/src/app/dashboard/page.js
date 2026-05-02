'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    TrendingUp, Package, AlertTriangle, DollarSign, ArrowUpRight,
    BarChart2, Users, ShoppingBag, Activity, Zap, Clock,
    ArrowDownRight, ShoppingCart, Receipt, ChevronLeft,
    TrendingDown, Calendar, CreditCard, RotateCcw, Undo2
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

import { db } from '@/lib/db';

export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [activities, setActivities] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [error, setError] = useState(null);
    const [animBars, setAnimBars] = useState(false);
    const [loading, setLoading] = useState(true);
    const { t, isRTL, fmtNumber, fmtTime } = useLanguage();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Try Cloud
                const [statsRes, activitiesRes, chartsRes, topProductsRes] = await Promise.all([
                    api.get('/reports/stats').catch(() => null),
                    api.get('/reports/activities').catch(() => null),
                    api.get('/reports/charts').catch(() => null),
                    api.get('/reports/top-products').catch(() => null)
                ]);

                if (statsRes && activitiesRes) {
                    setStats(statsRes.data);
                    setActivities(activitiesRes.data);
                    setChartData(chartsRes?.data || []);
                    setTopProducts(topProductsRes?.data || []);
                } else {
                    throw new Error('Using local fallback');
                }
            } catch (err) {
                console.warn('Dashboard: Falling back to local data');
                // 2. Local Fallback (Calculate from Dexie)
                const productsCount = await db.products.count();
                const invoices = await db.invoices.toArray();
                const expenses = await db.expenses.toArray();
                
                const totalSales = invoices.reduce((acc, inv) => acc + (inv.finalAmount || 0), 0);
                const totalExpenses = expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);

                setStats({ products: productsCount, sales: totalSales, expenses: totalExpenses });
                setActivities([]); // Would need a local activity log table for full offline
                setChartData([]);
                setTopProducts([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        setTimeout(() => setAnimBars(true), 200);
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-12 h-12 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-[--text-muted] text-sm animate-pulse font-bold">{t('syncing')}</p>
        </div>
    );

    const safeChartData = Array.isArray(chartData) ? chartData : [];
    const maxChartVal = safeChartData.length > 0 ? Math.max(...safeChartData.map(d => d.value), 1) : 1;

    return (
        <div className="space-y-7 pb-8 animate-fade-up">
            {/* ─── KPI CARDS ─── */}
            <div className="bento-grid">
                <StatCard
                    title={t('total_sales_today')}
                    value={`MRU ${fmtNumber(stats?.sales || 0)}`}
                    icon={<ShoppingCart size={20} />}
                    trend="+12.5%"
                    trendPos
                    color={{ 
                        bg: 'bg-gradient-to-br from-[var(--primary)]/5 to-[var(--primary)]/10', 
                        border: 'border-[var(--primary)]/20', 
                        icon: 'bg-primary text-white shadow-[0_0_15px_var(--primary-glow)]', 
                        glow: 'none' 
                    }}
                />
                <StatCard
                    title={t('products_in_stock')}
                    value={fmtNumber(stats?.products || 0, { minimumFractionDigits: 0 })}
                    sub={isRTL ? 'منتج' : 'Prod'}
                    icon={<Package size={20} />}
                    trend="+5.2%"
                    trendPos
                    color={{ bg: 'bg-gradient-to-br from-green-500/5 to-green-500/10', border: 'border-green-500/20', icon: 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]', glow: 'none' }}
                />
                <StatCard
                    title={t('total_expenses')}
                    value={`MRU ${fmtNumber(stats?.expenses || 0)}`}
                    icon={<CreditCard size={20} />}
                    trend="-2.1%"
                    trendPos
                    color={{ bg: 'bg-gradient-to-br from-pink-500/5 to-pink-500/10', border: 'border-pink-500/20', icon: 'bg-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)]', glow: 'none' }}
                />
                <StatCard
                    title={t('due_debts')}
                    value={`MRU 0`}
                    icon={<AlertTriangle size={20} />}
                    trend="0%"
                    trendPos={false}
                    color={{ bg: 'bg-gradient-to-br from-orange-500/5 to-orange-500/10', border: 'border-orange-500/20', icon: 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]', glow: 'none' }}
                />
            </div>

            {/* ─── CHARTS ROW ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Bar Chart */}
                <div className="lg:col-span-2 card-premium flex flex-col border-[var(--glass-border)] bg-[var(--surface-1)]">
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-2xl text-primary transform rotate-2 shadow-sm">
                                <BarChart2 size={24} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-[1.3rem] text-[var(--text-primary)]">{t('sales_analysis')}</h3>
                                <p className="text-[11px] text-[--text-muted] mt-1 font-bold tracking-[0.1em] uppercase">{t('last_7_days')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-2)] rounded-xl border border-[var(--glass-border)] shadow-sm">
                            <span className="relative flex h-2 w-2 mr-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs font-bold text-[--text-muted]">{t('live')}</span>
                        </div>
                    </div>

                    <div className="flex-1 flex items-end gap-3 px-2 pb-4 min-h-[260px]">
                        {safeChartData.map((bar, i) => {
                            const heightPercentage = (bar.value / maxChartVal) * 100;
                            return (
                                <div key={i} className="flex flex-col items-center flex-1 gap-4 h-[240px] justify-end group/bar">
                                    <div className="relative flex flex-col items-center justify-end w-full h-full">
                                        <div
                                            className="w-full max-w-[45px] rounded-t-xl md:rounded-t-2xl relative overflow-hidden transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1)"
                                            style={{
                                                height: animBars ? `${heightPercentage}%` : '0%',
                                                background: `linear-gradient(180deg, var(--primary) 0%, var(--primary-glow) 100%)`,
                                                boxShadow: animBars ? `0 -4px 20px ${i === safeChartData.length - 1 ? 'var(--primary-glow)' : 'transparent'}` : 'none',
                                                transitionDelay: `${i * 80}ms`,
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 opacity-40 mix-blend-overlay" />
                                            <div className="absolute top-2 left-0 right-0 text-center text-[11px] font-black text-white/90 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                                                {bar.value >= 1000 ? `${(bar.value / 1000).toFixed(1)}k` : bar.value}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[11px] font-black text-[--text-muted] uppercase tracking-tighter">{bar.day}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="card-premium flex flex-col border-[var(--glass-border)] bg-[var(--surface-1)]">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm">
                            <Activity size={22} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-[1.2rem] text-[var(--text-primary)]">{t('recent_activity')}</h3>
                            <p className="text-[10px] text-[--text-muted] font-bold uppercase tracking-widest mt-1">{t('live_log')}</p>
                        </div>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto custom-scroll pr-1">
                        {activities.length > 0 ? (
                            activities.map((act) => (
                                <ActivityItem
                                    key={act.id}
                                    label={act.label}
                                    time={fmtTime(act.time)}
                                    amount={fmtNumber(parseFloat((act.amount || '0').toString().replace(/[^0-9.-]/g, '')) || 0)}
                                    positive={act.positive}
                                    isRTL={isRTL}
                                />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-40 gap-3">
                                <Clock size={40} className="text-[var(--text-muted)]" />
                                <p className="text-sm font-bold text-[var(--text-muted)]">Empty</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Products Chart */}
                <div className="card-premium flex flex-col border-[var(--glass-border)] bg-[var(--surface-1)]">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm">
                            <ShoppingBag size={22} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-[1.2rem] text-[var(--text-primary)]">{isRTL ? 'أعلى المنتجات' : 'Top Products'}</h3>
                            <p className="text-[10px] text-[--text-muted] font-bold uppercase tracking-widest mt-1">{isRTL ? 'الأداء المالي' : 'Financial Performance'}</p>
                        </div>
                    </div>
                    <div className="space-y-5 flex-1 overflow-visible">
                        {topProducts.length > 0 ? (
                            topProducts.map((prod, i) => {
                                const revValue = parseFloat((prod.rev || '0').toString().replace(/[^0-9.]/g, '')) || 0;
                                const maxRev = Math.max(...topProducts.map(p => parseFloat((p.rev || '0').toString().replace(/[^0-9.]/g, '')) || 0), 1);
                                const width = (revValue / maxRev) * 100;
                                return (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-[11px] font-bold">
                                            <span className="text-[var(--text-primary)] line-clamp-1">{prod.name}</span>
                                            <span className="text-primary">{prod.rev}</span>
                                        </div>
                                        <div className="h-2 w-full bg-[var(--surface-2)] rounded-full overflow-hidden border border-[var(--glass-border)]">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1)"
                                                style={{ width: animBars ? `${width}%` : '0%', transitionDelay: `${i * 100}ms` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-40 gap-3">
                                <Activity size={40} className="text-[var(--text-muted)]" />
                                <p className="text-sm font-bold text-[var(--text-muted)]">No Data</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* ─── QUICK ACTIONS ─── */}
            <div>
                <div className="flex justify-between items-center mb-4 mt-8 px-2">
                    <h2 className="text-xl font-bold text-[--text-primary]">{t('quick_actions')}</h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <QuickAction href="/dashboard/products" icon={<Package size={28} />} title={t('products')} desc={isRTL ? 'إدارة المخزون' : 'Gérer le stock'} color="orange" />
                    <QuickAction href="/dashboard/sales" icon={<ShoppingCart size={28} />} title={t('sales')} desc={isRTL ? 'عرض المبيعات' : 'Voir les ventes'} color="purple" />
                    <QuickAction href="/dashboard/returns" icon={<Undo2 size={28} />} title={t('returns')} desc={isRTL ? 'إدارة المرتجعات' : 'Gérer les retours'} color="pink" />
                    <QuickAction href="/dashboard/invoices" icon={<Receipt size={28} />} title={t('invoices')} desc={isRTL ? 'فاتورة سريعة' : 'Facture rapide'} color="green" />
                    <QuickAction href="/dashboard/settings" icon={<Zap size={28} />} title={t('settings')} desc={isRTL ? 'إعدادات النظام' : 'Paramètres système'} color="gray" />
                    <QuickAction href="/dashboard/customers" icon={<Users size={28} />} title={t('customers')} desc={isRTL ? 'إدارة العملاء' : 'Gérer les clients'} color="teal" />
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, sub, icon, trend, trendPos, color }) {
    return (
        <div className={`card-premium ${color.bg} border ${color.border} relative overflow-hidden group/card`}>
            <div className="flex flex-col justify-center p-3 relative z-10 w-full h-full">
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-11 h-11 flex items-center justify-center rounded-2xl ${color.icon} group-hover/card:scale-110 group-hover/card:rotate-3 transition-all duration-500`}>
                        {icon}
                    </div>
                    <div className={`flex items-center gap-1 font-bold px-2.5 py-1.5 rounded-xl text-[11px] shadow-sm backdrop-blur-md bg-white/60 ${trendPos ? 'text-green-600' : 'text-red-500'}`}>
                        {trendPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {trend}
                    </div>
                </div>

                <div className="text-[13px] font-bold text-[--text-muted] mb-1.5">{title}</div>
                <div className="text-[28px] font-black text-[--text-primary] flex items-baseline gap-2 mt-1 tracking-tight">
                    {value}
                    {sub && <span className="text-sm text-[--text-muted] font-bold">{sub}</span>}
                </div>
            </div>
        </div>
    );
}

function ActivityItem({ label, time, amount, positive, isRTL }) {
    const { fmtNumber } = useLanguage();
    return (
        <div className={`flex justify-between items-center p-4 bg-[var(--surface-2)] rounded-2xl border border-[var(--glass-border)] transition-all group/item hover:border-[var(--primary)] hover:shadow-md hover:-translate-y-0.5 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-inner relative overflow-hidden
                    ${positive ? 'bg-green-100/50 text-green-600' : 'bg-red-100/50 text-red-500'}`}>
                    {positive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <div className={`absolute inset-0 opacity-20 ${positive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                </div>
                <div>
                    <div className="text-[14px] font-extrabold text-[var(--text-primary)] group-hover/item:text-primary transition-colors line-clamp-1">{label}</div>
                    <div className="text-[11px] text-[--text-muted] font-bold flex items-center gap-1 mt-1">
                        <Clock size={12} className="opacity-70" />
                        {time}
                    </div>
                </div>
            </div>
            <div className={`text-[14px] font-black shrink-0 px-3 py-1.5 rounded-xl border
                ${positive ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 border-red-100 text-red-500'}`}>
                {positive ? '+' : ''}{amount} <span className="text-[9px] font-bold opacity-80 uppercase ml-0.5">MRU</span>
            </div>
        </div>
    );
}

function QuickAction({ href, icon, title, desc, color }) {
    const colors = {
        blue: { bg: 'bg-gradient-to-br from-[#eff6ff] to-[#dbeafe]/50', icon: 'bg-blue-500', iconText: 'text-white', border: 'border-blue-100', shadow: 'shadow-[0_4px_20px_rgba(59,130,246,0.15)]' },
        green: { bg: 'bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7]/50', icon: 'bg-green-500', iconText: 'text-white', border: 'border-green-100', shadow: 'shadow-[0_4px_20px_rgba(34,197,94,0.15)]' },
        purple: { bg: 'bg-gradient-to-br from-[#faf5ff] to-[#f3e8ff]/50', icon: 'bg-purple-500', iconText: 'text-white', border: 'border-purple-100', shadow: 'shadow-[0_4px_20px_rgba(168,85,247,0.15)]' },
        orange: { bg: 'bg-gradient-to-br from-[#fff7ed] to-[#ffedd5]/50', icon: 'bg-orange-500', iconText: 'text-white', border: 'border-orange-100', shadow: 'shadow-[0_4px_20px_rgba(249,115,22,0.15)]' },
        pink: { bg: 'bg-gradient-to-br from-[#fdf2f8] to-[#fce7f3]/50', icon: 'bg-pink-500', iconText: 'text-white', border: 'border-pink-100', shadow: 'shadow-[0_4px_20px_rgba(236,72,153,0.15)]' },
        teal: { bg: 'bg-gradient-to-br from-[#f0fdfa] to-[#ccfbf1]/50', icon: 'bg-teal-500', iconText: 'text-white', border: 'border-teal-100', shadow: 'shadow-[0_4px_20px_rgba(20,184,166,0.15)]' },
        gray: { bg: 'bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9]/50', icon: 'bg-gray-600', iconText: 'text-white', border: 'border-gray-200', shadow: 'shadow-[0_4px_20px_rgba(71,85,105,0.15)]' },
    };
    const c = colors[color] || colors.blue;
    return (
        <a
            href={href}
            className={`card-premium ${c.bg} border ${c.border} flex flex-col items-center justify-center gap-4 py-7 text-center transition-all duration-300 group/qa rounded-2xl cursor-pointer hover:-translate-y-1 hover:${c.shadow}`}
        >
            <div className={`w-14 h-14 flex items-center justify-center rounded-[1.2rem] ${c.icon} ${c.iconText} shadow-md group-hover/qa:scale-110 group-hover/qa:rotate-3 transition-all duration-500`}>
                {icon}
            </div>
            <div>
                <div className="font-extrabold text-[16px] text-[var(--text-primary)]">{title}</div>
                <div className="text-[12px] text-[--text-muted] font-medium mt-1.5 opacity-80">{desc}</div>
            </div>
        </a>
    );
}

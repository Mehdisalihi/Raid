import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';
import { translations } from '../i18n/translations';
import { fNum } from '../utils/format';

const Dashboard = () => {
  const { sales, expenses, products, purchases, settings, language } = useAppStore();
  const t = translations[language];
  const [chartRange, setChartRange] = useState(7);

  const daysLabels = t.days;

  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.date === today).reduce((sum, s) => sum + s.total, 0);
  const todayExpenses = expenses.filter(e => e.date === today).reduce((sum, e) => sum + e.amount, 0);

  const lowStockItems = products.filter(p => p.quantity < (p.minThreshold || 5));

  const last7Days = [...Array(chartRange)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (chartRange - 1 - i));
    return d.toISOString().split('T')[0];
  });

  const chartData = last7Days.map(date => {
    const daySales = sales.filter(s => s.date === date).reduce((sum, s) => sum + (s.finalTotal || s.total), 0);
    const dayExpenses = expenses.filter(e => e.date === date).reduce((sum, e) => sum + e.amount, 0);
    const dayPurchases = purchases.filter(p => p.date === date).reduce((sum, p) => sum + p.total, 0);

    const dayName = chartRange <= 7
      ? daysLabels[new Date(date).getDay()]
      : date.slice(5);

    return {
      name: dayName,
      sales: daySales,
      expenses: dayExpenses + dayPurchases,
      fullDate: date
    };
  });

  const totalRevenue = sales.reduce((sum, s) => sum + (s.finalTotal || s.total), 0);
  const totalCost = sales.reduce((sum, s) => {
    const cost = s.items.reduce((cSum, item) => {
      const p = products.find(prod => prod.id === (item.productId || item.id));
      const buyPrice = p?.purchasePrice || (item.price * 0.7);
      return cSum + (buyPrice * item.quantity);
    }, 0);
    return sum + cost;
  }, 0);
  const totalProfit = totalRevenue - totalCost;

  const productSales = {};
  sales.forEach(s => {
    s.items.forEach(item => {
      const id = item.productId || item.id;
      productSales[id] = (productSales[id] || 0) + item.quantity;
    });
  });
  const topProducts = products
    .map(p => ({ ...p, sold: productSales[p.id] || 0 }))
    .filter(p => p.sold > 0)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  const StatCard = ({ title, value, icon: Icon, color, trend, trendValue, gradient }) => (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      className="card card-premium"
      style={{
        background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
        border: 'none',
        overflow: 'hidden'
      }}
    >
      <div style={{ position: 'absolute', top: '-20%', left: '-20%', width: '150px', height: '150px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', blur: '40px' }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem', position: 'relative' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '18px',
          background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'white',
          boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
        }}>
          <Icon size={28} />
        </div>
        {trend && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '0.75rem', fontWeight: 900,
            color: 'white',
            background: 'rgba(255,255,255,0.2)',
            padding: '6px 12px', borderRadius: '20px',
            backdropFilter: 'blur(4px)'
          }}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trendValue}
          </div>
        )}
      </div>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{title}</p>
      <h3 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'white', marginTop: '0.5rem', letterSpacing: '-1px' }}>
        {fNum(value)} <span style={{ fontSize: '1rem', opacity: 0.6, fontWeight: 500 }}>{settings.currency}</span>
      </h3>
    </motion.div>
  );

  return (
    <div className="dashboard scrollable-page" style={{ padding: '1rem 0' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '3rem' }}
      >
        <h2 className="title-lg" style={{ fontSize: '2.5rem', color: 'white' }}>{t.businessOverview}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }}></div>
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{t.welcomeBack}, إليك ملخص نشاطك التجاري اليوم.</p>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '3.5rem' }}>
        <StatCard
          title={t.salesToday}
          value={todaySales}
          icon={TrendingUp}
          gradient={['#f97316', '#ea580c']}
          trend="up"
          trendValue="+12.5%"
        />
        <StatCard
          title={t.expensesToday}
          value={todayExpenses}
          icon={TrendingDown}
          gradient={['#ef4444', '#dc2626']}
          trend="down"
          trendValue="-2.4%"
        />
        <StatCard
          title={t.totalProfit || (language === 'ar' ? 'صافي الربح' : 'Net Profit')}
          value={totalProfit}
          icon={DollarSign}
          gradient={['#10b981', '#059669']}
          trend={totalProfit > 0 ? "up" : "down"}
          trendValue={totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : "0%"}
        />
        <StatCard
          title={t.stockAlerts}
          value={lowStockItems.length}
          icon={AlertTriangle}
          gradient={['#8b5cf6', '#7c3aed']}
          trend={lowStockItems.length > 0 ? "down" : "up"}
          trendValue={lowStockItems.length > 0 ? "تنبيه" : "آمن"}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '3rem' }}>
        {/* Sales Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="card"
          style={{ padding: '2.5rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
            <div>
              <h3 className="title-md" style={{ fontSize: '1.4rem', color: 'white' }}>{t.revenueAnalysis}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>مقارنة المبيعات والمصاريف للفترة المحددة</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '16px' }}>
              <button
                className={`btn ${chartRange === 7 ? 'btn-primary' : ''}`}
                style={{
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.8rem',
                  background: chartRange === 7 ? 'var(--primary)' : 'transparent',
                  color: chartRange === 7 ? 'white' : 'var(--text-muted)',
                  borderRadius: '12px',
                  border: 'none'
                }}
                onClick={() => setChartRange(7)}
              >{t.last7Days}</button>
              <button
                className={`btn ${chartRange === 30 ? 'btn-primary' : ''}`}
                style={{
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.8rem',
                  background: chartRange === 30 ? 'var(--primary)' : 'transparent',
                  color: chartRange === 30 ? 'white' : 'var(--text-muted)',
                  borderRadius: '12px',
                  border: 'none'
                }}
                onClick={() => setChartRange(30)}
              >{t.last30Days}</button>
            </div>
          </div>
          <div style={{ width: '100%', height: '400px' }}>
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-light)', fontSize: 12, fontWeight: 600 }}
                  dy={15}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-light)', fontSize: 12, fontWeight: 600 }}
                  dx={-15}
                  orientation={language === 'ar' ? 'right' : 'left'}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(20, 20, 20, 0.9)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    textAlign: language === 'ar' ? 'right' : 'left',
                    backdropFilter: 'blur(10px)'
                  }}
                  itemStyle={{ fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="sales" stroke="var(--primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" strokeDasharray="6 6" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Activity / Best Sellers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 className="title-md" style={{ color: 'white' }}>{t.bestSelling || (language === 'ar' ? 'الأكثر مبيعاً' : 'Best Sellers')}</h3>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)' }}>
                <ExternalLink size={18} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {topProducts.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                    <Package size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white' }}>{item.name}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{t.sold || (language === 'ar' ? 'الكمية' : 'Qty')}: {item.sold}</p>
                  </div>
                  <div style={{ textAlign: language === 'ar' ? 'left' : 'right' }}>
                    <p style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)' }}>{fNum(item.sold * item.price)} <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{settings.currency}</span></p>
                  </div>
                </div>
              ))}
              {topProducts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem 0', opacity: 0.3 }}>
                  <Package size={48} style={{ marginBottom: '1rem' }} />
                  <p>{t.noSalesYet}</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card"
            style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              border: '1px solid rgba(255,255,255,0.05)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '120px', height: '120px', background: 'var(--primary)', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.1 }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Clock size={20} color="var(--primary)" />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t.lastSale}</h4>
            </div>
            {sales.length > 0 ? (
              <div>
                <h2 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: '0.75rem', background: 'linear-gradient(90deg, #fff, rgba(255,255,255,0.5))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {fNum(sales[sales.length - 1].total)} {settings.currency}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                  <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '8px' }}>{sales[sales.length - 1].date}</span>
                  <span style={{ opacity: 0.3 }}>•</span>
                  <span>رقم الفاتورة: #{sales[sales.length - 1].invoiceNumber}</span>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{t.noSalesYet}</p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

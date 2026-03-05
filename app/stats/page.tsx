'use client';

import { useState, useMemo } from 'react';
import { useFinance } from '@/lib/context';
import { formatCurrency, CATEGORY_CONFIG, calcPercentage, getMonthName } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const COLORS = ['#4F7CFF', '#8B5CF6', '#F97316', '#EC4899', '#10B981', '#06B6D4'];

export default function StatsPage() {
  const { transactions, monthSummary, settings, runOutDay } = useFinance();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const today = new Date();
  const monthName = getMonthName(today.getMonth());

  const categoryData = useMemo(() => {
    if (!monthSummary?.byCategory) return [];
    return Object.entries(monthSummary.byCategory)
      .map(([key, value]) => ({
        name: CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG]?.label ?? key,
        value,
        color: CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG]?.color ?? '#94A3B8',
        icon: CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG]?.icon ?? '📦',
        key,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [monthSummary]);

  // Last 7 days daily spending
  const dailyData = useMemo(() => {
    const days: { day: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const daySpent = transactions
        .filter((t) => t.type === 'expense' && t.date.startsWith(dateStr))
        .reduce((s, t) => s + t.amount, 0);
      days.push({
        day: d.toLocaleDateString('es-MX', { weekday: 'short' }).slice(0, 2),
        amount: daySpent,
      });
    }
    return days;
  }, [transactions]);

  const totalSpent = monthSummary?.totalExpenses ?? 0;
  const monthlyIncome = settings?.monthlyIncome ?? 0;
  const savingsPct = monthlyIncome > 0 ? Math.max(0, ((monthlyIncome - totalSpent) / monthlyIncome) * 100) : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background: '#1E2333', color: '#F1F5F9' }}>
          {formatCurrency(payload[0].value, settings?.currency)}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-screen overflow-y-auto pb-28">
      {/* Header */}
      <div
        className="px-5 pb-4 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <h1 className="text-text-primary font-display font-bold text-lg">Estadísticas</h1>
        <div className="flex items-center gap-1.5">
          {(['daily', 'weekly', 'monthly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: period === p ? '#4F7CFF' : 'var(--bg-elevated)',
                color: period === p ? 'white' : '#94A3B8',
              }}
            >
              {p === 'daily' ? 'Día' : p === 'weekly' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      {/* Donut Chart */}
      <div className="px-5 mb-5">
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-text-secondary text-xs font-semibold tracking-widest text-center mb-2">
            CICLO ACTUAL — {monthSummary?.cycleStart
              ? new Date(monthSummary.cycleStart).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
              : monthName.toUpperCase()}
            {monthSummary?.cycleEnd
              ? " → " + new Date(monthSummary.cycleEnd).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
              : ""}
          </p>
          <div className="relative flex items-center justify-center" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryData.length > 0 ? categoryData : [{ name: 'Sin datos', value: 1, color: '#1E2333' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {(categoryData.length > 0 ? categoryData : [{ color: '#1E2333' }]).map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <p
                className="font-display font-bold"
                style={{ fontSize: '1.5rem', letterSpacing: '-0.02em', color: '#F1F5F9' }}
              >
                {formatCurrency(totalSpent, settings?.currency)}
              </p>
              <p className="text-text-muted text-xs">Total gastado</p>
            </div>
          </div>

          {/* Comparison */}
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className="text-green-400 text-xs font-semibold">↑ {savingsPct.toFixed(0)}%</span>
            <span className="text-text-muted text-xs">disponible del ingreso</span>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      {categoryData.length > 0 && (
        <div className="px-5 mb-5">
          <div className="grid grid-cols-2 gap-3">
            {categoryData.slice(0, 4).map((cat) => {
              const pct = calcPercentage(cat.value, totalSpent);
              return (
                <div
                  key={cat.key}
                  className="rounded-2xl p-4"
                  style={{ background: 'var(--bg-card)' }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    <p className="text-text-secondary text-xs font-medium">{cat.name}</p>
                  </div>
                  <p className="font-display font-bold text-xl" style={{ color: '#F1F5F9', letterSpacing: '-0.02em' }}>
                    {pct}%
                  </p>
                  <p className="text-text-muted text-xs mt-0.5">
                    {formatCurrency(cat.value, settings?.currency)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily spending chart */}
      <div className="px-5 mb-5">
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-text-primary font-display font-semibold text-sm mb-4">
            Últimos 7 días
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={dailyData} barSize={20}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="day"
                tick={{ fill: '#475569', fontSize: 11, fontFamily: 'var(--font-geist)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,124,255,0.05)' }} />
              <Bar
                dataKey="amount"
                fill="url(#barGrad)"
                radius={[6, 6, 0, 0]}
              />
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F7CFF" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spending Prediction */}
      {runOutDay && (
        <div className="px-5 mb-5">
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(79,124,255,0.1), rgba(139,92,246,0.1))',
              border: '1px solid rgba(79,124,255,0.2)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M4 20L8 14L12 17L16 10L20 4" stroke="#4F7CFF" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-accent-blue text-xs font-semibold tracking-widest">PREDICCIÓN DE GASTOS</p>
            </div>
            <p className="text-text-primary text-sm leading-relaxed">
              Si continúas gastando así, te{' '}
              <span className="text-red-400 font-semibold">quedarás sin dinero</span> el{' '}
              <span
                className="px-2 py-0.5 rounded-lg text-white font-bold"
                style={{ background: '#4F7CFF' }}
              >
                día {runOutDay}
              </span>{' '}
              de este mes.
            </p>
            <div className="flex items-center justify-between mt-3">
              <p className="text-text-muted text-xs">
                Ahorro actual:{' '}
                <span className="text-text-secondary">
                  {formatCurrency((monthSummary?.monthlyIncome ?? 0) - totalSpent, settings?.currency)}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Budget vs actual */}
      {settings && monthSummary && (
        <div className="px-5 mb-5">
          <h2 className="text-text-primary font-display font-semibold text-base mb-3">
            Presupuesto vs Real
          </h2>
          <div className="flex flex-col gap-3">
            {Object.entries(settings.budgetAllocations).map(([key, pct]) => {
              const budget = (settings.monthlyIncome * pct) / 100;
              const spent = monthSummary.byCategory[key] ?? 0;
              const spentPct = Math.min(100, budget > 0 ? (spent / budget) * 100 : 0);
              const cat = CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG];
              if (!cat || budget === 0) return null;
              return (
                <div key={key} className="rounded-xl p-4" style={{ background: 'var(--bg-card)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span className="text-text-primary text-sm font-medium">{cat.label}</span>
                    </div>
                    <span className="text-text-secondary text-xs">
                      {formatCurrency(spent, settings.currency)} /{' '}
                      {formatCurrency(budget, settings.currency)}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${spentPct}%`,
                        background: spentPct >= 90 ? '#EF4444' : spentPct >= 70 ? '#F97316' : cat.color,
                      }}
                    />
                  </div>
                  <p
                    className="text-xs mt-1"
                    style={{ color: spentPct >= 90 ? '#EF4444' : '#475569' }}
                  >
                    {spentPct.toFixed(0)}% utilizado
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

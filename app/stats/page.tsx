'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/lib/context';
import { formatCurrency, CATEGORY_CONFIG, calcPercentage, getMonthName } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';
import { getLastNCycles } from '@/lib/db';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const COLORS = ['var(--accent-blue, #4F7CFF)', 'var(--accent-purple, #8B5CF6)', '#F97316', '#EC4899', '#10B981', '#06B6D4'];

export default function StatsPage() {
  const { transactions, monthSummary, settings, runOutDay, savingsGoals } = useFinance();
  const [tab, setTab] = useState<'ciclo' | 'ciclos' | 'semaforo' | 'insights'>('ciclo');
  const [cycleHistory, setCycleHistory] = useState<any[]>([]);
  const today = new Date();
  const monthName = getMonthName(today.getMonth());

  useEffect(() => {
    getLastNCycles(6).then(setCycleHistory);
  }, [transactions]);

  const categoryData = useMemo(() => {
    if (!monthSummary?.byCategory) return [];
    return Object.entries(monthSummary.byCategory)
      .map(([key, value]) => ({
        name: CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG]?.label ?? key,
        value, color: CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG]?.color ?? '#94A3B8',
        icon: CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG]?.icon ?? '📦', key,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [monthSummary]);

  const dailyData = useMemo(() => {
    const days: { day: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const daySpent = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(dateStr))
        .reduce((s, t) => s + t.amount, 0);
      days.push({ day: d.toLocaleDateString('es-MX', { weekday: 'short' }).slice(0, 2), amount: daySpent });
    }
    return days;
  }, [transactions]);

  // Day of week analysis
  const dayOfWeekData = useMemo(() => {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const totals = Array(7).fill(0);
    const counts = Array(7).fill(0);
    transactions.filter((t) => t.type === 'expense').forEach((t) => {
      const d = new Date(t.date).getDay();
      totals[d] += t.amount;
      counts[d]++;
    });
    const avgs = totals.map((t, i) => ({ day: dayNames[i], avg: counts[i] > 0 ? t / counts[i] : 0, total: t }));
    const maxAvg = Math.max(...avgs.map((a) => a.avg));
    return avgs.map((a) => ({ ...a, pct: maxAvg > 0 ? (a.avg / maxAvg) * 100 : 0 }));
  }, [transactions]);

  const peakDay = dayOfWeekData.reduce((a, b) => a.avg > b.avg ? a : b, dayOfWeekData[0] ?? { day: '-', avg: 0, pct: 0 });

  // Savings projection
  const savingsProjections = useMemo(() => {
    const monthlySavings = (monthSummary?.monthlyIncome ?? 0) - (monthSummary?.totalExpenses ?? 0);
    return savingsGoals.filter((g) => g.status === 'active').map((g) => {
      const remaining = g.targetAmount - g.currentAmount;
      const monthsNeeded = monthlySavings > 0 ? Math.ceil(remaining / monthlySavings) : null;
      return { ...g, remaining, monthsNeeded };
    });
  }, [savingsGoals, monthSummary]);

  // Anomaly detection
  const anomalies = useMemo(() => {
    if (cycleHistory.length < 2) return [];
    const current = cycleHistory[cycleHistory.length - 1];
    const prev = cycleHistory[cycleHistory.length - 2];
    if (!current || !prev) return [];
    return Object.keys(current.byCategory).filter((cat) => {
      const curAmt = current.byCategory[cat] ?? 0;
      const prevAmt = prev.byCategory[cat] ?? 0;
      return prevAmt > 0 && curAmt > prevAmt * 1.8; // 80%+ increase
    }).map((cat) => ({
      cat,
      current: current.byCategory[cat],
      prev: prev.byCategory[cat],
      icon: CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG]?.icon ?? '📦',
      label: CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG]?.label ?? cat,
    }));
  }, [cycleHistory]);

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
      <div className="px-5 pb-4 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <h1 className="text-text-primary font-display font-bold text-lg">Estadísticas</h1>
        {anomalies.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
            ⚠ {anomalies.length} alerta{anomalies.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tab navigation */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: 'ciclo', label: '📊 Ciclo' },
            { key: 'semaforo', label: '🚦 Presupuesto' },
            { key: 'ciclos', label: '📈 Historial' },
            { key: 'insights', label: '💡 Insights' },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: tab === t.key ? 'var(--chip-active-bg, rgba(79,124,255,0.9))' : 'var(--bg-elevated)',
                color: tab === t.key ? 'var(--chip-active-color, white)' : '#94A3B8',
                border: tab === t.key ? '1px solid var(--chip-active-border, transparent)' : '1px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: Ciclo actual ── */}
      {tab === 'ciclo' && (
        <>
          <div className="px-5 mb-5">
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)' }}>
              <p className="text-text-secondary text-xs font-semibold tracking-widest text-center mb-2">
                {monthSummary?.cycleStart
                  ? `CICLO ${new Date(monthSummary.cycleStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} → ${new Date(monthSummary.cycleEnd).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`
                  : 'CICLO ACTUAL'}
              </p>
              <div className="relative flex items-center justify-center" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData.length > 0 ? categoryData : [{ name: 'Sin datos', value: 1, color: '#1E2333' }]}
                      cx="50%" cy="50%" innerRadius={65} outerRadius={90} dataKey="value" strokeWidth={0}>
                      {(categoryData.length > 0 ? categoryData : [{ color: '#1E2333' }]).map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <p className="font-display font-bold" style={{ fontSize: '1.5rem', letterSpacing: '-0.02em', color: '#F1F5F9' }}>
                    {formatCurrency(totalSpent, settings?.currency)}
                  </p>
                  <p className="text-text-muted text-xs">Total gastado</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="text-green-400 text-xs font-semibold">↑ {savingsPct.toFixed(0)}%</span>
                <span className="text-text-muted text-xs">disponible del ingreso</span>
              </div>
            </div>
          </div>

          {categoryData.length > 0 && (
            <div className="px-5 mb-5">
              <div className="grid grid-cols-2 gap-3">
                {categoryData.slice(0, 4).map((cat) => (
                  <div key={cat.key} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                      <p className="text-text-secondary text-xs font-medium">{cat.name}</p>
                    </div>
                    <p className="font-display font-bold text-xl" style={{ color: '#F1F5F9', letterSpacing: '-0.02em' }}>
                      {calcPercentage(cat.value, totalSpent)}%
                    </p>
                    <p className="text-text-muted text-xs mt-0.5">{formatCurrency(cat.value, settings?.currency)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-5 mb-5">
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)' }}>
              <p className="text-text-primary font-display font-semibold text-sm mb-4">Últimos 7 días</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={dailyData} barSize={20}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,124,255,0.05)' }} />
                  <Bar dataKey="amount" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-blue, #4F7CFF)" />
                      <stop offset="100%" stopColor="var(--accent-purple, #8B5CF6)" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: Semáforo presupuesto ── */}
      {tab === 'semaforo' && settings && monthSummary && (
        <div className="px-5">
          <p className="text-text-muted text-xs mb-4">
            Estado de tu presupuesto en tiempo real. 🟢 Bien · 🟡 Precaución · 🔴 Excedido
          </p>
          <div className="flex flex-col gap-3">
            {Object.entries(settings.budgetAllocations).map(([key, pct]) => {
              const budget = (settings.monthlyIncome * pct) / 100;
              const spent = monthSummary.byCategory[key] ?? 0;
              const remaining = budget - spent;
              const spentPct = budget > 0 ? (spent / budget) * 100 : 0;
              const cat = CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG];
              if (!cat || budget === 0) return null;
              const color = spentPct >= 100 ? '#EF4444' : spentPct >= 80 ? '#F97316' : '#10B981';
              const emoji = spentPct >= 100 ? '🔴' : spentPct >= 80 ? '🟡' : '🟢';
              return (
                <div key={key} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: spentPct >= 100 ? '1px solid rgba(239,68,68,0.3)' : spentPct >= 80 ? '1px solid rgba(249,115,22,0.3)' : 'none' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon}</span>
                      <div>
                        <p className="text-text-primary text-sm font-semibold">{emoji} {cat.label}</p>
                        <p className="text-text-muted text-xs">
                          {remaining >= 0
                            ? `Quedan ${formatCurrency(remaining, settings.currency)}`
                            : `Excedido por ${formatCurrency(Math.abs(remaining), settings.currency)}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-sm" style={{ color }}>
                        {spentPct.toFixed(0)}%
                      </p>
                      <p className="text-text-muted text-xs">
                        {formatCurrency(spent, settings.currency)} / {formatCurrency(budget, settings.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, spentPct)}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: Historial de ciclos ── */}
      {tab === 'ciclos' && (
        <div className="px-5">
          <p className="text-text-muted text-xs mb-4">Comparativa de los últimos 6 ciclos de pago.</p>
          {cycleHistory.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-2">📊</p>
              <p className="text-text-muted text-sm">Sin historial suficiente aún</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--bg-card)' }}>
                <p className="text-text-primary font-display font-semibold text-sm mb-4">Gasto por ciclo</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={cycleHistory} barSize={24}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,124,255,0.05)' }} />
                    <Bar dataKey="totalExpenses" fill="url(#cycleGrad)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="cycleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-pink, #EC4899)" />
                        <stop offset="100%" stopColor="var(--accent-purple, #8B5CF6)" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2">
                {cycleHistory.slice().reverse().map((cycle, i) => {
                  const isLatest = i === 0;
                  return (
                    <div key={cycle.cycleKey} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: isLatest ? 'rgba(79,124,255,0.08)' : 'var(--bg-card)', border: isLatest ? '1px solid rgba(79,124,255,0.2)' : 'none' }}>
                      <div>
                        <p className="text-text-primary text-sm font-semibold font-display">
                          {cycle.label} {isLatest && <span className="text-xs text-accent-blue ml-1">← actual</span>}
                        </p>
                        <p className="text-text-muted text-xs">
                          Ingresos: {formatCurrency(cycle.totalIncome, settings?.currency)}
                        </p>
                      </div>
                      <p className="font-display font-bold text-sm" style={{ color: '#EF4444' }}>
                        -{formatCurrency(cycle.totalExpenses, settings?.currency)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: Insights ── */}
      {tab === 'insights' && (
        <div className="px-5 flex flex-col gap-4">
          {/* Anomalias */}
          {anomalies.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs font-bold mb-3" style={{ color: '#EF4444' }}>⚠ PATRONES INUSUALES</p>
              {anomalies.map((a) => (
                <div key={a.cat} className="flex items-center justify-between py-2">
                  <p className="text-text-primary text-sm">{a.icon} {a.label}</p>
                  <div className="text-right">
                    <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>
                      +{(((a.current - a.prev) / a.prev) * 100).toFixed(0)}% vs ciclo anterior
                    </p>
                    <p className="text-text-muted text-xs">
                      {formatCurrency(a.prev, settings?.currency)} → {formatCurrency(a.current, settings?.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Día de la semana con más gasto */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)' }}>
            <p className="text-text-primary font-semibold text-sm mb-1">📅 Día con más gasto</p>
            {peakDay?.avg > 0 ? (
              <>
                <p className="text-text-muted text-xs mb-3">
                  Los <span className="text-text-primary font-semibold">{peakDay.day}</span> gastas en promedio{' '}
                  <span className="font-semibold" style={{ color: '#EF4444' }}>
                    {formatCurrency(peakDay.avg, settings?.currency)}
                  </span>
                </p>
                <div className="flex flex-col gap-1.5">
                  {dayOfWeekData.map((d) => (
                    <div key={d.day} className="flex items-center gap-2">
                      <p className="text-text-muted text-xs w-8">{d.day}</p>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${d.pct}%`, background: d.pct === 100 ? '#EF4444' : d.pct > 70 ? "#F97316" : "var(--accent-blue, #4F7CFF)" }} />
                      </div>
                      <p className="text-text-muted text-xs w-16 text-right">
                        {formatCurrency(d.avg, settings?.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-text-muted text-xs">Sin suficientes datos aún</p>
            )}
          </div>

          {/* Proyección de metas */}
          {savingsProjections.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)' }}>
              <p className="text-text-primary font-semibold text-sm mb-3">🎯 Proyección de metas</p>
              {savingsProjections.map((g) => (
                <div key={g.id} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-text-primary text-sm font-medium">{g.title}</p>
                    {g.monthsNeeded !== null ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                        ~{g.monthsNeeded} {g.monthsNeeded === 1 ? 'ciclo' : 'ciclos'}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
                        Sin ahorro activo
                      </span>
                    )}
                  </div>
                  <p className="text-text-muted text-xs">
                    Faltan {formatCurrency(g.remaining, settings?.currency)} · {g.monthsNeeded !== null
                      ? `a tu ritmo actual ahorras ${formatCurrency((monthSummary?.monthlyIncome ?? 0) - (monthSummary?.totalExpenses ?? 0), settings?.currency)}/ciclo`
                      : 'gasta menos para activar la proyección'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
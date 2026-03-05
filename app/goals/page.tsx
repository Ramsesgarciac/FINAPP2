'use client';

import { useState } from 'react';
import { useFinance } from '@/lib/context';
import { formatCurrency, calcPercentage, calcMonthlyTarget } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';
import GoalModal from '@/components/GoalModal';
import { SavingsGoal } from '@/lib/db';

const GOAL_COLORS = ['#4F7CFF', '#8B5CF6', '#10B981', '#F97316', '#EC4899', '#06B6D4'];

export default function GoalsPage() {
  const { savingsGoals, updateGoal, settings } = useFinance();
  const [showAdd, setShowAdd] = useState(false);
  const [addingTo, setAddingTo] = useState<SavingsGoal | null>(null);
  const [addAmount, setAddAmount] = useState('');

  const activeGoals = savingsGoals.filter((g) => g.status === 'active');
  const completedGoals = savingsGoals.filter((g) => g.status !== 'active');

  const totalMonthlySavingsNeeded = activeGoals.reduce((sum, goal) => {
    return sum + calcMonthlyTarget(goal.targetAmount, goal.currentAmount, goal.deadline);
  }, 0);

  const handleAddAmount = async () => {
    if (!addingTo || !addAmount) return;
    const num = parseFloat(addAmount);
    const newAmount = addingTo.currentAmount + num;
    const isComplete = newAmount >= addingTo.targetAmount;
    await updateGoal({
      ...addingTo,
      currentAmount: Math.min(newAmount, addingTo.targetAmount),
      status: isComplete ? 'completed' : 'active',
    });
    setAddingTo(null);
    setAddAmount('');
  };

  return (
    <div className="h-screen overflow-y-auto pb-28">
      {/* Header */}
      <div
        className="px-5 pb-4 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <h1 className="text-text-primary font-display font-bold text-lg">Metas de Ahorro</h1>
        <button className="w-8 h-8 rounded-full glass flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="1" fill="#94A3B8" />
            <circle cx="19" cy="12" r="1" fill="#94A3B8" />
            <circle cx="5" cy="12" r="1" fill="#94A3B8" />
          </svg>
        </button>
      </div>

      {/* Monthly Target Card */}
      {activeGoals.length > 0 && (
        <div className="px-5 mb-5">
          <div
            className="rounded-2xl p-5"
            style={{ background: 'linear-gradient(135deg, rgba(79,124,255,0.12), rgba(139,92,246,0.12))', border: '1px solid rgba(79,124,255,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-accent-blue flex items-center justify-center" style={{ background: 'rgba(79,124,255,0.2)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="#4F7CFF" strokeWidth="1.75" />
                  <path d="M8 12h2l2-6 2 12 2-6h2" stroke="#4F7CFF" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-text-primary font-display font-semibold">Meta Mensual</p>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">
              Con tus metas activas, debes ahorrar{' '}
              <span className="text-accent-blue font-bold">
                {formatCurrency(totalMonthlySavingsNeeded, settings?.currency)}/mes
              </span>{' '}
              para llegar a tiempo.
            </p>
            <div className="flex items-center gap-2 mt-3">
              {activeGoals.slice(0, 3).map((g, i) => (
                <div
                  key={g.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: GOAL_COLORS[i % GOAL_COLORS.length] }}
                >
                  {g.title.slice(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Goals */}
      <section className="px-5 mb-5">
        {activeGoals.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}
          >
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-text-primary font-display font-semibold mb-1">Sin metas activas</p>
            <p className="text-text-muted text-sm mb-4">Crea tu primera meta de ahorro</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary" style={{ padding: '10px 24px', width: 'auto' }}>
              + Nueva Meta
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {activeGoals.map((goal, idx) => {
              const pct = calcPercentage(goal.currentAmount, goal.targetAmount);
              const monthly = calcMonthlyTarget(goal.targetAmount, goal.currentAmount, goal.deadline);
              const color = goal.color ?? GOAL_COLORS[idx % GOAL_COLORS.length];
              const deadline = new Date(goal.deadline).toLocaleDateString('es-MX', {
                month: 'short',
                year: 'numeric',
              });
              return (
                <div
                  key={goal.id}
                  className="rounded-2xl p-5"
                  style={{ background: 'var(--bg-card)' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-text-primary font-display font-bold text-base">
                        {goal.title}
                      </p>
                      {goal.note && (
                        <p className="text-text-muted text-xs uppercase tracking-wider mt-0.5">
                          {goal.note}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold" style={{ color, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
                        {formatCurrency(goal.currentAmount, settings?.currency)}
                      </p>
                      <p className="text-text-muted text-xs">
                        de {formatCurrency(goal.targetAmount, settings?.currency)}
                      </p>
                    </div>
                  </div>

                  <div className="progress-bar mb-2">
                    <div
                      className="progress-fill"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-text-muted text-xs">{pct}% Completado</p>
                    <div className="flex items-center gap-1 text-text-muted text-xs">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.75" />
                        <path d="M8 2V6M16 2V6M3 10H21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                      </svg>
                      <span>Vence {deadline}</span>
                    </div>
                  </div>

                  <div
                    className="mt-3 pt-3 flex items-center justify-between"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
                    <p className="text-text-secondary text-xs">
                      Ahorrar:{' '}
                      <span className="font-semibold" style={{ color }}>
                        {formatCurrency(monthly, settings?.currency)}/mes
                      </span>
                    </p>
                    <button
                      onClick={() => setAddingTo(goal)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={{ background: `${color}20`, color }}
                    >
                      + Abonar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Completed */}
      {completedGoals.length > 0 && (
        <section className="px-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-text-primary font-display font-semibold text-sm">Completadas</h2>
            <span className="text-text-muted text-xs">{completedGoals.length} meta(s)</span>
          </div>
          <div className="flex flex-col gap-2">
            {completedGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: 'var(--bg-card)', opacity: 0.6 }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(16,185,129,0.15)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-text-secondary text-sm font-medium line-through">{goal.title}</p>
                  <p className="text-text-muted text-xs">
                    {formatCurrency(goal.targetAmount, settings?.currency)} ahorrado
                  </p>
                </div>
                <span className="badge badge-paid">✓ Completada</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAB */}
      <button className="fab" onClick={() => setShowAdd(true)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      <BottomNav />
      {showAdd && <GoalModal onClose={() => setShowAdd(false)} />}

      {/* Add amount modal */}
      {addingTo && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAddingTo(null)}>
          <div className="modal-sheet">
            <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />
            <h2 className="text-text-primary font-display font-bold text-lg mb-2">
              Abonar a "{addingTo.title}"
            </h2>
            <p className="text-text-muted text-sm mb-5">
              Progreso actual: {formatCurrency(addingTo.currentAmount, settings?.currency)} /{' '}
              {formatCurrency(addingTo.targetAmount, settings?.currency)}
            </p>
            <input
              className="input-field mb-5"
              type="number"
              placeholder="Monto a abonar"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              inputMode="decimal"
              autoFocus
            />
            <button
              className="btn-primary"
              onClick={handleAddAmount}
              disabled={!addAmount}
              style={{ opacity: !addAmount ? 0.5 : 1 }}
            >
              💰 Abonar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

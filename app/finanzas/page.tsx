'use client';

import React, { useState } from 'react';
import { useFinance } from '@/lib/context';
import { formatCurrency, calcPercentage, calcMonthlyTarget, CATEGORY_CONFIG } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';
import GoalModal from '@/components/GoalModal';
import DebtModal from '@/components/DebtModal';
import { SavingsGoal, Debt } from '@/lib/db';

const GOAL_COLORS_BLUE = ['#4F7CFF', '#8B5CF6', '#10B981', '#F97316', '#EC4899', '#06B6D4'];
const GOAL_COLORS_ROSE = ['#EC4899', '#F472B6', '#F9A8D4', '#FB7185', '#C084FC', '#F43F5E'];

export default function FinanzasPage() {
    const { savingsGoals, updateGoal, settings, debts, editDebt, removeDebt, removeGoal, theme } = useFinance();
    const isRose = theme === 'rose';
    const GOAL_COLORS = isRose ? GOAL_COLORS_ROSE : GOAL_COLORS_BLUE;
    const accent = isRose ? '#EC4899' : '#4F7CFF';
    const accentSoft = isRose ? 'rgba(236,72,153,0.15)' : 'rgba(79,124,255,0.15)';
    const accentSofter = isRose ? 'rgba(236,72,153,0.12)' : 'rgba(79,124,255,0.12)';
    const accentBorder = isRose ? 'rgba(236,72,153,0.2)' : 'rgba(79,124,255,0.2)';
    const gradientCard = isRose
        ? 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(244,114,182,0.08))'
        : 'linear-gradient(135deg, rgba(79,124,255,0.12), rgba(139,92,246,0.12))';
    const [section, setSection] = useState<'metas' | 'deudas'>('metas');

    // ── Metas state ──────────────────────────────────────────────
    const [showAddGoal, setShowAddGoal] = useState(false);
    const [addingTo, setAddingTo] = useState<SavingsGoal | null>(null);
    const [addAmount, setAddAmount] = useState('');
    // Delete goal flow
    const [deletingGoal, setDeletingGoal] = useState<SavingsGoal | null>(null);
    const [deleteStep, setDeleteStep] = useState<'reason' | 'refund'>('reason');
    const [deleteReason, setDeleteReason] = useState('');
    const [deleteRefund, setDeleteRefund] = useState('');

    const handleDeleteGoal = async () => {
        if (!deletingGoal?.id) return;
        const refundAmount = parseFloat(deleteRefund) || 0;
        await removeGoal(deletingGoal.id, refundAmount, deleteReason.trim() || undefined);
        setDeletingGoal(null);
        setDeleteStep('reason');
        setDeleteReason('');
        setDeleteRefund('');
    };

    const openDeleteGoal = (goal: SavingsGoal) => {
        setDeletingGoal(goal);
        setDeleteStep('reason');
        setDeleteReason('');
        setDeleteRefund(goal.currentAmount > 0 ? String(goal.currentAmount) : '');
    };

    const activeGoals = savingsGoals.filter((g) => g.status === 'active');
    const completedGoals = savingsGoals.filter((g) => g.status === 'completed');
    const cancelledGoals = savingsGoals.filter((g) => g.status === 'cancelled');
    const historyGoals = [...completedGoals, ...cancelledGoals];
    const totalMonthlySavingsNeeded = activeGoals.reduce(
        (sum, goal) => sum + calcMonthlyTarget(goal.targetAmount, goal.currentAmount, goal.deadline), 0
    );

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

    // ── Deudas state ─────────────────────────────────────────────
    const [showAddDebt, setShowAddDebt] = useState(false);
    const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
    const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [debtTab, setDebtTab] = useState<'active' | 'settled'>('active');
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    const activeDebts = debts.filter((d: Debt) => d.status === 'active');
    const settledDebts = debts.filter((d: Debt) => d.status === 'settled');
    const totalIOwe = activeDebts.filter((d) => d.direction === 'owe').reduce((s, d) => s + (d.amount - d.paidAmount), 0);
    const totalOwedToMe = activeDebts.filter((d) => d.direction === 'owed').reduce((s, d) => s + (d.amount - d.paidAmount), 0);
    const shownDebts = debtTab === 'active' ? activeDebts : settledDebts;

    const handlePartialPay = async () => {
        if (!payingDebt) return;
        const amt = parseFloat(payAmount) || 0;
        const newPaid = Math.min(payingDebt.paidAmount + amt, payingDebt.amount);
        const isSettled = newPaid >= payingDebt.amount;
        await editDebt({ ...payingDebt, paidAmount: newPaid, status: isSettled ? 'settled' : 'active' });
        setPayingDebt(null);
        setPayAmount('');
    };

    return (
        <div className="h-screen overflow-y-auto pb-28">

            {/* Header */}
            <div
                className="px-5 pb-4 flex items-center justify-between"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
            >
                <h1 className="text-text-primary font-display font-bold text-lg">💰 Finanzas</h1>
                <button
                    onClick={() => section === 'metas' ? setShowAddGoal(true) : setShowAddDebt(true)}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: accentSoft, color: accent }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                </button>
            </div>

            {/* Section tabs */}
            <div className="px-5 mb-5">
                <div className="tab-pill">
                    <button
                        className={`tab-pill-item ${section === 'metas' ? 'active' : ''}`}
                        onClick={() => setSection('metas')}
                    >
                        🎯 Metas de Ahorro
                    </button>
                    <button
                        className={`tab-pill-item ${section === 'deudas' ? 'active' : ''}`}
                        onClick={() => setSection('deudas')}
                    >
                        💳 Deudas
                    </button>
                </div>
            </div>

            {/* ══════════════ METAS ══════════════ */}
            {section === 'metas' && (
                <>
                    {/* Monthly target card */}
                    {activeGoals.length > 0 && (
                        <div className="px-5 mb-5">
                            <div
                                className="rounded-2xl p-5"
                                style={{ background: gradientCard, border: `1px solid ${accentBorder}` }}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: accentSofter }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <rect x="3" y="3" width="18" height="18" rx="3" stroke={accent} strokeWidth="1.75" />
                                            <path d="M8 12h2l2-6 2 12 2-6h2" stroke={accent} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <p className="text-text-primary font-display font-semibold">Meta Mensual</p>
                                </div>
                                <p className="text-text-secondary text-sm leading-relaxed">
                                    Con tus metas activas, debes ahorrar{' '}
                                    <span style={{ color: accent, fontWeight: 700 }}>
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

                    {/* Active goals */}
                    <section className="px-5 mb-5">
                        {activeGoals.length === 0 ? (
                            <div
                                className="rounded-2xl p-10 text-center"
                                style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}
                            >
                                <p className="text-4xl mb-3">🎯</p>
                                <p className="text-text-primary font-display font-semibold mb-1">Sin metas activas</p>
                                <p className="text-text-muted text-sm mb-4">Crea tu primera meta de ahorro</p>
                                <button onClick={() => setShowAddGoal(true)} className="btn-primary" style={{ padding: '10px 24px', width: 'auto' }}>
                                    + Nueva Meta
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {activeGoals.map((goal, idx) => {
                                    const pct = calcPercentage(goal.currentAmount, goal.targetAmount);
                                    const monthly = calcMonthlyTarget(goal.targetAmount, goal.currentAmount, goal.deadline);
                                    const color = goal.color ?? GOAL_COLORS[idx % GOAL_COLORS.length];
                                    const deadline = new Date(goal.deadline).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
                                    return (
                                        <div key={goal.id} className="rounded-2xl p-5" style={{ background: 'var(--bg-card)' }}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="text-text-primary font-display font-bold text-base">{goal.title}</p>
                                                    {goal.note && <p className="text-text-muted text-xs uppercase tracking-wider mt-0.5">{goal.note}</p>}
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-display font-bold" style={{ color, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
                                                        {formatCurrency(goal.currentAmount, settings?.currency)}
                                                    </p>
                                                    <p className="text-text-muted text-xs">de {formatCurrency(goal.targetAmount, settings?.currency)}</p>
                                                </div>
                                            </div>
                                            <div className="progress-bar mb-2">
                                                <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
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
                                            <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                                <p className="text-text-secondary text-xs">
                                                    Ahorrar: <span className="font-semibold" style={{ color }}>{formatCurrency(monthly, settings?.currency)}/mes</span>
                                                </p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setAddingTo(goal)}
                                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                                                        style={{ background: `${color}20`, color }}
                                                    >
                                                        + Abonar
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteGoal(goal)}
                                                        className="px-2 py-1.5 rounded-xl text-xs font-semibold transition-all"
                                                        style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                                                    >
                                                        🗑
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Goals history (completed + cancelled) */}
                    {historyGoals.length > 0 && (
                        <section className="px-5 mb-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-text-primary font-display font-semibold text-sm">Historial</h2>
                                <span className="text-text-muted text-xs">{historyGoals.length} meta(s)</span>
                            </div>
                            <div className="flex flex-col gap-2">
                                {historyGoals.map((goal) => {
                                    const isCancelled = goal.status === 'cancelled';
                                    return (
                                        <div key={goal.id} className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'var(--bg-card)', opacity: isCancelled ? 0.55 : 0.7 }}>
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ background: isCancelled ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.15)' }}>
                                                {isCancelled ? (
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                        <path d="M18 6L6 18M6 6l12 12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                                                    </svg>
                                                ) : (
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                        <path d="M20 6L9 17L4 12" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-text-secondary text-sm font-medium line-through truncate">{goal.title}</p>
                                                <p className="text-text-muted text-xs">
                                                    {isCancelled
                                                        ? `${formatCurrency(goal.currentAmount, settings?.currency)} acumulado`
                                                        : `${formatCurrency(goal.targetAmount, settings?.currency)} completado`}
                                                </p>
                                                {isCancelled && goal.cancelReason && (
                                                    <p className="text-text-muted text-xs mt-0.5 truncate">📝 {goal.cancelReason}</p>
                                                )}
                                                {isCancelled && goal.refundAmount != null && goal.refundAmount > 0 && (
                                                    <p className="text-xs mt-0.5" style={{ color: '#10B981' }}>
                                                        ↩ Devuelto: {formatCurrency(goal.refundAmount, settings?.currency)}
                                                    </p>
                                                )}
                                                {isCancelled && goal.cancelledCycleKey && (
                                                    <p className="text-text-muted text-xs mt-0.5">
                                                        📅 Ciclo: {new Date(goal.cancelledCycleKey + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                )}
                                                {!isCancelled && goal.completedCycleKey && (
                                                    <p className="text-text-muted text-xs mt-0.5">
                                                        📅 Ciclo: {new Date(goal.completedCycleKey + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                )}
                                            </div>
                                            <span
                                                className="badge flex-shrink-0"
                                                style={isCancelled
                                                    ? { background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }
                                                    : { background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
                                            >
                                                {isCancelled ? '✕ Cancelada' : '✓ Completada'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </>
            )}

            {/* ══════════════ DEUDAS ══════════════ */}
            {section === 'deudas' && (
                <>
                    {/* Summary cards */}
                    <div className="px-5 mb-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <p className="text-xs font-semibold mb-1" style={{ color: '#EF4444' }}>😬 YO DEBO</p>
                            <p className="font-display font-bold text-lg" style={{ color: '#EF4444' }}>
                                {formatCurrency(totalIOwe, settings?.currency)}
                            </p>
                        </div>
                        <div className="rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <p className="text-xs font-semibold mb-1" style={{ color: '#10B981' }}>💰 ME DEBEN</p>
                            <p className="font-display font-bold text-lg" style={{ color: '#10B981' }}>
                                {formatCurrency(totalOwedToMe, settings?.currency)}
                            </p>
                        </div>
                    </div>

                    {/* Deudas sub-tabs */}
                    <div className="px-5 mb-4">
                        <div className="tab-pill">
                            <button className={`tab-pill-item ${debtTab === 'active' ? 'active' : ''}`} onClick={() => setDebtTab('active')}>
                                Activas ({activeDebts.length})
                            </button>
                            <button className={`tab-pill-item ${debtTab === 'settled' ? 'active' : ''}`} onClick={() => setDebtTab('settled')}>
                                Saldadas ({settledDebts.length})
                            </button>
                        </div>
                    </div>

                    {/* Debt list */}
                    <div className="px-5 flex flex-col gap-3">
                        {shownDebts.length === 0 ? (
                            <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}>
                                <p className="text-3xl mb-2">🤝</p>
                                <p className="text-text-muted text-sm">{debtTab === 'active' ? 'Sin deudas activas' : 'Sin deudas saldadas'}</p>
                            </div>
                        ) : (
                            shownDebts.map((debt: Debt) => {
                                const remaining = debt.amount - debt.paidAmount;
                                const pct = (debt.paidAmount / debt.amount) * 100;
                                const isOwe = debt.direction === 'owe';
                                const color = isOwe ? '#EF4444' : '#10B981';
                                const overdue = debt.dueDate && new Date(debt.dueDate) < new Date() && debt.status === 'active';
                                return (
                                    <div key={debt.id} className="rounded-2xl p-4"
                                        style={{ background: 'var(--bg-card)', border: overdue ? '1px solid rgba(239,68,68,0.3)' : 'none' }}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                        style={{ background: isOwe ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color }}>
                                                        {isOwe ? '😬 Debo' : '💰 Me deben'}
                                                    </span>
                                                    {overdue && (
                                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                            style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>⚠ Vencida</span>
                                                    )}
                                                </div>
                                                <p className="text-text-primary font-semibold text-sm font-display">{debt.title}</p>
                                                <p className="text-text-muted text-xs">👤 {debt.personName}</p>
                                                {debt.dueDate && (
                                                    <p className="text-text-muted text-xs mt-0.5">
                                                        📅 {new Date(debt.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                )}
                                                {debt.settledCycleKey && (
                                                    <p className="text-text-muted text-xs mt-0.5">
                                                        ✅ Saldada en ciclo: {new Date(debt.settledCycleKey + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                )}
                                                {debt.note && <p className="text-text-muted text-xs mt-0.5 italic">"{debt.note}"</p>}
                                            </div>
                                            <div className="text-right ml-3">
                                                <p className="font-display font-bold text-base" style={{ color }}>{formatCurrency(remaining, settings?.currency)}</p>
                                                <p className="text-text-muted text-xs">de {formatCurrency(debt.amount, settings?.currency)}</p>
                                            </div>
                                        </div>
                                        <div className="h-1.5 rounded-full mb-3" style={{ background: 'var(--bg-elevated)' }}>
                                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                                        </div>
                                        {debt.status === 'active' && (
                                            <div className="flex gap-2">
                                                <button onClick={() => { setPayingDebt(debt); setPayAmount(''); }}
                                                    className="flex-1 py-2 rounded-xl text-xs font-semibold"
                                                    style={{ background: isOwe ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color }}>
                                                    {isOwe ? '💸 Registrar pago' : '✓ Recibir pago'}
                                                </button>
                                                <button onClick={() => setEditingDebt(debt)}
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                                                    style={{ background: 'var(--bg-elevated)' }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#94A3B8" strokeWidth="1.75" strokeLinecap="round" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#94A3B8" strokeWidth="1.75" strokeLinecap="round" />
                                                    </svg>
                                                </button>
                                                <button onClick={() => debt.id && setConfirmDelete(debt.id)}
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                                                    style={{ background: 'var(--bg-elevated)' }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#EF4444" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}

            {/* FAB */}
            <button className="fab" onClick={() => section === 'metas' ? setShowAddGoal(true) : setShowAddDebt(true)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
            </button>

            <BottomNav />

            {/* ── Modals Metas ── */}
            {showAddGoal && <GoalModal onClose={() => setShowAddGoal(false)} />}
            {addingTo && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAddingTo(null)}>
                    <div className="modal-sheet">
                        <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />
                        <h2 className="text-text-primary font-display font-bold text-lg mb-2">Abonar a "{addingTo.title}"</h2>
                        <p className="text-text-muted text-sm mb-5">
                            Progreso: {formatCurrency(addingTo.currentAmount, settings?.currency)} / {formatCurrency(addingTo.targetAmount, settings?.currency)}
                        </p>
                        <input className="input-field mb-5" type="number" placeholder="Monto a abonar"
                            value={addAmount} onChange={(e) => setAddAmount(e.target.value)} inputMode="decimal" autoFocus />
                        <button className="btn-primary" onClick={handleAddAmount} disabled={!addAmount} style={{ opacity: !addAmount ? 0.5 : 1 }}>
                            💰 Abonar
                        </button>
                    </div>
                </div>
            )}

            {/* ── Delete goal modal (3 pasos) ── */}
            {/* ── Delete goal modal (2 pasos) ── */}
            {deletingGoal && (
                <div className="modal-overlay" style={{ zIndex: 100 }} onClick={() => { setDeletingGoal(null); setDeleteStep('reason'); }}>
                    <div className="modal-sheet" style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />

                        {/* Paso 1: Motivo de cancelación */}
                        {deleteStep === 'reason' && (
                            <>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                                        style={{ background: 'rgba(239,68,68,0.1)' }}>🗑️</div>
                                    <div>
                                        <p className="text-text-primary font-display font-bold">Cancelar meta</p>
                                        <p className="text-text-muted text-xs">{deletingGoal.title}</p>
                                    </div>
                                </div>
                                {deletingGoal.currentAmount > 0 && (
                                    <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
                                        <p className="text-xs font-semibold" style={{ color: '#F97316' }}>
                                            💰 Tienes {formatCurrency(deletingGoal.currentAmount, settings?.currency)} acumulados
                                        </p>
                                        <p className="text-text-muted text-xs mt-0.5">En el siguiente paso podrás indicar cuánto regresa a tu saldo.</p>
                                    </div>
                                )}
                                <p className="text-text-muted text-xs font-semibold tracking-widest mb-2">MOTIVO (opcional)</p>
                                <input
                                    className="input-field mb-6"
                                    placeholder="Ej: Ya no necesito esta meta"
                                    value={deleteReason}
                                    onChange={(e) => setDeleteReason(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex gap-3">
                                    <button className="btn-secondary flex-1" onClick={() => { setDeletingGoal(null); setDeleteStep('reason'); }}>
                                        Cancelar
                                    </button>
                                    <button
                                        className="flex-1 py-3.5 rounded-xl font-semibold text-white"
                                        style={{ background: '#EF4444' }}
                                        onClick={() => {
                                            if (deletingGoal.currentAmount > 0) setDeleteStep('refund');
                                            else handleDeleteGoal();
                                        }}
                                    >
                                        Continuar
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Paso 2: ¿Cuánto se devuelve? */}
                        {deleteStep === 'refund' && (
                            <>
                                <p className="text-text-primary font-display font-bold text-lg mb-1">¿Cuánto se devuelve?</p>
                                <p className="text-text-secondary text-sm mb-5">
                                    Tenías <span className="text-text-primary font-bold">{formatCurrency(deletingGoal.currentAmount, settings?.currency)}</span> ahorrados.
                                    Ingresa el monto que regresa a tu saldo (puede ser 0).
                                </p>
                                <p className="text-text-muted text-xs font-semibold tracking-widest mb-2">MONTO A DEVOLVER</p>
                                <div className="relative mb-2">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-semibold">$</span>
                                    <input
                                        className="input-field pl-8"
                                        type="number"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={deleteRefund}
                                        onChange={(e) => setDeleteRefund(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-2 mb-5">
                                    <button
                                        className="text-xs px-3 py-1.5 rounded-lg"
                                        style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
                                        onClick={() => setDeleteRefund(String(deletingGoal.currentAmount))}
                                    >
                                        Todo ({formatCurrency(deletingGoal.currentAmount, settings?.currency)})
                                    </button>
                                    <button
                                        className="text-xs px-3 py-1.5 rounded-lg"
                                        style={{ background: 'rgba(148,163,184,0.08)', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.15)' }}
                                        onClick={() => setDeleteRefund('0')}
                                    >
                                        Nada ($0)
                                    </button>
                                </div>
                                {parseFloat(deleteRefund) > 0 && (
                                    <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                        <p className="text-xs font-semibold" style={{ color: '#10B981' }}>
                                            ✅ Se agregarán {formatCurrency(parseFloat(deleteRefund), settings?.currency)} a tu saldo disponible
                                        </p>
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <button className="btn-secondary flex-1" onClick={() => setDeleteStep('reason')}>← Volver</button>
                                    <button className="btn-primary flex-1" onClick={handleDeleteGoal}>
                                        Confirmar cancelación
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Modals Deudas ── */}
            {showAddDebt && <DebtModal onClose={() => setShowAddDebt(false)} />}
            {editingDebt && <DebtModal onClose={() => setEditingDebt(null)} editing={editingDebt} />}

            {payingDebt && (
                <div className="modal-overlay" style={{ zIndex: 100 }} onClick={() => setPayingDebt(null)}>
                    <div className="modal-sheet" style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />
                        <h2 className="text-text-primary font-display font-bold text-lg mb-1">
                            {payingDebt.direction === 'owe' ? '💸 Registrar pago' : '✓ Recibir pago'}
                        </h2>
                        <p className="text-text-secondary text-sm mb-5">
                            {payingDebt.direction === 'owe' ? 'Pagando a' : 'Recibiendo de'}{' '}
                            <span className="text-text-primary font-semibold">{payingDebt.personName}</span>
                        </p>
                        <div className="flex items-center justify-between p-3 rounded-xl mb-3" style={{ background: 'var(--bg-elevated)' }}>
                            <p className="text-text-muted text-xs font-semibold tracking-widest">PENDIENTE</p>
                            <p className="text-text-primary font-display font-bold text-sm">
                                {formatCurrency(payingDebt.amount - payingDebt.paidAmount, settings?.currency)}
                            </p>
                        </div>
                        <p className="text-text-muted text-xs font-semibold tracking-widest mb-2">MONTO A ABONAR</p>
                        <input className="input-field mb-5" type="number" inputMode="decimal" placeholder="0.00"
                            value={payAmount} onChange={(e) => setPayAmount(e.target.value)} autoFocus />
                        <div className="flex gap-3">
                            <button className="btn-secondary flex-1" onClick={() => setPayingDebt(null)}>Cancelar</button>
                            <button className="btn-primary flex-1" onClick={handlePartialPay}
                                disabled={!payAmount || parseFloat(payAmount) <= 0} style={{ opacity: !payAmount ? 0.5 : 1 }}>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDelete && (
                <div className="modal-overlay" style={{ zIndex: 100 }} onClick={() => setConfirmDelete(null)}>
                    <div className="modal-sheet" style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />
                        <p className="text-text-primary font-display font-bold text-lg mb-2">¿Eliminar deuda?</p>
                        <p className="text-text-secondary text-sm mb-6">Esta acción no se puede deshacer.</p>
                        <div className="flex gap-3">
                            <button className="btn-secondary flex-1" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                            <button className="flex-1 py-3.5 rounded-xl font-semibold text-white" style={{ background: '#EF4444' }}
                                onClick={async () => { await removeDebt(confirmDelete); setConfirmDelete(null); }}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
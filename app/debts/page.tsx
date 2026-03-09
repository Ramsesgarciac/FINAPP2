'use client';
import React from 'react';

import { useState } from 'react';
import { useFinance } from '@/lib/context';
import { formatCurrency } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';
import DebtModal from '@/components/DebtModal';
import { Debt } from '@/lib/db';

export default function DebtsPage() {
    const { debts, editDebt, removeDebt, settings } = useFinance();
    const [showAdd, setShowAdd] = useState(false);
    const [editing, setEditing] = useState<Debt | null>(null);
    const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [tab, setTab] = useState<'active' | 'settled'>('active');
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    const activeDebts = debts.filter((d: Debt) => d.status === 'active');
    const settledDebts = debts.filter((d: Debt) => d.status === 'settled');

    const totalIOwe = activeDebts.filter((d: Debt) => d.direction === 'owe').reduce((s: number, d: Debt) => s + (d.amount - d.paidAmount), 0);
    const totalOwedToMe = activeDebts.filter((d: Debt) => d.direction === 'owed').reduce((s: number, d: Debt) => s + (d.amount - d.paidAmount), 0);

    const handlePartialPay = async () => {
        if (!payingDebt) return;
        const amt = parseFloat(payAmount) || 0;
        const newPaid = Math.min(payingDebt.paidAmount + amt, payingDebt.amount);
        const isSettled = newPaid >= payingDebt.amount;
        await editDebt({ ...payingDebt, paidAmount: newPaid, status: isSettled ? 'settled' : 'active' });
        setPayingDebt(null);
        setPayAmount('');
    };

    const shownDebts = tab === 'active' ? activeDebts : settledDebts;

    return (
        <div className="h-screen overflow-y-auto pb-28">
            <div
                className="px-5 pb-4 flex items-center justify-between"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
            >
                <h1 className="text-text-primary font-display font-bold text-lg">💳 Deudas</h1>
                <button
                    onClick={() => setShowAdd(true)}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(79,124,255,0.15)', color: '#4F7CFF' }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                </button>
            </div>

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

            {/* Tabs */}
            <div className="px-5 mb-4">
                <div className="tab-pill">
                    <button className={`tab-pill-item ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
                        Activas ({activeDebts.length})
                    </button>
                    <button className={`tab-pill-item ${tab === 'settled' ? 'active' : ''}`} onClick={() => setTab('settled')}>
                        Saldadas ({settledDebts.length})
                    </button>
                </div>
            </div>

            {/* Debt list */}
            <div className="px-5 flex flex-col gap-3">
                {shownDebts.length === 0 ? (
                    <div
                        className="rounded-2xl p-8 text-center"
                        style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}
                    >
                        <p className="text-3xl mb-2">🤝</p>
                        <p className="text-text-muted text-sm">
                            {tab === 'active' ? 'Sin deudas activas' : 'Sin deudas saldadas'}
                        </p>
                    </div>
                ) : (
                    shownDebts.map((debt: Debt) => {
                        const remaining = debt.amount - debt.paidAmount;
                        const pct = (debt.paidAmount / debt.amount) * 100;
                        const isOwe = debt.direction === 'owe';
                        const color = isOwe ? '#EF4444' : '#10B981';
                        const overdue = debt.dueDate && new Date(debt.dueDate) < new Date() && debt.status === 'active';

                        return (
                            <div
                                key={debt.id}
                                className="rounded-2xl p-4"
                                style={{ background: 'var(--bg-card)', border: overdue ? '1px solid rgba(239,68,68,0.3)' : 'none' }}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                style={{ background: isOwe ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color }}
                                            >
                                                {isOwe ? '😬 Debo' : '💰 Me deben'}
                                            </span>
                                            {overdue && (
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                    style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
                                                >⚠ Vencida</span>
                                            )}
                                        </div>
                                        <p className="text-text-primary font-semibold text-sm font-display">{debt.title}</p>
                                        <p className="text-text-muted text-xs">👤 {debt.personName}</p>
                                        {debt.dueDate && (
                                            <p className="text-text-muted text-xs mt-0.5">
                                                📅 {new Date(debt.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        )}
                                        {debt.note && <p className="text-text-muted text-xs mt-0.5 italic">"{debt.note}"</p>}
                                    </div>
                                    <div className="text-right ml-3">
                                        <p className="font-display font-bold text-base" style={{ color }}>
                                            {formatCurrency(remaining, settings?.currency)}
                                        </p>
                                        <p className="text-text-muted text-xs">de {formatCurrency(debt.amount, settings?.currency)}</p>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="h-1.5 rounded-full mb-3" style={{ background: 'var(--bg-elevated)' }}>
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{ width: `${pct}%`, background: color }}
                                    />
                                </div>

                                {/* Actions */}
                                {debt.status === 'active' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setPayingDebt(debt); setPayAmount(''); }}
                                            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                                            style={{ background: isOwe ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color }}
                                        >
                                            {isOwe ? '💸 Registrar pago' : '✓ Recibir pago'}
                                        </button>
                                        <button
                                            onClick={() => setEditing(debt)}
                                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                                            style={{ background: 'var(--bg-elevated)' }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#94A3B8" strokeWidth="1.75" strokeLinecap="round" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#94A3B8" strokeWidth="1.75" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => debt.id && setConfirmDelete(debt.id)}
                                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                                            style={{ background: 'var(--bg-elevated)' }}
                                        >
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

            {/* Payment modal */}
            {payingDebt && (
                <div className="modal-overlay" style={{ zIndex: 100 }} onClick={() => setPayingDebt(null)}>
                    <div
                        className="modal-sheet"
                        style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                        <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />
                        <h2 className="text-text-primary font-display font-bold text-lg mb-1">
                            {payingDebt.direction === 'owe' ? '💸 Registrar pago' : '✓ Recibir pago'}
                        </h2>
                        <p className="text-text-secondary text-sm mb-5">
                            {payingDebt.direction === 'owe' ? 'Pagando a' : 'Recibiendo de'} <span className="text-text-primary font-semibold">{payingDebt.personName}</span>
                        </p>
                        <div className="flex items-center justify-between p-3 rounded-xl mb-3" style={{ background: 'var(--bg-elevated)' }}>
                            <p className="text-text-muted text-xs font-semibold tracking-widest">PENDIENTE</p>
                            <p className="text-text-primary font-display font-bold text-sm">
                                {formatCurrency(payingDebt.amount - payingDebt.paidAmount, settings?.currency)}
                            </p>
                        </div>
                        <p className="text-text-muted text-xs font-semibold tracking-widest mb-2">MONTO A ABONAR</p>
                        <input
                            className="input-field mb-5"
                            type="number"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button className="btn-secondary flex-1" onClick={() => setPayingDebt(null)}>Cancelar</button>
                            <button
                                className="btn-primary flex-1"
                                onClick={handlePartialPay}
                                disabled={!payAmount || parseFloat(payAmount) <= 0}
                                style={{ opacity: !payAmount ? 0.5 : 1 }}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {confirmDelete && (
                <div className="modal-overlay" style={{ zIndex: 100 }} onClick={() => setConfirmDelete(null)}>
                    <div
                        className="modal-sheet"
                        style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                        <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />
                        <p className="text-text-primary font-display font-bold text-lg mb-2">¿Eliminar deuda?</p>
                        <p className="text-text-secondary text-sm mb-6">Esta acción no se puede deshacer.</p>
                        <div className="flex gap-3">
                            <button className="btn-secondary flex-1" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                            <button
                                className="flex-1 py-3.5 rounded-xl font-semibold text-white"
                                style={{ background: '#EF4444' }}
                                onClick={async () => { await removeDebt(confirmDelete); setConfirmDelete(null); }}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button className="fab" onClick={() => setShowAdd(true)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
            </button>

            <BottomNav />
            {showAdd && <DebtModal onClose={() => setShowAdd(false)} />}
            {editing && <DebtModal onClose={() => setEditing(null)} editing={editing} />}
        </div>
    );
}
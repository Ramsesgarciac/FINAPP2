'use client';

import { useState } from 'react';
import { useFinance } from '@/lib/context';
import { formatCurrency, formatDate, CATEGORY_CONFIG } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import TransactionModal from '@/components/TransactionModal';

export default function TransactionsPage() {
  const { transactions, removeTransaction, settings } = useFinance();
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const filtered = transactions.filter((t) => filter === 'all' || t.type === filter);

  // Group by date
  const grouped: Record<string, typeof filtered> = {};
  filtered.forEach((tx) => {
    const dateKey = tx.date.slice(0, 10);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(tx);
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="h-screen overflow-y-auto pb-28">
      <div
        className="px-5 pb-4 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-full glass flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="text-text-primary font-display font-bold text-lg">Historial</h1>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-5 mb-4">
        <div className="tab-pill">
          {(['all', 'expense', 'income'] as const).map((f) => (
            <button
              key={f}
              className={`tab-pill-item ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todos' : f === 'expense' ? '💸 Gastos' : '💰 Ingresos'}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions list */}
      <div className="px-5">
        {sortedDates.length === 0 ? (
          <div className="text-center pt-16">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-text-primary font-display font-semibold mb-2">Sin transacciones</p>
            <button onClick={() => setShowAdd(true)} className="text-accent-blue text-sm mt-2">
              + Registrar primera transacción
            </button>
          </div>
        ) : (
          sortedDates.map((dateKey) => {
            const dayTxs = grouped[dateKey];
            const dateObj = new Date(dateKey + 'T12:00:00');
            const dayLabel = dateObj.toLocaleDateString('es-MX', {
              weekday: 'long', day: 'numeric', month: 'long',
            });
            const dayTotal = dayTxs.reduce((s, t) => t.type === 'expense' ? s - t.amount : s + t.amount, 0);

            return (
              <div key={dateKey} className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-text-secondary text-xs capitalize font-medium">{dayLabel}</p>
                  <p
                    className="text-xs font-semibold font-display"
                    style={{ color: dayTotal >= 0 ? '#10B981' : '#EF4444' }}
                  >
                    {dayTotal >= 0 ? '+' : ''}{formatCurrency(Math.abs(dayTotal), settings?.currency)}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {dayTxs.map((tx) => {
                    const cat = CATEGORY_CONFIG[tx.category];
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3 p-3.5 rounded-2xl"
                        style={{ background: 'var(--bg-card)' }}
                        onContextMenu={(e) => { e.preventDefault(); tx.id && setConfirmDelete(tx.id); }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: cat.bgColor }}
                        >
                          {cat.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary font-medium text-sm truncate">
                            {tx.description}
                          </p>
                          <p className="text-text-muted text-xs capitalize">
                            {cat.label}
                            {tx.activityType ? ` · ${tx.activityType === 'important' ? 'Importante' : 'Ocio'}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p
                            className="font-display font-semibold text-sm"
                            style={{ color: tx.type === 'income' ? '#10B981' : '#EF4444' }}
                          >
                            {tx.type === 'income' ? '+' : '-'}
                            {formatCurrency(tx.amount, settings?.currency)}
                          </p>
                          <button
                            onClick={() => tx.id && setConfirmDelete(tx.id)}
                            className="w-7 h-7 rounded-full bg-bg-elevated flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#EF4444" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="modal-overlay"
          style={{ zIndex: 100 }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="modal-sheet"
            style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />
            <p className="text-text-primary font-display font-bold text-lg mb-2">
              ¿Eliminar transacción?
            </p>
            <p className="text-text-secondary text-sm mb-6">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                className="btn-secondary flex-1"
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 py-3.5 rounded-xl font-semibold text-white transition-all"
                style={{ background: '#EF4444' }}
                onClick={async () => {
                  await removeTransaction(confirmDelete);
                  setConfirmDelete(null);
                }}
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
      {showAdd && <TransactionModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

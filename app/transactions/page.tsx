'use client';

import { useState, useMemo } from 'react';
import { useFinance } from '@/lib/context';
import { formatCurrency, CATEGORY_CONFIG } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import TransactionModal from '@/components/TransactionModal';
import { Transaction } from '@/lib/db';

export default function TransactionsPage() {
  const { transactions, removeTransaction, settings, editTransaction } = useFinance();
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editField, setEditField] = useState<{ id: number; field: 'description' | 'amount'; value: string } | null>(null);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase()) &&
        !t.note?.toLowerCase().includes(search.toLowerCase())) return false;
      if (minAmount && t.amount < parseFloat(minAmount)) return false;
      if (maxAmount && t.amount > parseFloat(maxAmount)) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo + 'T23:59:59') return false;
      return true;
    });
  }, [transactions, filter, search, minAmount, maxAmount, dateFrom, dateTo]);

  const hasActiveFilters = !!(search || minAmount || maxAmount || dateFrom || dateTo);
  const clearFilters = () => { setSearch(''); setMinAmount(''); setMaxAmount(''); setDateFrom(''); setDateTo(''); };

  const grouped: Record<string, typeof filtered> = {};
  filtered.forEach((tx) => {
    const dateKey = tx.date.slice(0, 10);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(tx);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const saveEditField = async () => {
    if (!editField) return;
    const tx = transactions.find((t) => t.id === editField.id);
    if (!tx) return;
    const updated = { ...tx };
    if (editField.field === 'amount') updated.amount = parseFloat(editField.value) || tx.amount;
    else updated.description = editField.value || tx.description;
    await editTransaction(updated);
    setEditField(null);
  };

  return (
    <div className="h-screen overflow-y-auto pb-28">
      <div className="px-5 pb-3 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-full glass flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="text-text-primary font-display font-bold text-lg">Historial</h1>
        </div>
        <button onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: hasActiveFilters ? 'rgba(79,124,255,0.2)' : 'var(--bg-elevated)', color: hasActiveFilters ? '#4F7CFF' : '#94A3B8' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Filtros {hasActiveFilters ? '●' : ''}
        </button>
      </div>

      {/* Search */}
      <div className="px-5 mb-3">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'var(--bg-card)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#475569" strokeWidth="1.75" />
            <path d="m21 21-4.35-4.35" stroke="#475569" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          <input className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted"
            placeholder="Buscar por descripción o nota..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} className="text-text-muted text-xs">✕</button>}
        </div>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="px-5 mb-3">
          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--bg-card)' }}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-text-muted text-xs mb-1">Monto mínimo</p>
                <input className="input-field text-sm" type="number" placeholder="$0"
                  value={minAmount} onChange={(e) => setMinAmount(e.target.value)} inputMode="decimal" />
              </div>
              <div>
                <p className="text-text-muted text-xs mb-1">Monto máximo</p>
                <input className="input-field text-sm" type="number" placeholder="Sin límite"
                  value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} inputMode="decimal" />
              </div>
              <div>
                <p className="text-text-muted text-xs mb-1">Desde</p>
                <input className="input-field text-sm" type="date" value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)} style={{ colorScheme: 'dark' }} />
              </div>
              <div>
                <p className="text-text-muted text-xs mb-1">Hasta</p>
                <input className="input-field text-sm" type="date" value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)} style={{ colorScheme: 'dark' }} />
              </div>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs font-semibold self-end" style={{ color: '#4F7CFF' }}>
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="px-5 mb-4">
        <div className="tab-pill">
          {(['all', 'expense', 'income'] as const).map((f) => (
            <button key={f} className={`tab-pill-item ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? `Todos (${filtered.length})` : f === 'expense' ? '💸 Gastos' : '💰 Ingresos'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-5">
        {sortedDates.length === 0 ? (
          <div className="text-center pt-16">
            <p className="text-4xl mb-3">{hasActiveFilters ? '🔍' : '📊'}</p>
            <p className="text-text-primary font-display font-semibold mb-2">
              {hasActiveFilters ? 'Sin resultados' : 'Sin transacciones'}
            </p>
            {hasActiveFilters
              ? <button onClick={clearFilters} className="text-accent-blue text-sm mt-2">Limpiar filtros</button>
              : <button onClick={() => setShowAdd(true)} className="text-accent-blue text-sm mt-2">+ Registrar primera transacción</button>
            }
          </div>
        ) : (
          sortedDates.map((dateKey) => {
            const dayTxs = grouped[dateKey];
            const dateObj = new Date(dateKey + 'T12:00:00');
            const dayLabel = dateObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
            const dayTotal = dayTxs.reduce((s, t) => t.type === 'expense' ? s - t.amount : s + t.amount, 0);
            return (
              <div key={dateKey} className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-text-secondary text-xs capitalize font-medium">{dayLabel}</p>
                  <p className="text-xs font-semibold font-display"
                    style={{ color: dayTotal >= 0 ? '#10B981' : '#EF4444' }}>
                    {dayTotal >= 0 ? '+' : ''}{formatCurrency(Math.abs(dayTotal), settings?.currency)}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {dayTxs.map((tx) => {
                    const cat = CATEGORY_CONFIG[tx.category];
                    const isEditingDesc = editField !== null && editField.id === tx.id && editField.field === 'description';
                    const isEditingAmt = editField !== null && editField.id === tx.id && editField.field === 'amount';
                    return (
                      <div key={tx.id} className="flex items-center gap-3 p-3.5 rounded-2xl"
                        style={{ background: 'var(--bg-card)' }}
                        onContextMenu={(e) => { e.preventDefault(); tx.id && setConfirmDelete(tx.id); }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: cat.bgColor }}>
                          {cat.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          {isEditingDesc ? (
                            <input autoFocus
                              className="w-full bg-bg-elevated text-text-primary text-sm px-2 py-1 rounded-lg outline-none"
                              value={editField?.value ?? ''}
                              onChange={(e) => setEditField(editField ? { ...editField, value: e.target.value } : null)}
                              onBlur={saveEditField}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveEditField(); if (e.key === 'Escape') setEditField(null); }} />
                          ) : (
                            <p className="text-text-primary font-medium text-sm truncate cursor-text"
                              onDoubleClick={() => { if (tx.id !== undefined) setEditField({ id: tx.id, field: 'description', value: tx.description }); }}>
                              {tx.description}
                            </p>
                          )}
                          <p className="text-text-muted text-xs capitalize">
                            {cat.label}{tx.activityType ? ` · ${tx.activityType === 'important' ? 'Importante' : 'Ocio'}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditingAmt ? (
                            <input autoFocus type="number"
                              className="w-20 bg-bg-elevated text-right text-sm px-2 py-1 rounded-lg outline-none font-display font-semibold"
                              style={{ color: tx.type === 'income' ? '#10B981' : '#EF4444' }}
                              value={editField?.value ?? ''}
                              onChange={(e) => setEditField(editField ? { ...editField, value: e.target.value } : null)}
                              onBlur={saveEditField}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveEditField(); if (e.key === 'Escape') setEditField(null); }} />
                          ) : (
                            <p className="font-display font-semibold text-sm cursor-text"
                              style={{ color: tx.type === 'income' ? '#10B981' : '#EF4444' }}
                              onDoubleClick={() => { if (tx.id !== undefined) setEditField({ id: tx.id, field: 'amount', value: tx.amount.toString() }); }}>
                              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, settings?.currency)}
                            </p>
                          )}
                          <button onClick={() => tx.id && setConfirmDelete(tx.id)}
                            className="w-7 h-7 rounded-full bg-bg-elevated flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity">
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

      {transactions.length > 0 && (
        <p className="text-center text-text-muted text-xs px-5 pb-4 mt-2">
          💡 Doble toque en descripción o monto para editar rápido
        </p>
      )}

      {confirmDelete && (
        <div className="modal-overlay" style={{ zIndex: 100 }} onClick={() => setConfirmDelete(null)}>
          <div className="modal-sheet" style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />
            <p className="text-text-primary font-display font-bold text-lg mb-2">¿Eliminar transacción?</p>
            <p className="text-text-secondary text-sm mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="flex-1 py-3.5 rounded-xl font-semibold text-white" style={{ background: '#EF4444' }}
                onClick={async () => { await removeTransaction(confirmDelete); setConfirmDelete(null); }}>
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
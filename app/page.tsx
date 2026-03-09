'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFinance } from '@/lib/context';
import { formatCurrency, formatDate, CATEGORY_CONFIG, getDaysUntil } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';
import TransactionModal from '@/components/TransactionModal';

export default function HomePage() {
  const {
    transactions,
    scheduledEvents,
    monthSummary,
    settings,
    alerts,
    runOutDay,
    dismissAlert,
    isLoading,
    cycleNote,
    saveCycleNoteContent,
  } = useFinance();

  const [showAddTx, setShowAddTx] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  // Sync noteText cuando cycleNote se carga desde la DB
  useEffect(() => {
    setNoteText(cycleNote);
  }, [cycleNote]);

  const recent = transactions.slice(0, 5);
  const unreadAlerts = alerts.filter((a) => !a.isRead).slice(0, 3);
  const upcomingBills = scheduledEvents.filter((e) => e.status === 'pending').slice(0, 3);

  const available = monthSummary?.available ?? 0;
  const monthlyIncome = settings?.monthlyIncome ?? 0;
  const totalSpent = monthSummary?.totalExpenses ?? 0;
  const prevRollover = monthSummary?.prevRollover ?? 0;
  const cycleStart = monthSummary?.cycleStart ? new Date(monthSummary.cycleStart) : null;
  const cycleEnd = monthSummary?.cycleEnd ? new Date(monthSummary.cycleEnd) : null;
  const formatCycleDate = (d: Date | null) =>
    d ? d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '';

  const handleNoteSave = async () => {
    await saveCycleNoteContent(noteText);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
          <p className="text-text-secondary text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto pb-28">
      {/* Header */}
      <div
        className="px-5 pb-4 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'var(--avatar-gradient, linear-gradient(135deg, #4F7CFF, #8B5CF6))' }}
          >
            {settings?.name?.charAt(0) ?? 'U'}
          </div>
          <div>
            <p className="text-text-secondary text-xs">Bienvenido de vuelta,</p>
            <p className="text-text-primary font-semibold font-display text-sm">
              {settings?.name ?? 'Usuario'}
            </p>
          </div>
        </div>
        <Link href="/alerts" className="relative">
          <div className="w-10 h-10 rounded-full glass flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
                stroke="#94A3B8" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </div>
          {unreadAlerts.length > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border border-bg-primary">
              {unreadAlerts.length}
            </span>
          )}
        </Link>
      </div>

      {/* Balance Card */}
      <div className="px-5 mb-5">
        <div className="balance-card rounded-2xl p-5 relative" style={{ minHeight: 160 }}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white/70 text-sm font-medium">Saldo Disponible</p>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="5" width="20" height="14" rx="3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
                <path d="M16 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0z" fill="rgba(255,255,255,0.7)" />
                <path d="M14 12h-8" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-white font-display font-bold mb-5" style={{ fontSize: '2rem', letterSpacing: '-0.02em' }}>
              {formatCurrency(available, settings?.currency)}
            </p>
            {cycleStart && cycleEnd && (
              <p className="text-white/50 text-[10px] font-medium mb-2">
                Ciclo: {formatCycleDate(cycleStart)} → {formatCycleDate(cycleEnd)}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white/60 text-[10px] font-semibold tracking-widest mb-1">INGRESO</p>
                <p className="text-white font-semibold text-sm">
                  +{formatCurrency(monthlyIncome, settings?.currency)}
                </p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white/60 text-[10px] font-semibold tracking-widest mb-1">GASTADO</p>
                <p className="text-white font-semibold text-sm">
                  -{formatCurrency(totalSpent, settings?.currency)}
                </p>
              </div>
              {prevRollover > 0 && (
                <div className="col-span-2 bg-white/10 rounded-xl p-3 flex items-center justify-between">
                  <p className="text-white/60 text-[10px] font-semibold tracking-widest">✨ SOBRANTE ANTERIOR</p>
                  <p className="text-white font-semibold text-sm">
                    +{formatCurrency(prevRollover, settings?.currency)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Run out prediction */}
      {runOutDay && runOutDay <= 28 && (
        <div className="px-5 mb-4">
          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <span className="text-xl mt-0.5">⚠️</span>
            <div>
              <p className="text-red-400 font-semibold text-sm font-display">Predicción de gastos</p>
              <p className="text-text-secondary text-xs mt-0.5">
                Si continúas así, te quedarás sin dinero el{' '}
                <span className="text-red-400 font-semibold">día {runOutDay}</span> de este mes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Smart Alerts */}
      {unreadAlerts.length > 0 && (
        <section className="px-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-text-primary font-display font-semibold text-base">Alertas</h2>
            <Link href="/alerts" className="text-accent-blue text-xs font-medium">Ver todas</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5">
            {unreadAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex-shrink-0 w-64 rounded-2xl p-4 card-hover"
                style={{
                  background: `rgba(${alert.color === '#F97316' ? '249,115,22' : '79,124,255'},0.08)`,
                  border: `1px solid ${alert.color}22`,
                }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xl">{alert.icon}</span>
                  <p className="text-text-primary text-sm font-semibold font-display leading-tight">
                    {alert.title}
                  </p>
                </div>
                <p className="text-text-secondary text-xs leading-relaxed mb-3">{alert.message}</p>
                <div className="h-1 rounded-full" style={{ background: alert.color, width: '70%', opacity: 0.6 }} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Transactions */}
      <section className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-text-primary font-display font-semibold text-base">Transacciones Recientes</h2>
          <Link href="/transactions" className="text-text-secondary text-xs font-medium">Ver historial</Link>
        </div>
        {recent.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}
          >
            <p className="text-text-muted text-sm">Sin transacciones aún</p>
            <button onClick={() => setShowAddTx(true)} className="mt-3 text-accent-blue text-sm font-medium">
              + Agregar primera transacción
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((tx) => {
              const cat = CATEGORY_CONFIG[tx.category];
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3.5 rounded-2xl card-hover"
                  style={{ background: 'var(--bg-card)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: cat.bgColor }}
                  >
                    {cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium text-sm truncate">{tx.description}</p>
                    <p className="text-text-muted text-xs">{formatDate(tx.date)}</p>
                  </div>
                  <p
                    className="font-display font-semibold text-sm flex-shrink-0"
                    style={{ color: tx.type === 'income' ? '#10B981' : '#EF4444' }}
                  >
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, settings?.currency)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Upcoming Bills */}
      {upcomingBills.length > 0 && (
        <section className="px-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-text-primary font-display font-semibold text-base">Recordatorios</h2>
            <Link href="/agenda" className="text-text-secondary text-xs font-medium">Ver agenda</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {upcomingBills.slice(0, 4).map((event) => {
              const daysUntil = getDaysUntil(event.dueDate);
              const cat = CATEGORY_CONFIG[event.category];
              return (
                <div key={event.id} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)' }}>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-base mb-3"
                    style={{ background: cat.bgColor }}
                  >
                    {cat.icon}
                  </div>
                  <p className="text-text-primary font-semibold text-sm font-display">{event.title}</p>
                  <p className="text-text-muted text-xs mt-0.5">{formatCurrency(event.amount, settings?.currency)}</p>
                  <p
                    className="text-xs font-medium mt-2"
                    style={{ color: daysUntil <= 1 ? '#EF4444' : daysUntil <= 3 ? '#F97316' : '#94A3B8' }}
                  >
                    {daysUntil === 0 ? 'Vence hoy' : daysUntil < 0 ? 'Vencido' : `En ${daysUntil} día(s)`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 📓 Nota del Ciclo */}
      <section className="px-5 mb-5">
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-text-muted text-xs font-semibold tracking-widest">📓 NOTA DEL CICLO</p>
            {noteSaved && (
              <span className="text-xs font-semibold" style={{ color: '#10B981' }}>✓ Guardada</span>
            )}
          </div>
          <textarea
            className="w-full bg-transparent text-text-secondary text-sm outline-none resize-none placeholder:text-text-muted"
            placeholder="Escribe algo sobre este ciclo... ej: 'Tuve gasto extra por viaje', 'Mes tranquilo'"
            rows={3}
            value={noteText}
            onChange={(e) => { setNoteText(e.target.value); setNoteSaved(false); }}
            onBlur={handleNoteSave}
          />
        </div>
      </section>

      {/* FAB */}
      <button className="fab" onClick={() => setShowAddTx(true)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      <BottomNav />
      {showAddTx && <TransactionModal onClose={() => setShowAddTx(false)} />}
    </div>
  );
}
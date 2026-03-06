'use client';

import { useState } from 'react';
import { useFinance } from '@/lib/context';
import {
  formatCurrency,
  CATEGORY_CONFIG,
  getMonthName,
  getDaysInMonth,
  getFirstDayOfMonth,
} from '@/lib/utils';
import BottomNav from '@/components/BottomNav';
import EventModal from '@/components/EventModal';
import { ScheduledEvent } from '@/lib/db';

export default function AgendaPage() {
  const { scheduledEvents, settings, updateEvent } = useFinance();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<number>(today.getDate());
  const [showAddEvent, setShowAddEvent] = useState(false);

  // Modal de confirmación de pago
  const [payConfirm, setPayConfirm] = useState<ScheduledEvent | null>(null);
  const [actualSpent, setActualSpent] = useState('');

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = getMonthName(month);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return scheduledEvents.filter((e) => e.dueDate.startsWith(dateStr));
  };

  const selectedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
  const eventsToday = getEventsForDay(selectedDate);

  const upcomingEvents = scheduledEvents
    .filter((e) => e.status === 'pending')
    .slice(0, 6);

  // Abre el modal de confirmación de pago (solo al marcar como pagado)
  const handlePayClick = (event: ScheduledEvent) => {
    if (event.status === 'paid') {
      // Revertir directo sin modal
      updateEvent({ ...event, status: 'pending' });
      return;
    }
    setActualSpent(event.amount.toString());
    setPayConfirm(event);
  };

  // Confirma el pago con el monto real gastado
  const handleConfirmPay = async () => {
    if (!payConfirm) return;
    const real = parseFloat(actualSpent) || payConfirm.amount;
    // Guardamos el monto real en el evento al marcarlo pagado
    await updateEvent({
      ...payConfirm,
      status: 'paid',
      amount: real, // el monto real reemplaza al presupuestado
    });
    setPayConfirm(null);
    setActualSpent('');
  };

  const isOverdue = (event: ScheduledEvent) => {
    const eventDate = new Date(event.dueDate);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return eventDate < todayStart && event.status === 'pending';
  };

  const dayLabels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  // Calcula diferencia para mostrar en el modal
  const budgetedAmount = payConfirm?.amount ?? 0;
  const realAmount = parseFloat(actualSpent) || 0;
  const diff = budgetedAmount - realAmount;
  const hasSurplus = diff > 0;
  const hasDeficit = diff < 0;

  const renderStatusButton = (event: ScheduledEvent) => {
    if (isOverdue(event)) {
      return (
        <button
          onClick={() => handlePayClick(event)}
          className="badge"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          ⚠ Desfasado
        </button>
      );
    }
    if (event.status === 'paid') {
      return (
        <button
          onClick={() => handlePayClick(event)}
          className="badge badge-paid"
          title="Clic para revertir a pendiente"
        >
          ✓ Pagado
        </button>
      );
    }
    return (
      <button
        onClick={() => handlePayClick(event)}
        className="badge badge-pending"
      >
        Pagar
      </button>
    );
  };

  return (
    <div className="h-screen overflow-y-auto pb-28">
      {/* Header */}
      <div
        className="px-5 pb-4 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(79,124,255,0.15)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="4" stroke="#4F7CFF" strokeWidth="1.75" />
              <path d="M8 2V6M16 2V6M3 10H21" stroke="#4F7CFF" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-text-primary font-display font-bold text-lg">Agenda Financiera</h1>
        </div>
        <button
          className="w-9 h-9 rounded-full glass flex items-center justify-center"
          onClick={() => {
            setYear(today.getFullYear());
            setMonth(today.getMonth());
            setSelectedDate(today.getDate());
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#94A3B8" strokeWidth="1.75" />
            <path d="m21 21-4.35-4.35" stroke="#94A3B8" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Calendar */}
      <div className="mx-5 mb-5 rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={prevMonth} className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="text-text-primary font-display font-semibold capitalize">
            {monthName} {year}
          </p>
          <button onClick={nextMonth} className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 px-4 pb-2">
          {dayLabels.map((d) => (
            <div key={d} className="text-center text-text-muted text-xs font-semibold py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 px-4 pb-4 gap-y-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isSelected = day === selectedDate;
            const dayEvents = getEventsForDay(day);
            const hasImportant = dayEvents.some((e) => e.activityType === 'important');
            const hasLeisure = dayEvents.some((e) => e.activityType === 'leisure');

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(day)}
                className="flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all"
                style={{
                  background: isSelected ? 'var(--accent-blue)' : isToday ? 'rgba(79,124,255,0.1)' : 'transparent',
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{
                    color: isSelected ? 'white' : isToday ? '#4F7CFF' : '#F1F5F9',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {day}
                </span>
                {(hasImportant || hasLeisure) && (
                  <div className="flex gap-0.5">
                    {hasImportant && (
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: isSelected ? 'white' : '#4F7CFF' }} />
                    )}
                    {hasLeisure && (
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: isSelected ? 'rgba(255,255,255,0.7)' : '#8B5CF6' }} />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events for selected date */}
      <section className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-text-primary font-display font-semibold text-base">Eventos del día</h2>
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(79,124,255,0.15)', color: '#4F7CFF' }}
          >
            {selectedDateStr.slice(5, 10).split('-').reverse().join('/')}
          </span>
        </div>

        {eventsToday.length === 0 ? (
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}
          >
            <p className="text-text-muted text-sm">Sin eventos para este día</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {eventsToday.map((event) => {
              const cat = CATEGORY_CONFIG[event.category];
              const time = new Date(event.dueDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ background: 'var(--bg-card)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: cat.bgColor }}
                  >
                    {cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-semibold text-sm font-display">{event.title}</p>
                    <p className="text-text-muted text-xs capitalize">{cat.label} · {time}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="font-display font-semibold text-sm" style={{ color: '#EF4444' }}>
                      -{formatCurrency(event.amount, settings?.currency)}
                    </p>
                    {renderStatusButton(event)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Upcoming Payments */}
      {upcomingEvents.length > 0 && (
        <section className="px-5 mb-5">
          <h2 className="text-text-primary font-display font-semibold text-base mb-3">Próximos Pagos</h2>
          <div className="flex flex-col gap-2">
            {upcomingEvents.map((event) => {
              const cat = CATEGORY_CONFIG[event.category];
              const d = new Date(event.dueDate);
              const dayLabel = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ background: 'var(--bg-card)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: cat.bgColor }}
                  >
                    {cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-semibold text-sm font-display">{event.title}</p>
                    <p className="text-text-muted text-xs">{dayLabel} · {cat.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-semibold text-sm" style={{ color: '#EF4444' }}>
                      -{formatCurrency(event.amount, settings?.currency)}
                    </p>
                    {isOverdue(event) ? (
                      <button
                        onClick={() => handlePayClick(event)}
                        className="badge"
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
                      >
                        ⚠ Desfasado
                      </button>
                    ) : (
                      <button onClick={() => handlePayClick(event)} className="badge badge-pending">
                        Pagar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* FAB */}
      <button className="fab" onClick={() => setShowAddEvent(true)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      <BottomNav />
      {showAddEvent && <EventModal onClose={() => setShowAddEvent(false)} defaultDate={selectedDateStr} />}

      {/* ── Modal confirmación de pago ── */}
      {payConfirm && (
        <div className="modal-overlay" style={{ zIndex: 100 }} onClick={() => setPayConfirm(null)}>
          <div
            className="modal-sheet"
            style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />

            <h2 className="text-text-primary font-display font-bold text-lg mb-1">
              Confirmar Pago
            </h2>
            <p className="text-text-secondary text-sm mb-5">
              ¿Cuánto gastaste realmente en <span className="text-text-primary font-semibold">{payConfirm.title}</span>?
            </p>

            {/* Presupuestado */}
            <div
              className="flex items-center justify-between p-3 rounded-xl mb-3"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <p className="text-text-muted text-xs font-semibold tracking-widest">PRESUPUESTADO</p>
              <p className="text-text-primary font-display font-bold text-sm">
                {formatCurrency(payConfirm.amount, settings?.currency)}
              </p>
            </div>

            {/* Input monto real */}
            <p className="text-text-muted text-xs font-semibold tracking-widest mb-2">MONTO REAL GASTADO</p>
            <input
              className="input-field mb-3"
              type="number"
              inputMode="decimal"
              value={actualSpent}
              onChange={(e) => setActualSpent(e.target.value)}
              placeholder="0.00"
              autoFocus
            />

            {/* Diferencia en tiempo real */}
            {realAmount > 0 && realAmount !== payConfirm.amount && (
              <div
                className="flex items-center justify-between p-3 rounded-xl mb-4"
                style={{
                  background: hasSurplus ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${hasSurplus ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: hasSurplus ? '#10B981' : '#EF4444' }}
                >
                  {hasSurplus ? '✨ Sobrante' : '⚠️ Excedido'}
                </p>
                <p
                  className="font-display font-bold text-sm"
                  style={{ color: hasSurplus ? '#10B981' : '#EF4444' }}
                >
                  {hasSurplus ? '+' : '-'}{formatCurrency(Math.abs(diff), settings?.currency)}
                </p>
              </div>
            )}

            {/* Explicación */}
            {realAmount > 0 && (
              <p className="text-text-muted text-xs mb-5 leading-relaxed">
                {hasSurplus
                  ? `El sobrante de ${formatCurrency(diff, settings?.currency)} será devuelto a tu saldo disponible.`
                  : hasDeficit
                    ? `El excedente de ${formatCurrency(Math.abs(diff), settings?.currency)} será descontado de tu saldo disponible.`
                    : 'Gastaste exactamente lo presupuestado. ¡Perfecto!'}
              </p>
            )}

            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setPayConfirm(null)}>
                Cancelar
              </button>
              <button
                className="btn-primary flex-1"
                onClick={handleConfirmPay}
                disabled={!actualSpent || realAmount === 0}
                style={{ opacity: !actualSpent || realAmount === 0 ? 0.5 : 1 }}
              >
                ✓ Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useFinance } from '@/lib/context';
import { CATEGORY_CONFIG } from '@/lib/utils';
import { CategoryKey, ActivityType, ScheduledEvent } from '@/lib/db';

interface Props {
  onClose: () => void;
  defaultDate?: string;
  editing?: ScheduledEvent;
}

const CATEGORIES = Object.entries(CATEGORY_CONFIG)
  .filter(([k]) => k !== 'income' && k !== 'other')
  .map(([key, val]) => ({ key: key as CategoryKey, ...val }));

export default function EventModal({ onClose, defaultDate, editing }: Props) {
  const { addNewEvent, updateEvent } = useFinance();

  const [title, setTitle] = useState(editing?.title ?? '');
  const [amount, setAmount] = useState(editing?.amount.toString() ?? '');
  const [category, setCategory] = useState<CategoryKey>(editing?.category ?? 'services');
  const [activityType, setActivityType] = useState<ActivityType>(editing?.activityType ?? 'important');
  const [dueDate, setDueDate] = useState(
    editing ? editing.dueDate.slice(0, 10) : (defaultDate ?? new Date().toISOString().slice(0, 10))
  );
  const [dueTime, setDueTime] = useState(
    editing ? editing.dueDate.slice(11, 16) : '09:00'
  );
  const [isRecurring, setIsRecurring] = useState(editing?.isRecurring ?? false);
  const [note, setNote] = useState(editing?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const isDirty = title.trim() !== '' || amount !== '';

  const handleClose = () => {
    if (isDirty && !editing) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  };

  // Haptic feedback
  const haptic = (style: 'light' | 'medium' = 'light') => {
    if ('vibrate' in navigator) navigator.vibrate(style === 'light' ? 30 : 60);
  };

  const handleSave = async () => {
    if (!title.trim() || !amount) return;
    setSaving(true);
    haptic('medium');
    const payload = {
      title: title.trim(),
      amount: parseFloat(amount),
      category,
      dueDate: `${dueDate}T${dueTime}:00.000Z`,
      activityType,
      isRecurring,
      recurringMonthly: isRecurring,
      status: editing?.status ?? 'pending' as const,
      note: note.trim() || undefined,
    };
    try {
      if (editing?.id !== undefined) {
        await updateEvent({ ...payload, id: editing.id });
      } else {
        await addNewEvent(payload);
      }
    } finally {
      setSaving(false);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-sheet"
        style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-text-primary font-display font-bold text-lg">
            {editing ? 'Editar Evento' : 'Nuevo Evento'}
          </h2>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Activity Type */}
        <div className="tab-pill mb-4">
          <button
            className={`tab-pill-item ${activityType === 'important' ? 'active' : ''}`}
            onClick={() => setActivityType('important')}
          >
            ⭐ Importante
          </button>
          <button
            className={`tab-pill-item ${activityType === 'leisure' ? 'active' : ''}`}
            onClick={() => setActivityType('leisure')}
          >
            🎯 Ocio
          </button>
        </div>

        <input
          className="input-field mb-3"
          placeholder="Título (ej: Netflix, Renta...)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus={!editing}
        />

        <input
          className="input-field mb-3"
          type="number"
          placeholder="Monto"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-text-muted text-xs mb-1.5">Fecha</p>
            <input
              className="input-field"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div>
            <p className="text-text-muted text-xs mb-1.5">Hora</p>
            <input
              className="input-field"
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* Category */}
        <p className="text-text-muted text-xs font-semibold tracking-widest mb-2">CATEGORÍA</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
              style={{
                background: category === cat.key ? `${cat.color}20` : 'var(--bg-elevated)',
                border: `1px solid ${category === cat.key ? cat.color : 'transparent'}`,
              }}
            >
              <span className="text-lg">{cat.icon}</span>
              <span className="text-[10px] font-medium" style={{ color: category === cat.key ? cat.color : '#94A3B8' }}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>

        {/* Recurring */}
        <div
          className="flex items-center justify-between p-4 rounded-xl mb-4"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <div>
            <p className="text-text-primary text-sm font-medium">Pago recurrente</p>
            <p className="text-text-muted text-xs">Se repite cada mes</p>
          </div>
          <button
            onClick={() => setIsRecurring(!isRecurring)}
            className="relative w-12 h-6 rounded-full transition-all"
            style={{ background: isRecurring ? '#4F7CFF' : 'var(--bg-card)' }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
              style={{ left: isRecurring ? '26px' : '2px' }}
            />
          </button>
        </div>

        <input
          className="input-field mb-5"
          placeholder="Nota (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving || !title.trim() || !amount}
          style={{ opacity: saving || !title.trim() || !amount ? 0.5 : 1 }}
        >
          {saving ? 'Guardando...' : editing ? '✏️ Guardar Cambios' : '📅 Guardar Evento'}
        </button>
      </div>

      {/* Confirmación de cierre con datos */}
      {confirmClose && (
        <div
          className="modal-overlay"
          style={{ zIndex: 110 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="modal-sheet"
            style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />
            <p className="text-text-primary font-display font-bold text-lg mb-2">¿Descartar cambios?</p>
            <p className="text-text-secondary text-sm mb-6">Tienes información sin guardar. Si sales ahora se perderá.</p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setConfirmClose(false)}>Seguir editando</button>
              <button
                className="flex-1 py-3.5 rounded-xl font-semibold text-white"
                style={{ background: '#EF4444' }}
                onClick={onClose}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
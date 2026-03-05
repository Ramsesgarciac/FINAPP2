'use client';

import { useState } from 'react';
import { useFinance } from '@/lib/context';
import { CATEGORY_CONFIG } from '@/lib/utils';
import { CategoryKey, ActivityType } from '@/lib/db';

interface Props {
  onClose: () => void;
}

const CATEGORIES = Object.entries(CATEGORY_CONFIG)
  .filter(([k]) => k !== 'income' && k !== 'other')
  .map(([key, val]) => ({ key: key as CategoryKey, ...val }));

export default function TransactionModal({ onClose }: Props) {
  const { addNewTransaction, settings } = useFinance();
  const [amount, setAmount] = useState('0');
  const [category, setCategory] = useState<CategoryKey>('food');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [activityType, setActivityType] = useState<ActivityType>('important');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleKey = (key: string) => {
    if (key === '⌫') {
      setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }
    if (key === '.' && amount.includes('.')) return;
    if (amount === '0' && key !== '.') {
      setAmount(key);
    } else {
      // Max 2 decimals
      const parts = amount.split('.');
      if (parts[1]?.length >= 2) return;
      setAmount(amount + key);
    }
  };

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (!num || !description.trim()) return;
    setSaving(true);
    await addNewTransaction({
      type,
      amount: num,
      category: type === 'income' ? 'income' : category,
      description: description.trim(),
      note: note.trim() || undefined,
      date: new Date().toISOString(),
      activityType,
    });
    setSaving(false);
    onClose();
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />

        {/* Title */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-text-primary font-display font-bold text-lg">Registrar</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Type Toggle */}
        <div className="tab-pill mb-5">
          <button
            className={`tab-pill-item ${type === 'expense' ? 'active' : ''}`}
            onClick={() => setType('expense')}
          >
            💸 Gasto
          </button>
          <button
            className={`tab-pill-item ${type === 'income' ? 'active' : ''}`}
            onClick={() => setType('income')}
          >
            💰 Ingreso
          </button>
        </div>

        {/* Amount Display */}
        <div className="text-center mb-5">
          <p className="text-text-secondary text-xs font-semibold tracking-widest mb-1">MONTO</p>
          <p
            className="font-display font-bold"
            style={{
              fontSize: '2.5rem',
              letterSpacing: '-0.02em',
              color: type === 'income' ? '#10B981' : '#4F7CFF',
            }}
          >
            ${amount}
          </p>
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {keys.map((k) => (
            <button
              key={k}
              onClick={() => handleKey(k)}
              className="h-12 rounded-xl font-display font-semibold text-lg text-text-primary transition-all active:scale-95"
              style={{
                background: k === '⌫' ? 'rgba(239,68,68,0.1)' : 'var(--bg-elevated)',
                color: k === '⌫' ? '#EF4444' : undefined,
              }}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Description */}
        <input
          className="input-field mb-3"
          placeholder="Descripción (ej: Uber, Netflix...)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Category (only for expenses) */}
        {type === 'expense' && (
          <>
            <p className="text-text-muted text-xs font-semibold tracking-widest mb-2">CATEGORÍA</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all active:scale-95"
                  style={{
                    background: category === cat.key ? `${cat.color}20` : 'var(--bg-elevated)',
                    border: `1px solid ${category === cat.key ? cat.color : 'transparent'}`,
                  }}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-[11px] font-medium" style={{ color: category === cat.key ? cat.color : '#94A3B8' }}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Activity type */}
            <div className="tab-pill mb-3">
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
          </>
        )}

        {/* Note */}
        <input
          className="input-field mb-5"
          placeholder="Nota (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* Save */}
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving || !description.trim() || parseFloat(amount) === 0}
          style={{ opacity: saving || !description.trim() || parseFloat(amount) === 0 ? 0.5 : 1 }}
        >
          {saving ? 'Guardando...' : '💾 Guardar'}
        </button>
      </div>
    </div>
  );
}

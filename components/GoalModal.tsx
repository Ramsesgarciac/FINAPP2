'use client';

import { useState } from 'react';
import { useFinance } from '@/lib/context';

interface Props { onClose: () => void; }

const COLORS = ['#4F7CFF', '#8B5CF6', '#10B981', '#F97316', '#EC4899', '#06B6D4', '#EF4444', '#F59E0B'];

export default function GoalModal({ onClose }: Props) {
  const { addNewGoal } = useFinance();
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [deadline, setDeadline] = useState('');
  const [note, setNote] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !target || !deadline) return;
    setSaving(true);
    await addNewGoal({
      title: title.trim(),
      targetAmount: parseFloat(target),
      currentAmount: parseFloat(current) || 0,
      deadline,
      status: 'active',
      color,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-text-primary font-display font-bold text-lg">Nueva Meta</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <input className="input-field mb-3" placeholder="Nombre de la meta (ej: Laptop)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input-field mb-3" type="number" placeholder="Monto objetivo" value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" />
        <input className="input-field mb-3" type="number" placeholder="Ya tengo (opcional)" value={current} onChange={(e) => setCurrent(e.target.value)} inputMode="decimal" />
        
        <div className="mb-3">
          <p className="text-text-muted text-xs mb-1.5">Fecha límite</p>
          <input className="input-field" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>

        <input className="input-field mb-4" placeholder="Descripción (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />

        {/* Color picker */}
        <p className="text-text-muted text-xs font-semibold tracking-widest mb-2">COLOR</p>
        <div className="flex gap-2 mb-5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full transition-all"
              style={{
                background: c,
                outline: color === c ? `2px solid ${c}` : 'none',
                outlineOffset: '2px',
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving || !title.trim() || !target || !deadline}
          style={{ opacity: saving || !title.trim() || !target || !deadline ? 0.5 : 1 }}
        >
          {saving ? 'Guardando...' : '🎯 Crear Meta'}
        </button>
      </div>
    </div>
  );
}

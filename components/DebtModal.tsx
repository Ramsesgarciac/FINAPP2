'use client';

import { useState } from 'react';
import { useFinance } from '@/lib/context';
import { Debt, CategoryKey } from '@/lib/db';
import { CATEGORY_CONFIG } from '@/lib/utils';

const CATEGORIES = Object.entries(CATEGORY_CONFIG)
    .filter(([k]) => k !== 'income' && k !== 'other')
    .map(([key, val]) => ({ key: key as CategoryKey, ...val }));

interface Props {
    onClose: () => void;
    editing?: Debt;
}

export default function DebtModal({ onClose, editing }: Props) {
    const { addNewDebt, editDebt } = useFinance();
    const [direction, setDirection] = useState<'owe' | 'owed'>(editing?.direction ?? 'owe');
    const [personName, setPersonName] = useState(editing?.personName ?? '');
    const [title, setTitle] = useState(editing?.title ?? '');
    const [amount, setAmount] = useState(editing?.amount.toString() ?? '');
    const [dueDate, setDueDate] = useState(editing?.dueDate?.slice(0, 10) ?? '');
    const [alertDays, setAlertDays] = useState<number>(editing?.alertDays ?? 3);
    const [note, setNote] = useState(editing?.note ?? '');
    const [category, setCategory] = useState<CategoryKey>(editing?.category ?? 'services');
    const [saving, setSaving] = useState(false);
    const [confirmClose, setConfirmClose] = useState(false);

    const isDirty = personName.trim() !== '' || title.trim() !== '' || amount !== '';

    const handleClose = () => {
        if (isDirty && !editing) {
            setConfirmClose(true);
        } else {
            onClose();
        }
    };

    const haptic = (style: 'light' | 'medium' = 'light') => {
        if ('vibrate' in navigator) navigator.vibrate(style === 'light' ? 30 : 60);
    };

    const handleSave = async () => {
        const num = parseFloat(amount);
        if (!num || !personName.trim() || !title.trim()) return;
        setSaving(true);
        haptic('medium');
        const payload: Omit<Debt, 'id'> = {
            title: title.trim(),
            personName: personName.trim(),
            amount: num,
            paidAmount: editing?.paidAmount ?? 0,
            direction,
            dueDate: dueDate ? new Date(dueDate + 'T12:00:00').toISOString() : undefined,
            alertDays: dueDate ? alertDays : undefined,
            note: note.trim() || undefined,
            status: editing?.status ?? 'active',
            createdAt: editing?.createdAt ?? new Date().toISOString(),
            category,
        };
        try {
            if (editing?.id !== undefined) {
                await editDebt({ ...payload, id: editing.id });
            } else {
                await addNewDebt(payload);
            }
        } finally {
            setSaving(false);
            onClose();
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 100 }} onClick={handleClose}>
            <div
                className="modal-sheet"
                style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto mb-5" />
                <h2 className="text-text-primary font-display font-bold text-lg mb-5">
                    {editing ? 'Editar Deuda' : 'Nueva Deuda'}
                </h2>

                <div className="flex gap-2 mb-4">
                    {(['owe', 'owed'] as const).map((d) => (
                        <button
                            key={d}
                            onClick={() => setDirection(d)}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                            style={{
                                background: direction === d
                                    ? d === 'owe' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'
                                    : 'var(--bg-elevated)',
                                color: direction === d
                                    ? d === 'owe' ? '#EF4444' : '#10B981'
                                    : '#94A3B8',
                                border: `1px solid ${direction === d ? (d === 'owe' ? '#EF4444' : '#10B981') : 'transparent'}33`,
                            }}
                        >
                            {d === 'owe' ? '😬 Yo debo' : '💰 Me deben'}
                        </button>
                    ))}
                </div>

                <p className="text-text-muted text-xs font-semibold tracking-widest mb-2">
                    {direction === 'owe' ? 'A QUIÉN LE DEBO' : 'QUIÉN ME DEBE'}
                </p>
                <input
                    className="input-field mb-3"
                    placeholder="Nombre de la persona"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                />

                <p className="text-text-muted text-xs font-semibold tracking-widest mb-2">CONCEPTO</p>
                <input
                    className="input-field mb-3"
                    placeholder="¿Por qué es la deuda?"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                <p className="text-text-muted text-xs font-semibold tracking-widest mb-2">MONTO</p>
                <input
                    className="input-field mb-3"
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />

                <p className="text-text-muted text-xs font-semibold tracking-widest mb-2">CATEGORÍA</p>
                <div className="flex flex-wrap gap-2 mb-3">
                    {CATEGORIES.map((c) => (
                        <button
                            key={c.key}
                            onClick={() => setCategory(c.key)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                            style={{
                                background: category === c.key ? 'rgba(79,124,255,0.2)' : 'var(--bg-elevated)',
                                color: category === c.key ? '#4F7CFF' : '#94A3B8',
                                border: `1px solid ${category === c.key ? '#4F7CFF' : 'transparent'}44`,
                            }}
                        >
                            {c.icon} {c.label}
                        </button>
                    ))}
                </div>

                <p className="text-text-muted text-xs font-semibold tracking-widest mb-2">FECHA LÍMITE (opcional)</p>
                <input
                    className="input-field mb-3"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                />

                {/* Alerta de vencimiento — solo si hay fecha */}
                {dueDate && (
                    <div className="p-3 rounded-xl mb-3" style={{ background: 'var(--bg-elevated)' }}>
                        <p className="text-text-primary text-sm font-medium mb-1">⏰ Alertar antes de vencer</p>
                        <p className="text-text-muted text-xs mb-3">Recibirás una alerta en la app este número de días antes de la fecha límite.</p>
                        <div className="flex gap-2">
                            {[1, 3, 7, 14].map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setAlertDays(d)}
                                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                                    style={{
                                        background: alertDays === d ? 'rgba(79,124,255,0.2)' : 'var(--bg-card)',
                                        color: alertDays === d ? '#4F7CFF' : '#94A3B8',
                                        border: `1px solid ${alertDays === d ? '#4F7CFF44' : 'transparent'}`,
                                    }}
                                >
                                    {d}d
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <p className="text-text-muted text-xs font-semibold tracking-widest mb-2">NOTA (opcional)</p>
                <input
                    className="input-field mb-5"
                    placeholder="Detalles adicionales..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />

                <div className="flex gap-3">
                    <button className="btn-secondary flex-1" onClick={handleClose}>Cancelar</button>
                    <button
                        className="btn-primary flex-1"
                        onClick={handleSave}
                        disabled={saving || !amount || !personName || !title}
                        style={{ opacity: (!amount || !personName || !title) ? 0.5 : 1 }}
                    >
                        {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Agregar'}
                    </button>
                </div>
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
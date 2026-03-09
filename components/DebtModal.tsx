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
    const [note, setNote] = useState(editing?.note ?? '');
    const [category, setCategory] = useState<CategoryKey>(editing?.category ?? 'services');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        const num = parseFloat(amount);
        if (!num || !personName.trim() || !title.trim()) return;
        setSaving(true);
        const payload: Omit<Debt, 'id'> = {
            title: title.trim(),
            personName: personName.trim(),
            amount: num,
            paidAmount: editing?.paidAmount ?? 0,
            direction,
            dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
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
        <div
            className="modal-overlay"
            style={{ zIndex: 100 }}
            onClick={() => onClose()}
        >
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

                <p className="text-text-muted text-xs font-semibold tracking-widest mb-2">NOTA (opcional)</p>
                <input
                    className="input-field mb-5"
                    placeholder="Detalles adicionales..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />

                <div className="flex gap-3">
                    <button className="btn-secondary flex-1" onClick={() => onClose()}>Cancelar</button>
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
        </div>
    );
}
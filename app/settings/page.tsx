'use client';

import { useState, useEffect } from 'react';
import { useFinance } from '@/lib/context';
import { formatCurrency } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';

const CATEGORY_LABELS: Record<string, string> = {
  rent: '🏠 Renta/Vivienda',
  food: '🍽️ Comida',
  transport: '🚗 Transporte',
  savings: '🏦 Ahorro',
  entertainment: '🎮 Entretenimiento',
  services: '⚡ Servicios',
};

export default function SettingsPage() {
  const { settings, updateSettings } = useFinance();
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [currency, setCurrency] = useState('MXN');
  const [allocations, setAllocations] = useState({
    rent: 40, food: 20, transport: 10, savings: 20, entertainment: 5, services: 5,
  });
  const [payDay, setPayDay] = useState(1);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setName(settings.name);
      setIncome(settings.monthlyIncome.toString());
      setCurrency(settings.currency);
      setAllocations(settings.budgetAllocations);
      setPayDay(settings.payDay ?? 1);
    }
  }, [settings]);

  const totalPct = Object.values(allocations).reduce((s, v) => s + v, 0);

  const handleSave = async () => {
    await updateSettings({
      name,
      monthlyIncome: parseFloat(income) || 0,
      payDay,
      budgetAllocations: allocations,
      currency,
      notificationsEnabled: true,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-screen overflow-y-auto pb-28">
      <div
        className="px-5 pb-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <h1 className="text-text-primary font-display font-bold text-lg">Configuración</h1>
      </div>

      {/* Profile */}
      <section className="px-5 mb-5">
        <p className="text-text-muted text-xs font-semibold tracking-widest mb-3">PERFIL</p>
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
              style={{ background: 'linear-gradient(135deg, #4F7CFF, #8B5CF6)' }}
            >
              {name.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-text-primary font-display font-semibold">{name || 'Usuario'}</p>
              <p className="text-text-muted text-xs">Miembro de FinanceApp</p>
            </div>
          </div>
          <input
            className="input-field"
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </section>

      {/* Income */}
      <section className="px-5 mb-5">
        <p className="text-text-muted text-xs font-semibold tracking-widest mb-3">INGRESOS</p>
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-text-secondary text-sm mb-3">Ingreso mensual total</p>
          <input
            className="input-field mb-3"
            type="number"
            placeholder="Ej: 12000"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            inputMode="decimal"
          />
          <div className="flex gap-2">
            {['MXN', 'USD', 'EUR'].map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: currency === c ? 'rgba(79,124,255,0.15)' : 'var(--bg-elevated)',
                  color: currency === c ? '#4F7CFF' : '#94A3B8',
                  border: `1px solid ${currency === c ? '#4F7CFF' : 'transparent'}`,
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-text-secondary text-sm mb-2">
              📅 Día en que te pagan
            </p>
            <p className="text-text-muted text-xs mb-3">
              Usado para calcular desde qué día contar tus finanzas del ciclo actual.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={31}
                value={payDay}
                onChange={(e) => setPayDay(parseInt(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #4F7CFF ${((payDay - 1) / 30) * 100}%, var(--bg-elevated) ${((payDay - 1) / 30) * 100}%)`,
                }}
              />
              <div
                className="w-14 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm flex-shrink-0"
                style={{ background: 'rgba(79,124,255,0.15)', color: '#4F7CFF' }}
              >
                Día {payDay}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Budget Allocations */}
      <section className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-text-muted text-xs font-semibold tracking-widest">PRESUPUESTO</p>
          <span
            className="text-xs font-semibold"
            style={{ color: totalPct === 100 ? '#10B981' : '#EF4444' }}
          >
            {totalPct}% / 100%
          </span>
        </div>
        <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'var(--bg-card)' }}>
          {Object.entries(allocations).map(([key, val]) => {
            const budgetAmt = parseFloat(income) ? (parseFloat(income) * val) / 100 : 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-text-primary text-sm">{CATEGORY_LABELS[key] ?? key}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted text-xs">
                      {budgetAmt > 0 ? formatCurrency(budgetAmt, currency) : ''}
                    </span>
                    <span className="text-accent-blue font-bold text-sm w-8 text-right">{val}%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={val}
                  onChange={(e) =>
                    setAllocations((prev) => ({ ...prev, [key]: parseInt(e.target.value) }))
                  }
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #4F7CFF ${(val / 60) * 100}%, var(--bg-elevated) ${(val / 60) * 100}%)`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Save button */}
      <div className="px-5">
        <button
          className="btn-primary"
          onClick={handleSave}
          style={{
            background: saved
              ? 'linear-gradient(135deg, #10B981, #06B6D4)'
              : undefined,
          }}
        >
          {saved ? '✓ Guardado!' : '💾 Guardar Cambios'}
        </button>
      </div>

      {/* App Info */}
      <div className="px-5 mt-6 mb-4 text-center">
        <p className="text-text-muted text-xs">FinanceApp v1.0.0 · Datos guardados localmente</p>
        <p className="text-text-muted text-xs mt-1">
          🔒 Tu información nunca sale de tu dispositivo
        </p>
      </div>

      <BottomNav />
    </div>
  );
}

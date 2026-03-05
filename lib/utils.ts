import { CategoryKey } from './db';

// ─── Currency ─────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(2)}`;
}

// ─── Date ─────────────────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

  if (diff === 0) return `Hoy, ${date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
  if (diff === -1) return `Ayer, ${date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
  if (diff === 1) return 'Mañana';
  if (diff > 1 && diff <= 7) return `En ${Math.round(diff)} días`;

  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getMonthName(month: number): string {
  return new Date(2000, month, 1).toLocaleString('es-MX', { month: 'long' });
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const CATEGORY_CONFIG: Record<
  CategoryKey,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  food: {
    label: 'Comida',
    icon: '🍽️',
    color: '#F97316',
    bgColor: 'rgba(249,115,22,0.15)',
  },
  transport: {
    label: 'Transporte',
    icon: '🚗',
    color: '#4F7CFF',
    bgColor: 'rgba(79,124,255,0.15)',
  },
  rent: {
    label: 'Renta',
    icon: '🏠',
    color: '#8B5CF6',
    bgColor: 'rgba(139,92,246,0.15)',
  },
  entertainment: {
    label: 'Entretenimiento',
    icon: '🎮',
    color: '#EC4899',
    bgColor: 'rgba(236,72,153,0.15)',
  },
  savings: {
    label: 'Ahorro',
    icon: '🏦',
    color: '#10B981',
    bgColor: 'rgba(16,185,129,0.15)',
  },
  services: {
    label: 'Servicios',
    icon: '⚡',
    color: '#06B6D4',
    bgColor: 'rgba(6,182,212,0.15)',
  },
  income: {
    label: 'Ingreso',
    icon: '💰',
    color: '#10B981',
    bgColor: 'rgba(16,185,129,0.15)',
  },
  other: {
    label: 'Otros',
    icon: '📦',
    color: '#94A3B8',
    bgColor: 'rgba(148,163,184,0.15)',
  },
};

// ─── Percentage / Stats ───────────────────────────────────────────────────────

export function calcPercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function calcMonthlyTarget(
  targetAmount: number,
  currentAmount: number,
  deadlineStr: string
): number {
  const now = new Date();
  const deadline = new Date(deadlineStr);
  const monthsLeft =
    (deadline.getFullYear() - now.getFullYear()) * 12 +
    (deadline.getMonth() - now.getMonth());
  if (monthsLeft <= 0) return targetAmount - currentAmount;
  return Math.ceil((targetAmount - currentAmount) / monthsLeft);
}

// ─── Class merging ────────────────────────────────────────────────────────────

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

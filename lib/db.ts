import { openDB, DBSchema, IDBPDatabase } from 'idb';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CategoryKey =
  | 'food'
  | 'transport'
  | 'rent'
  | 'entertainment'
  | 'savings'
  | 'services'
  | 'income'
  | 'other';

export type ActivityType = 'important' | 'leisure';
export type TransactionType = 'expense' | 'income';
export type GoalStatus = 'active' | 'completed' | 'archived' | 'cancelled';

export interface Transaction {
  id?: number;
  type: TransactionType;
  amount: number;
  category: CategoryKey;
  description: string;
  note?: string;
  date: string; // ISO string
  activityType?: ActivityType;
  isRecurring?: boolean;
  recurringDay?: number; // day of month
  linkedEventId?: number;  // si viene de un evento de agenda
  linkedGoalId?: number;   // si viene de un abono a meta
  linkedDebtId?: number;   // si viene de un pago de deuda
}

export interface ScheduledEvent {
  id?: number;
  title: string;
  amount: number;
  category: CategoryKey;
  dueDate: string; // ISO string
  activityType: ActivityType;
  isRecurring: boolean;
  recurringMonthly?: boolean;
  status: 'pending' | 'paid' | 'cancelled';
  note?: string;
}

export interface SavingsGoal {
  id?: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // ISO string
  status: GoalStatus;
  color?: string;
  icon?: string;
  note?: string;
  createdAt: string;
  completedCycleKey?: string;   // ciclo en que se completó
  cancelledCycleKey?: string;   // ciclo en que se canceló
  cancelledAt?: string;         // cuándo se canceló
  cancelReason?: string;        // motivo de cancelación
  refundAmount?: number;        // monto devuelto al cancelar
  deletedWithRefund?: boolean;  // legacy
  deletedNote?: string;         // legacy
  deletedAt?: string;           // legacy
}

export interface UserSettings {
  id?: number;
  name: string;
  monthlyIncome: number;
  payDay: number;
  budgetAllocations: {
    food: number;
    transport: number;
    rent: number;
    entertainment: number;
    savings: number;
    services: number;
  };
  currency: string;
  notificationsEnabled: boolean;
  email?: string;
  theme?: 'dark' | 'rose';
}

export type DebtDirection = 'owe' | 'owed'; // 'owe' = yo debo, 'owed' = me deben

export interface Debt {
  id?: number;
  title: string;
  personName: string;
  amount: number;
  paidAmount: number;
  direction: DebtDirection;
  dueDate?: string;
  alertDays?: number;  // días antes del vencimiento para alertar (ej: 3, 7)
  note?: string;
  status: 'active' | 'settled';
  createdAt: string;
  category: CategoryKey;
  settledCycleKey?: string;
  settledAt?: string;
}

export interface CycleNote {
  id?: number;
  cycleKey: string; // e.g. '2025-02-15' (cycleStart ISO date sliced to 10)
  content: string;
  updatedAt: string;
}

export interface Alert {
  id?: number;
  type: 'budget' | 'reminder' | 'goal' | 'prediction';
  title: string;
  message: string;
  icon?: string;
  color?: string;
  createdAt: string;
  isRead: boolean;
  linkedId?: number;
}

// ─── DB Schema ────────────────────────────────────────────────────────────────

interface FinanceDB extends DBSchema {
  transactions: {
    key: number;
    value: Transaction;
    indexes: {
      'by-date': string;
      'by-category': CategoryKey;
      'by-type': TransactionType;
    };
  };
  scheduledEvents: {
    key: number;
    value: ScheduledEvent;
    indexes: {
      'by-date': string;
      'by-status': string;
    };
  };
  savingsGoals: {
    key: number;
    value: SavingsGoal;
    indexes: {
      'by-status': GoalStatus;
    };
  };
  userSettings: {
    key: number;
    value: UserSettings;
  };
  alerts: {
    key: number;
    value: Alert;
    indexes: {
      'by-read': string;
    };
  };
  debts: {
    key: number;
    value: Debt;
    indexes: {
      'by-status': string;
      'by-direction': DebtDirection;
    };
  };
  cycleNotes: {
    key: number;
    value: CycleNote;
    indexes: {
      'by-cycle': string;
    };
  };
}

// ─── DB Instance ──────────────────────────────────────────────────────────────

let db: IDBPDatabase<FinanceDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<FinanceDB>> {
  if (db) return db;

  db = await openDB<FinanceDB>('finance-app-db', 2, {
    upgrade(database, oldVersion) {
      // ── v1 stores (solo crear si no existen) ──
      if (oldVersion < 1) {
        const txStore = database.createObjectStore('transactions', {
          keyPath: 'id',
          autoIncrement: true,
        });
        txStore.createIndex('by-date', 'date');
        txStore.createIndex('by-category', 'category');
        txStore.createIndex('by-type', 'type');

        const evStore = database.createObjectStore('scheduledEvents', {
          keyPath: 'id',
          autoIncrement: true,
        });
        evStore.createIndex('by-date', 'dueDate');
        evStore.createIndex('by-status', 'status');

        const goalsStore = database.createObjectStore('savingsGoals', {
          keyPath: 'id',
          autoIncrement: true,
        });
        goalsStore.createIndex('by-status', 'status');

        database.createObjectStore('userSettings', {
          keyPath: 'id',
          autoIncrement: true,
        });

        const alertStore = database.createObjectStore('alerts', {
          keyPath: 'id',
          autoIncrement: true,
        });
        alertStore.createIndex('by-read', 'isRead');
      }

      // ── v2 stores (nuevos) ──
      if (oldVersion < 2) {
        const debtStore = database.createObjectStore('debts', {
          keyPath: 'id',
          autoIncrement: true,
        });
        debtStore.createIndex('by-status', 'status');
        debtStore.createIndex('by-direction', 'direction');

        const noteStore = database.createObjectStore('cycleNotes', {
          keyPath: 'id',
          autoIncrement: true,
        });
        noteStore.createIndex('by-cycle', 'cycleKey');
      }
    },
  });

  return db;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function addTransaction(tx: Omit<Transaction, 'id'>): Promise<number> {
  const database = await getDB();
  return database.add('transactions', tx as Transaction);
}

export async function getTransactions(): Promise<Transaction[]> {
  const database = await getDB();
  const all = await database.getAll('transactions');
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getTransactionsByMonth(year: number, month: number): Promise<Transaction[]> {
  const all = await getTransactions();
  return all.filter((tx) => {
    const d = new Date(tx.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

// ─── Ciclo de pago (payDay al siguiente payDay) ────────────────────────────────

/**
 * Dado el día de hoy, calcula el inicio y fin del ciclo de pago actual.
 * Ejemplo payDay=15, hoy=20 Feb → cycleStart=15 Feb, cycleEnd=14 Mar
 * Ejemplo payDay=15, hoy=10 Feb → cycleStart=15 Ene, cycleEnd=14 Feb
 */
export function getCurrentCycleDates(payDay: number): { cycleStart: Date; cycleEnd: Date } {
  const now = new Date();
  const today = now.getDate();
  let cycleStart: Date;
  let cycleEnd: Date;

  if (today >= payDay) {
    // El ciclo empezó este mes en payDay
    cycleStart = new Date(now.getFullYear(), now.getMonth(), payDay, 0, 0, 0, 0);
    // Termina el día antes de payDay del mes siguiente
    cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, payDay - 1, 23, 59, 59, 999);
  } else {
    // El ciclo empezó el mes pasado en payDay
    cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, payDay, 0, 0, 0, 0);
    cycleEnd = new Date(now.getFullYear(), now.getMonth(), payDay - 1, 23, 59, 59, 999);
  }

  return { cycleStart, cycleEnd };
}

/**
 * Calcula el inicio y fin del ciclo de pago ANTERIOR al actual.
 */
export function getPreviousCycleDates(payDay: number): { cycleStart: Date; cycleEnd: Date } {
  const { cycleStart } = getCurrentCycleDates(payDay);
  // El ciclo anterior termina el día antes del inicio del actual
  const prevCycleEnd = new Date(cycleStart.getTime() - 1);
  const prevCycleStart = new Date(prevCycleEnd.getFullYear(), prevCycleEnd.getMonth() - 1 + (prevCycleEnd.getDate() >= payDay ? 0 : -1) + (prevCycleEnd.getDate() >= payDay ? 1 : 0), payDay, 0, 0, 0, 0);

  // Simplificado: un mes antes del cycleStart
  const pStart = new Date(cycleStart.getFullYear(), cycleStart.getMonth() - 1, payDay, 0, 0, 0, 0);
  const pEnd = new Date(cycleStart.getTime() - 1);
  return { cycleStart: pStart, cycleEnd: pEnd };
}

export async function getTransactionsByCycle(payDay: number): Promise<Transaction[]> {
  const all = await getTransactions();
  const { cycleStart, cycleEnd } = getCurrentCycleDates(payDay);
  return all.filter((tx) => {
    const d = new Date(tx.date);
    return d >= cycleStart && d <= cycleEnd;
  });
}

export async function getTransactionsByPreviousCycle(payDay: number): Promise<Transaction[]> {
  const all = await getTransactions();
  const { cycleStart, cycleEnd } = getPreviousCycleDates(payDay);
  return all.filter((tx) => {
    const d = new Date(tx.date);
    return d >= cycleStart && d <= cycleEnd;
  });
}

export async function deleteTransaction(id: number): Promise<void> {
  const database = await getDB();
  await database.delete('transactions', id);
}

export async function updateTransaction(tx: Transaction): Promise<void> {
  const database = await getDB();
  await database.put('transactions', tx);
}

export async function deleteTransactionByLinkedEvent(eventId: number): Promise<void> {
  const all = await getTransactions();
  const match = all.find((t) => t.linkedEventId === eventId);
  if (match?.id) {
    const database = await getDB();
    await database.delete('transactions', match.id);
  }
}

export async function deleteTransactionByLinkedGoal(goalId: number, amount: number): Promise<void> {
  const all = await getTransactions();
  // Encuentra el abono más reciente con ese goalId y ese monto
  const match = all.find((t) => t.linkedGoalId === goalId && t.amount === amount);
  if (match?.id) {
    const database = await getDB();
    await database.delete('transactions', match.id);
  }
}

export async function deleteAllTransactionsByLinkedGoal(goalId: number): Promise<void> {
  const all = await getTransactions();
  const matches = all.filter((t) => t.linkedGoalId === goalId);
  const database = await getDB();
  for (const t of matches) {
    if (t.id) await database.delete('transactions', t.id);
  }
}

export async function deleteTransactionsByLinkedDebt(debtId: number): Promise<void> {
  const all = await getTransactions();
  const matches = all.filter((t) => t.linkedDebtId === debtId);
  const database = await getDB();
  for (const t of matches) {
    if (t.id) await database.delete('transactions', t.id);
  }
}

// ─── Scheduled Events ─────────────────────────────────────────────────────────

export async function addScheduledEvent(event: Omit<ScheduledEvent, 'id'>): Promise<number> {
  const database = await getDB();
  return database.add('scheduledEvents', event as ScheduledEvent);
}

export async function getScheduledEvents(): Promise<ScheduledEvent[]> {
  const database = await getDB();
  const all = await database.getAll('scheduledEvents');
  return all.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export async function getEventsByDate(dateStr: string): Promise<ScheduledEvent[]> {
  const all = await getScheduledEvents();
  return all.filter((e) => e.dueDate.startsWith(dateStr));
}

export async function updateScheduledEvent(event: ScheduledEvent): Promise<void> {
  const database = await getDB();
  await database.put('scheduledEvents', event);
}

export async function deleteScheduledEvent(id: number): Promise<void> {
  const database = await getDB();
  await database.delete('scheduledEvents', id);
}

// ─── Savings Goals ────────────────────────────────────────────────────────────

export async function addSavingsGoal(goal: Omit<SavingsGoal, 'id'>): Promise<number> {
  const database = await getDB();
  return database.add('savingsGoals', goal as SavingsGoal);
}

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const database = await getDB();
  return database.getAll('savingsGoals');
}

export async function updateSavingsGoal(goal: SavingsGoal): Promise<void> {
  const database = await getDB();
  await database.put('savingsGoals', goal);
}

export async function deleteSavingsGoal(id: number): Promise<void> {
  const database = await getDB();
  await database.delete('savingsGoals', id);
}

// ─── User Settings ────────────────────────────────────────────────────────────

export async function getUserSettings(): Promise<UserSettings | null> {
  const database = await getDB();
  const all = await database.getAll('userSettings');
  return all[0] ?? null;
}

export async function saveUserSettings(settings: Omit<UserSettings, 'id'>): Promise<void> {
  const database = await getDB();
  const existing = await getUserSettings();
  if (existing?.id) {
    await database.put('userSettings', { ...settings, id: existing.id });
  } else {
    await database.add('userSettings', settings as UserSettings);
  }
}

export const DEFAULT_SETTINGS: Omit<UserSettings, 'id'> = {
  name: 'Usuario',
  monthlyIncome: 12000,
  payDay: 1,
  budgetAllocations: {
    rent: 40,
    food: 20,
    transport: 10,
    savings: 20,
    entertainment: 5,
    services: 5,
  },
  currency: 'MXN',
  notificationsEnabled: true,
};

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function addAlert(alert: Omit<Alert, 'id'>): Promise<number> {
  const database = await getDB();
  return database.add('alerts', alert as Alert);
}

export async function getAlerts(): Promise<Alert[]> {
  const database = await getDB();
  const all = await database.getAll('alerts');
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function markAlertRead(id: number): Promise<void> {
  const database = await getDB();
  const alert = await database.get('alerts', id);
  if (alert) {
    await database.put('alerts', { ...alert, isRead: true });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function getMonthSummary(year: number, month: number) {
  const settings = await getUserSettings();
  const payDay = settings?.payDay ?? 1;
  const monthlyIncome = settings?.monthlyIncome ?? 12000;

  // Transacciones del ciclo actual (desde payDay hasta el siguiente payDay-1)
  const transactions = await getTransactionsByCycle(payDay);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  const byCategory: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

  // Calcular sobrante del ciclo anterior
  const prevTransactions = await getTransactionsByPreviousCycle(payDay);
  const prevIncome = prevTransactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const prevExpenses = prevTransactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const prevRollover = Math.max(0, monthlyIncome + prevIncome - prevExpenses);

  // Saldo disponible = ingreso mensual + ingresos extra + sobrante anterior - gastos actuales
  const available = monthlyIncome + totalIncome + prevRollover - totalExpenses;

  // Fechas del ciclo para mostrar en UI
  const { cycleStart, cycleEnd } = getCurrentCycleDates(payDay);

  return {
    totalIncome,
    totalExpenses,
    available,
    byCategory,
    monthlyIncome,
    prevRollover,
    cycleStart: cycleStart.toISOString(),
    cycleEnd: cycleEnd.toISOString(),
    payDay,
  };
}

export function predictRunOutDay(
  totalExpenses: number,
  monthlyIncome: number,
  currentDay: number,
  payDay: number = 1,
  year?: number,
  month?: number
): number | null {
  if (currentDay === 0 || totalExpenses === 0) return null;

  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  // Días transcurridos desde el día de pago hasta hoy
  let daysElapsed: number;
  if (currentDay >= payDay) {
    daysElapsed = currentDay - payDay + 1;
  } else {
    // Aún no ha llegado el día de pago este mes, contar desde el mes anterior
    const daysInPrevMonth = new Date(y, m, 0).getDate();
    daysElapsed = daysInPrevMonth - payDay + currentDay + 1;
  }

  if (daysElapsed <= 0) return null;

  const dailyRate = totalExpenses / daysElapsed;
  if (dailyRate === 0) return null;

  // Día del mes en que se agota el dinero
  const daysCanSustain = Math.floor(monthlyIncome / dailyRate);
  const runOutDay = payDay + daysCanSustain - 1;

  // Si supera los días del mes, no se acaba este mes
  if (runOutDay > daysInMonth) return null;

  return Math.min(runOutDay, daysInMonth);
}

// ─── Debts ────────────────────────────────────────────────────────────────────

export async function addDebt(debt: Omit<Debt, 'id'>): Promise<number> {
  const database = await getDB();
  return database.add('debts', debt as Debt);
}

export async function getDebts(): Promise<Debt[]> {
  const database = await getDB();
  const all = await database.getAll('debts');
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateDebt(debt: Debt): Promise<void> {
  const database = await getDB();
  await database.put('debts', debt);
}

export async function deleteDebt(id: number): Promise<void> {
  const database = await getDB();
  await database.delete('debts', id);
}

// ─── Cycle Notes ──────────────────────────────────────────────────────────────

export async function getCycleNote(cycleKey: string): Promise<CycleNote | null> {
  const database = await getDB();
  const all = await database.getAll('cycleNotes');
  return all.find((n) => n.cycleKey === cycleKey) ?? null;
}

export async function saveCycleNote(cycleKey: string, content: string): Promise<void> {
  const database = await getDB();
  const all = await database.getAll('cycleNotes');
  const existing = all.find((n) => n.cycleKey === cycleKey);
  if (existing?.id) {
    await database.put('cycleNotes', { ...existing, content, updatedAt: new Date().toISOString() });
  } else {
    await database.add('cycleNotes', { cycleKey, content, updatedAt: new Date().toISOString() } as CycleNote);
  }
}

export async function getAllCycleNotes(): Promise<CycleNote[]> {
  const database = await getDB();
  return database.getAll('cycleNotes');
}

// ─── Cycle history for charts ─────────────────────────────────────────────────

export async function getLastNCycles(n: number): Promise<{ cycleKey: string; label: string; totalExpenses: number; totalIncome: number; byCategory: Record<string, number> }[]> {
  const settings = await getUserSettings();
  const payDay = settings?.payDay ?? 1;
  const all = await getTransactions();
  const results = [];

  for (let i = 0; i < n; i++) {
    const now = new Date();
    // Calcular inicio de cada ciclo pasado
    let cycleStartMonth = now.getMonth() - i;
    let cycleStartYear = now.getFullYear();
    while (cycleStartMonth < 0) { cycleStartMonth += 12; cycleStartYear--; }

    const cycleStart = new Date(cycleStartYear, cycleStartMonth, payDay, 0, 0, 0, 0);
    const cycleEnd = new Date(cycleStartYear, cycleStartMonth + 1, payDay - 1, 23, 59, 59, 999);

    const txs = all.filter((tx) => {
      const d = new Date(tx.date);
      return d >= cycleStart && d <= cycleEnd;
    });

    const totalExpenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const totalIncome = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const byCategory: Record<string, number> = {};
    txs.filter((t) => t.type === 'expense').forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

    const label = cycleStart.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
    results.push({ cycleKey: cycleStart.toISOString().slice(0, 10), label, totalExpenses, totalIncome, byCategory });
  }

  return results.reverse();
}

// ─── Export / Backup ──────────────────────────────────────────────────────────

export async function exportAllDataAsJSON(): Promise<string> {
  const [transactions, events, goals, settings, alerts, debts, notes] = await Promise.all([
    getTransactions(),
    getScheduledEvents(),
    getSavingsGoals(),
    getUserSettings(),
    getAlerts(),
    getDebts(),
    getAllCycleNotes(),
  ]);
  return JSON.stringify({ transactions, events, goals, settings, alerts, debts, notes, exportedAt: new Date().toISOString() }, null, 2);
}
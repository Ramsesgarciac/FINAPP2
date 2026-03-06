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
export type GoalStatus = 'active' | 'completed' | 'archived';

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
}

export interface UserSettings {
  id?: number;
  name: string;
  monthlyIncome: number;
  payDay: number;
  email: string;
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
}

// ─── DB Instance ──────────────────────────────────────────────────────────────

let db: IDBPDatabase<FinanceDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<FinanceDB>> {
  if (db) return db;

  db = await openDB<FinanceDB>('finance-app-db', 1, {
    upgrade(database) {
      // Transactions
      const txStore = database.createObjectStore('transactions', {
        keyPath: 'id',
        autoIncrement: true,
      });
      txStore.createIndex('by-date', 'date');
      txStore.createIndex('by-category', 'category');
      txStore.createIndex('by-type', 'type');

      // Scheduled Events
      const evStore = database.createObjectStore('scheduledEvents', {
        keyPath: 'id',
        autoIncrement: true,
      });
      evStore.createIndex('by-date', 'dueDate');
      evStore.createIndex('by-status', 'status');

      // Savings Goals
      const goalsStore = database.createObjectStore('savingsGoals', {
        keyPath: 'id',
        autoIncrement: true,
      });
      goalsStore.createIndex('by-status', 'status');

      // User Settings
      database.createObjectStore('userSettings', {
        keyPath: 'id',
        autoIncrement: true,
      });

      // Alerts
      const alertStore = database.createObjectStore('alerts', {
        keyPath: 'id',
        autoIncrement: true,
      });
      alertStore.createIndex('by-read', 'isRead');
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
  email: '',
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

// ─── Export para respaldo ──────────────────────────────────────────────────────

export async function exportAllDataAsJSON(): Promise<string> {
  const [transactions, events, goals, settings] = await Promise.all([
    getTransactions(),
    getScheduledEvents(),
    getSavingsGoals(),
    getUserSettings(),
  ]);

  const backup = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    settings,
    transactions,
    scheduledEvents: events,
    savingsGoals: goals,
  };

  return JSON.stringify(backup, null, 2);
}

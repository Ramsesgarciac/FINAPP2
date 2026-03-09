'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Transaction,
  ScheduledEvent,
  SavingsGoal,
  UserSettings,
  Alert,
  getTransactions,
  getScheduledEvents,
  getSavingsGoals,
  getUserSettings,
  getAlerts,
  saveUserSettings,
  DEFAULT_SETTINGS,
  addTransaction,
  deleteTransaction,
  addScheduledEvent,
  deleteScheduledEvent,
  updateScheduledEvent,
  addSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  addAlert,
  markAlertRead,
  getMonthSummary,
  predictRunOutDay,
  deleteTransactionByLinkedEvent,
  deleteTransactionByLinkedGoal,
  getCurrentCycleDates,
  Debt,
  CycleNote,
  addDebt,
  getDebts,
  updateDebt,
  deleteDebt,
  getCycleNote,
  saveCycleNote,
  updateTransaction,
} from './db';

interface MonthSummary {
  totalIncome: number;
  totalExpenses: number;
  available: number;
  byCategory: Record<string, number>;
  monthlyIncome: number;
  prevRollover: number;
  cycleStart: string;
  cycleEnd: string;
  payDay: number;
}

interface FinanceContextType {
  // Data
  transactions: Transaction[];
  scheduledEvents: ScheduledEvent[];
  savingsGoals: SavingsGoal[];
  settings: UserSettings | null;
  alerts: Alert[];
  monthSummary: MonthSummary | null;
  runOutDay: number | null;
  isLoading: boolean;

  // Actions
  refreshAll: () => Promise<void>;
  addNewTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  removeTransaction: (id: number) => Promise<void>;
  addNewEvent: (event: Omit<ScheduledEvent, 'id'>) => Promise<void>;
  removeEvent: (id: number) => Promise<void>;
  updateEvent: (event: ScheduledEvent) => Promise<void>;
  addNewGoal: (goal: Omit<SavingsGoal, 'id'>) => Promise<void>;
  updateGoal: (goal: SavingsGoal) => Promise<void>;
  removeGoal: (id: number) => Promise<void>;
  updateSettings: (s: Omit<UserSettings, 'id'>) => Promise<void>;
  dismissAlert: (id: number) => Promise<void>;
  unreadAlertCount: number;
  // Debts
  debts: Debt[];
  addNewDebt: (debt: Omit<Debt, 'id'>) => Promise<void>;
  editDebt: (debt: Debt) => Promise<void>;
  removeDebt: (id: number) => Promise<void>;
  // Transactions edit
  editTransaction: (tx: import('./db').Transaction) => Promise<void>;
  // Cycle notes
  cycleNote: string;
  saveCycleNoteContent: (content: string) => Promise<void>;
  // Theme
  theme: 'dark' | 'rose';
  setTheme: (t: 'dark' | 'rose') => void;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);
  const [runOutDay, setRunOutDay] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [cycleNote, setCycleNote] = useState<string>('');
  const [theme, setThemeState] = useState<'dark' | 'rose'>('dark');

  const refreshAll = useCallback(async () => {
    const now = new Date();
    const [txs, events, goals, cfg, als, summary, dbs] = await Promise.all([
      getTransactions(),
      getScheduledEvents(),
      getSavingsGoals(),
      getUserSettings(),
      getAlerts(),
      getMonthSummary(now.getFullYear(), now.getMonth()), // payDay handled internally
      getDebts(),
    ]);

    setTransactions(txs);
    setScheduledEvents(events);
    setSavingsGoals(goals);
    setSettings(cfg);
    setAlerts(als);
    setMonthSummary(summary);
    setDebts(dbs);

    // Load cycle note for current cycle
    const { cycleStart } = getCurrentCycleDates(cfg?.payDay ?? 1);
    const noteKey = cycleStart.toISOString().slice(0, 10);
    const note = await getCycleNote(noteKey);
    setCycleNote(note?.content ?? '');

    // Load theme from settings
    if (cfg?.theme) setThemeState(cfg.theme);

    const runOut = predictRunOutDay(
      summary.totalExpenses,
      summary.monthlyIncome,
      now.getDate(),
      cfg?.payDay ?? 1,
      now.getFullYear(),
      now.getMonth()
    );
    setRunOutDay(runOut);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const existingSettings = await getUserSettings();
      if (!existingSettings) {
        await saveUserSettings(DEFAULT_SETTINGS);
      }
      await refreshAll();
    })();
  }, [refreshAll]);

  // Smart alerts generation
  useEffect(() => {
    if (!monthSummary || !settings) return;
    const generateAlerts = async () => {
      const now = new Date();
      const allAlerts = await getAlerts();

      // Budget alerts
      const budgets = settings.budgetAllocations;
      const categories = Object.keys(budgets) as (keyof typeof budgets)[];
      for (const cat of categories) {
        const budget = (settings.monthlyIncome * (budgets[cat] || 0)) / 100;
        const spent = monthSummary.byCategory[cat] || 0;
        const pct = budget > 0 ? (spent / budget) * 100 : 0;
        if (pct >= 80 && pct < 100) {
          const exists = allAlerts.find(
            (a) =>
              a.type === 'budget' &&
              a.linkedId === 0 &&
              a.message.includes(cat) &&
              new Date(a.createdAt).getMonth() === now.getMonth()
          );
          if (!exists) {
            await addAlert({
              type: 'budget',
              title: `80% del presupuesto de ${cat}`,
              message: `Has gastado $${spent.toFixed(0)} de $${budget.toFixed(0)} en ${cat}.`,
              icon: '⚠️',
              color: '#F97316',
              createdAt: now.toISOString(),
              isRead: false,
              linkedId: 0,
            });
          }
        }
      }

      // Upcoming payment reminders (within 3 days)
      for (const event of scheduledEvents) {
        if (event.status !== 'pending') continue;
        const daysUntil = Math.ceil(
          (new Date(event.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntil >= 0 && daysUntil <= 3) {
          const exists = allAlerts.find(
            (a) => a.type === 'reminder' && a.linkedId === event.id
          );
          if (!exists) {
            await addAlert({
              type: 'reminder',
              title: `Vence ${daysUntil === 0 ? 'hoy' : `en ${daysUntil} día(s)`}: ${event.title}`,
              message: `$${event.amount.toFixed(2)} pendiente de pago.`,
              icon: '🔔',
              color: '#4F7CFF',
              createdAt: now.toISOString(),
              isRead: false,
              linkedId: event.id,
            });
          }
        }
      }
    };
    generateAlerts().catch(console.error);
  }, [monthSummary, settings, scheduledEvents]);

  const unreadAlertCount = alerts.filter((a) => !a.isRead).length;

  const addNewTransaction = async (tx: Omit<Transaction, 'id'>) => {
    await addTransaction(tx);
    await refreshAll();
  };

  const removeTransaction = async (id: number) => {
    await deleteTransaction(id);
    await refreshAll();
  };

  const addNewEvent = async (event: Omit<ScheduledEvent, 'id'>) => {
    await addScheduledEvent(event);
    await refreshAll();
  };

  const removeEvent = async (id: number) => {
    await deleteScheduledEvent(id);
    await refreshAll();
  };

  const updateEvent = async (event: ScheduledEvent) => {
    // Obtener estado anterior para detectar cambios
    const previous = scheduledEvents.find((e) => e.id === event.id);
    const wasNotPaid = previous?.status !== 'paid';
    const isNowPaid = event.status === 'paid';
    const wasNotPending = previous?.status !== 'pending';
    const isNowPending = event.status === 'pending';

    await updateScheduledEvent(event);

    // Al marcar como PAGADO: crear transacción de gasto
    if (wasNotPaid && isNowPaid && event.id) {
      await addTransaction({
        type: 'expense',
        amount: event.amount,
        category: event.category,
        description: event.title,
        note: event.note,
        date: new Date().toISOString(),
        activityType: event.activityType,
        linkedEventId: event.id,
      });
    }

    // Al revertir a PENDIENTE: eliminar la transacción generada
    if (wasNotPending && isNowPending && event.id) {
      await deleteTransactionByLinkedEvent(event.id);
    }

    await refreshAll();
  };

  const addNewGoal = async (goal: Omit<SavingsGoal, 'id'>) => {
    await addSavingsGoal(goal);
    await refreshAll();
  };

  const updateGoal = async (goal: SavingsGoal) => {
    // Detectar si es un abono (currentAmount aumentó)
    const previous = savingsGoals.find((g) => g.id === goal.id);
    const abono = goal.currentAmount - (previous?.currentAmount ?? 0);

    await updateSavingsGoal(goal);

    // Si se abonó dinero: crear transacción de gasto (ahorro)
    if (abono > 0 && goal.id) {
      await addTransaction({
        type: 'expense',
        amount: abono,
        category: 'savings',
        description: `Abono: ${goal.title}`,
        date: new Date().toISOString(),
        activityType: 'important',
        linkedGoalId: goal.id,
      });
    }

    // Si se redujo el monto (reversión): eliminar la transacción del abono
    if (abono < 0 && goal.id) {
      await deleteTransactionByLinkedGoal(goal.id, Math.abs(abono));
    }

    await refreshAll();
  };

  const removeGoal = async (id: number) => {
    await deleteSavingsGoal(id);
    await refreshAll();
  };

  const updateSettings = async (s: Omit<UserSettings, 'id'>) => {
    await saveUserSettings(s);
    await refreshAll();
  };

  const dismissAlert = async (id: number) => {
    await markAlertRead(id);
    await refreshAll();
  };

  const addNewDebt = async (debt: Omit<Debt, 'id'>) => {
    await addDebt(debt);
    await refreshAll();
  };

  const editDebt = async (debt: Debt) => {
    await updateDebt(debt);
    await refreshAll();
  };

  const removeDebt = async (id: number) => {
    await deleteDebt(id);
    await refreshAll();
  };

  const editTransaction = async (tx: import('./db').Transaction) => {
    await updateTransaction(tx);
    await refreshAll();
  };

  const saveCycleNoteContent = async (content: string) => {
    const { cycleStart } = getCurrentCycleDates(settings?.payDay ?? 1);
    const noteKey = cycleStart.toISOString().slice(0, 10);
    await saveCycleNote(noteKey, content);
    setCycleNote(content);
  };

  const setTheme = async (t: 'dark' | 'rose') => {
    setThemeState(t);
    if (settings) {
      await updateSettings({ ...settings, theme: t });
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        scheduledEvents,
        savingsGoals,
        settings,
        alerts,
        monthSummary,
        runOutDay,
        isLoading,
        refreshAll,
        addNewTransaction,
        removeTransaction,
        addNewEvent,
        removeEvent,
        updateEvent,
        addNewGoal,
        updateGoal,
        removeGoal,
        updateSettings,
        dismissAlert,
        unreadAlertCount,
        debts,
        addNewDebt,
        editDebt,
        removeDebt,
        editTransaction,
        cycleNote,
        saveCycleNoteContent,
        theme,
        setTheme,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
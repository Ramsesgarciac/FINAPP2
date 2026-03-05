'use client';

import { useFinance } from '@/lib/context';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';

export default function AlertsPage() {
  const { alerts, dismissAlert } = useFinance();

  const unread = alerts.filter((a) => !a.isRead);
  const read = alerts.filter((a) => a.isRead);

  return (
    <div className="h-screen overflow-y-auto pb-28">
      <div
        className="px-5 pb-4 flex items-center gap-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <Link href="/" className="w-8 h-8 rounded-full glass flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-text-primary font-display font-bold text-lg">Alertas</h1>
        {unread.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400">
            {unread.length} nueva(s)
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 px-8">
          <p className="text-5xl mb-4">🔔</p>
          <p className="text-text-primary font-display font-semibold mb-2">Sin alertas</p>
          <p className="text-text-muted text-sm text-center">
            Las alertas de presupuesto y recordatorios aparecerán aquí
          </p>
        </div>
      ) : (
        <div className="px-5">
          {unread.length > 0 && (
            <>
              <p className="text-text-muted text-xs font-semibold tracking-widest mb-3">NUEVAS</p>
              <div className="flex flex-col gap-2 mb-5">
                {unread.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-4 rounded-2xl"
                    style={{
                      background: 'var(--bg-card)',
                      border: `1px solid ${alert.color ?? '#4F7CFF'}22`,
                    }}
                  >
                    <span className="text-2xl mt-0.5 flex-shrink-0">{alert.icon ?? '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-semibold text-sm font-display">
                        {alert.title}
                      </p>
                      <p className="text-text-secondary text-xs mt-0.5 leading-relaxed">
                        {alert.message}
                      </p>
                      <p className="text-text-muted text-[10px] mt-1.5">
                        {new Date(alert.createdAt).toLocaleDateString('es-MX', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => alert.id && dismissAlert(alert.id)}
                      className="w-7 h-7 rounded-full bg-bg-elevated flex items-center justify-center flex-shrink-0"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {read.length > 0 && (
            <>
              <p className="text-text-muted text-xs font-semibold tracking-widest mb-3">ANTERIORES</p>
              <div className="flex flex-col gap-2">
                {read.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-4 rounded-2xl opacity-50"
                    style={{ background: 'var(--bg-card)' }}
                  >
                    <span className="text-xl flex-shrink-0">{alert.icon ?? '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-secondary text-sm">{alert.title}</p>
                      <p className="text-text-muted text-xs mt-0.5">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

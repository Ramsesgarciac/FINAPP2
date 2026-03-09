'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFinance } from '@/lib/context';

const navItems = [
  {
    href: '/',
    label: 'Inicio',
    icon: (active: boolean, color: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z"
          stroke={active ? color : '#475569'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
          fill={active ? `${color}22` : 'none'} />
      </svg>
    ),
  },
  {
    href: '/agenda',
    label: 'Agenda',
    icon: (active: boolean, color: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="4" stroke={active ? color : '#475569'} strokeWidth="1.75" fill={active ? `${color}22` : 'none'} />
        <path d="M8 2V6M16 2V6M3 10H21" stroke={active ? color : '#475569'} strokeWidth="1.75" strokeLinecap="round" />
        <path d="M8 14H8.01M12 14H12.01M16 14H16.01" stroke={active ? color : '#475569'} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/stats',
    label: 'Stats',
    icon: (active: boolean, color: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M4 20L8 14L12 17L16 10L20 4" stroke={active ? color : '#475569'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20" cy="4" r="2" fill={active ? color : '#475569'} />
      </svg>
    ),
  },
  {
    href: '/debts',
    label: 'Deudas',
    icon: (active: boolean, color: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="3" stroke={active ? color : '#475569'} strokeWidth="1.75" fill={active ? `${color}22` : 'none'} />
        <path d="M2 10h20" stroke={active ? color : '#475569'} strokeWidth="1.75" />
        <path d="M6 15h4M14 15h4" stroke={active ? color : '#475569'} strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Config',
    icon: (active: boolean, color: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke={active ? color : '#475569'} strokeWidth="1.75" />
        <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
          stroke={active ? color : '#475569'} strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { unreadAlertCount, theme } = useFinance();
  const accentColor = theme === 'rose' ? '#EC4899' : '#4F7CFF';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="glass-strong mx-3 mb-3 rounded-2xl px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const isHome = item.href === '/';
            const showDot = isHome && unreadAlertCount > 0;
            return (
              <Link key={item.href} href={item.href}
                className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-200 relative"
                style={{ background: isActive ? `${accentColor}18` : 'transparent' }}>
                <div className="relative">
                  {item.icon(isActive, accentColor)}
                  {showDot && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-bg-primary" />}
                </div>
                <span className="text-[10px] font-medium tracking-wide"
                  style={{ color: isActive ? accentColor : '#475569' }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
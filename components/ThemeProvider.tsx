'use client';

import { useEffect } from 'react';
import { useFinance } from '@/lib/context';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { theme } = useFinance();

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.style.background = theme === 'rose' ? '#0F0810' : '#0D0F14';
    }, [theme]);

    return <>{children}</>;
}
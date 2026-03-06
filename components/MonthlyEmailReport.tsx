'use client';

import { useEffect, useRef } from 'react';
import { useFinance } from '@/lib/context';
import { exportAllDataAsJSON } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';

/**
 * Componente invisible que detecta el fin de ciclo y dispara el email.
 * Usa EmailJS (gratis hasta 200 emails/mes) que funciona 100% desde el frontend.
 */
export default function MonthlyEmailReport() {
    const { monthSummary, settings } = useFinance();
    const sentRef = useRef(false);

    useEffect(() => {
        if (!monthSummary || !settings?.email || sentRef.current) return;

        const checkAndSend = async () => {
            const now = new Date();
            const payDay = settings.payDay ?? 1;
            const today = now.getDate();

            // Envía el reporte el mismo día de pago (inicio del nuevo ciclo = fin del anterior)
            if (today !== payDay) return;

            // Revisa si ya se envió hoy
            const lastSentKey = 'financeapp_last_report_sent';
            const lastSent = localStorage.getItem(lastSentKey);
            const todayStr = now.toISOString().slice(0, 10);
            if (lastSent === todayStr) return;

            // Genera el JSON de respaldo
            const backupJson = await exportAllDataAsJSON();

            // Construye el resumen en texto
            const income = formatCurrency(monthSummary.monthlyIncome, settings.currency);
            const spent = formatCurrency(monthSummary.totalExpenses, settings.currency);
            const available = formatCurrency(monthSummary.available, settings.currency);
            const rollover = formatCurrency(monthSummary.prevRollover ?? 0, settings.currency);

            const categoryLines = Object.entries(monthSummary.byCategory)
                .map(([cat, amt]) => `  • ${cat}: ${formatCurrency(amt as number, settings.currency)}`)
                .join('\n');

            const reportText = `
Hola ${settings.name},

Aquí está tu resumen financiero del ciclo anterior:

💰 RESUMEN DEL CICLO
──────────────────────
Ingreso mensual:   ${income}
Total gastado:     ${spent}
Saldo disponible:  ${available}
Sobrante anterior: ${rollover}

📊 GASTOS POR CATEGORÍA
──────────────────────
${categoryLines || '  Sin gastos registrados'}

🛡️ RESPALDO
──────────────────────
Se adjunta el archivo de respaldo de tus datos.
Guárdalo en un lugar seguro.

— FinanceApp
      `.trim();

            // ── Opción A: mailto (no requiere configuración, abre el cliente de correo) ──
            // Esta opción funciona sin ninguna API key
            const subject = encodeURIComponent(`FinanceApp — Reporte ${todayStr}`);
            const body = encodeURIComponent(reportText);
            const mailtoLink = `mailto:${settings.email}?subject=${subject}&body=${body}`;

            // Abre el cliente de correo del dispositivo
            window.open(mailtoLink, '_blank');

            // Descarga el backup automáticamente
            const blob = new Blob([backupJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `financeapp-backup-${todayStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Marca como enviado hoy
            localStorage.setItem(lastSentKey, todayStr);
            sentRef.current = true;
        };

        checkAndSend().catch(console.error);
    }, [monthSummary, settings]);

    return null;
}
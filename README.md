# 💰 FinanceApp — Agenda & Finanzas Personales

Una PWA completa de finanzas personales construida con **Next.js 14**, **TypeScript**, **Tailwind CSS**, e **IndexedDB** para almacenamiento 100% local en el dispositivo.

---

## 🚀 Instalación

```bash
npm install
npm run dev
```

Para producción (PWA activa):
```bash
npm run build
npm start
```

---

## 📱 Pantallas incluidas

| Ruta | Pantalla | Descripción |
|------|----------|-------------|
| `/` | Dashboard | Balance, alertas, transacciones recientes, recordatorios |
| `/agenda` | Agenda | Calendario con eventos financieros, próximos pagos |
| `/stats` | Estadísticas | Donut chart, barras semanales, presupuesto vs real, predicción |
| `/goals` | Metas | Ahorro por objetivos con progreso y abonos |
| `/settings` | Configuración | Perfil, ingresos, distribución de presupuesto |
| `/transactions` | Historial | Lista completa filtrable con eliminación |
| `/alerts` | Alertas | Centro de notificaciones inteligentes |

---

## ✨ Funcionalidades

### 💸 Transacciones
- Registro de gastos e ingresos con numpad táctil
- 6 categorías: Comida, Transporte, Renta, Entretenimiento, Ahorro, Servicios
- Clasificación: Importante / Ocio
- Historial agrupado por fecha con eliminación

### 📅 Agenda Financiera
- Calendario mensual con navegación
- Puntos indicadores de eventos por día
- Eventos importantes (azul) y de ocio (morado)
- Marcar pagos como realizados
- Pagos recurrentes mensuales
- Próximos pagos ordenados

### 📊 Estadísticas
- Donut chart de gasto mensual por categoría
- Gráfica de barras de los últimos 7 días
- Presupuesto vs real con barras de progreso
- **Predicción de gastos**: "Te quedarás sin dinero el día X"
- Comparación mes anterior

### 🎯 Metas de Ahorro
- Definir meta con nombre, monto, fecha límite y color
- Cálculo automático de ahorro mensual necesario
- Sistema de abonos con actualización de progreso
- Archivado de metas completadas

### 🔔 Alertas Inteligentes
- ⚠️ "Has gastado el 80% de tu presupuesto en X"
- 🔔 "Mañana vence el pago de Netflix"
- 📉 Predicción de cuándo se acaba el dinero
- Centro de notificaciones con historial

### ⚙️ Configuración
- Nombre de usuario
- Ingreso mensual y moneda (MXN/USD/EUR)
- Distribución porcentual del presupuesto (sliders)
- Todo calculado automáticamente

---

## 🗄️ Almacenamiento

Usa **IndexedDB** vía la librería `idb`. **Todos los datos quedan en el dispositivo del usuario**, nunca salen a ningún servidor.

Stores:
- `transactions` — gastos e ingresos
- `scheduledEvents` — eventos y pagos programados
- `savingsGoals` — metas de ahorro
- `userSettings` — configuración del usuario
- `alerts` — notificaciones generadas

---

## 🎨 Diseño

- Tema oscuro con paleta azul-violeta-rosa
- Glassmorphism en navbar y modales
- Fuentes: **Syne** (display/títulos) + **DM Sans** (cuerpo)
- Animaciones CSS con `fade-up`, `slide-up`
- Bottom sheet modals
- Floating Action Button
- Totalmente responsive (max-width: 448px)

---

## 📦 Dependencias principales

```
next 14.2.0
next-pwa 5.6.0          ← PWA / Service Worker
idb 8.0.0               ← IndexedDB wrapper
recharts 2.12.0         ← Gráficas
date-fns 3.6.0          ← Utilidades de fecha
lucide-react 0.400.0    ← Iconos (uso mínimo)
tailwindcss 3.4.0       ← Estilos
```

---

## 🗂️ Estructura del proyecto

```
financeapp/
├── app/
│   ├── layout.tsx          ← Root layout con providers
│   ├── globals.css         ← Estilos globales y tokens CSS
│   ├── page.tsx            ← Dashboard (Home)
│   ├── agenda/page.tsx     ← Agenda con calendario
│   ├── stats/page.tsx      ← Estadísticas y gráficas
│   ├── goals/page.tsx      ← Metas de ahorro
│   ├── settings/page.tsx   ← Configuración
│   ├── transactions/page.tsx ← Historial
│   └── alerts/page.tsx     ← Centro de alertas
├── components/
│   ├── BottomNav.tsx       ← Navegación inferior
│   ├── TransactionModal.tsx ← Modal registro de gastos
│   ├── EventModal.tsx      ← Modal de eventos/agenda
│   └── GoalModal.tsx       ← Modal de metas
├── lib/
│   ├── db.ts               ← IndexedDB (tipos + CRUD)
│   ├── context.tsx         ← React Context global
│   └── utils.ts            ← Utilidades y formateadores
└── public/
    └── manifest.json       ← PWA manifest
```

---

## 🔧 Próximos pasos sugeridos

- [ ] Agregar iconos PWA (192x192 y 512x512) en `/public/icons/`
- [ ] Exportar/importar datos en JSON
- [ ] Notificaciones push (Web Push API)
- [ ] Gráfica de tendencia mes a mes
- [ ] Modo planificación semanal
- [ ] Widgets de resumen rápido

---

> 💡 **Tip**: Para activar las notificaciones nativas del navegador, el service worker de `next-pwa` se activa automáticamente en producción (`npm run build && npm start`).

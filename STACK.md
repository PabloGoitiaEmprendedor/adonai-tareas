# Adonai Tasks — Stack Tecnológico

## Visión General
Aplicación multiplataforma de productividad / gestión de tareas con gamificación, IA, calendarios, Notion, y modo offline. Compite con Todoist, TickTick, Notion Calendar.

---

## Frontend

| Capa | Tecnología |
|---|---|
| **Framework** | React 18.3 + TypeScript 5.8 |
| **Build** | Vite 5.4 + SWC (`@vitejs/plugin-react-swc`) |
| **Routing** | React Router DOM 6.30 (`BrowserRouter` web / `HashRouter` Electron) |
| **Estilos** | Tailwind CSS 3.4 + `tailwindcss-animate` + `@tailwindcss/typography` |
| **UI Primitives** | Radix UI (20+ paquetes), `cmdk`, `vaul`, `sonner`, `react-aria-components` |
| **Animación** | Framer Motion 12.38 |
| **Formularios** | React Hook Form + Zod |
| **Estado/Datos** | TanStack React Query 5.83 |
| **Fechas** | date-fns 3.6, `@internationalized/date` |
| **Gráficos** | Recharts |
| **Íconos** | Lucide React + Radix Icons |
| **Tema** | next-themes (claro/oscuro/sistema) |
| **Autenticación UI** | Clerk React + Clerk UI |
| **Notificaciones web** | OneSignal |
| **Analítica** | Google Analytics (gtag) + Microsoft Clarity |
| **Onboarding** | React Joyride |
| **Efectos** | canvas-confetti |

---

## Desktop (Electron)

| Capa | Tecnología |
|---|---|
| **Runtime** | Electron 41.3 |
| **Build** | electron-builder (NSIS Windows + DMG macOS) |
| **Auto-update** | electron-updater (macOS) + GitHub releases downloader (Windows) |
| **Ventanas** | Múltiples: principal (frameless), mini-flotante, toast, burbuja selección, tarea rápida |
| **Deep linking** | Protocolo `adonai-tasks://` |
| **Atajos globales** | `Alt+Space` captura universal |
| **Bandeja sistema** | Tray icon + menú contextual |

---

## Mobile

| Capa | Tecnología |
|---|---|
| **Runtime** | Capacitor 8.3 (Android) |
| **Web root** | `dist/` (build de Vite) |
| **App ID** | `com.adonaitasks.app` |

---

## Backend & BaaS

| Capa | Tecnología |
|---|---|
| **Base de datos** | Supabase PostgreSQL |
| **Edge Functions** | Supabase (Deno) — **26 funciones** |
| **Autenticación primaria** | Clerk (email, Google OAuth, anónimo) |
| **Puente auth** | Edge Function `clerk-supabase-token` (Clerk JWT → Supabase JWT) |
| **AI Copilot** | Groq API + Llama 3.1 8B (Edge Function `chat-adonai`) |
| **Integraciones externas** | Google Calendar, Google Sheets, Notion (9 Edge Functions) |
| **AI adicional** | Transcripción audio, extraer tareas de imágenes, clasificación de tareas |
| **Programado** | Backup diario DB, recordatorios, reporte semanal |

---

## CI/CD & Deploy

| Capa | Tecnología |
|---|---|
| **Web hosting** | Vercel (SPA `vercel.json`) |
| **Desktop releases** | GitHub Actions → GitHub Releases |
| **Desktop update feed** | `releases.json` en GitHub |
| **CI/CD** | GitHub Actions (build matrix win/mac, backup diario DB) |
| **Testing** | Vitest (unit), Playwright (E2E), Testing Library |

---

## Arquitectura General

```
                     ┌──────────────────────────────────┐
                     │        Adonai Tasks App           │
                     ├────────────┬──────────┬───────────┤
                     │  Web       │ Electron │ Capacitor │
                     │ (Vercel)   │ (Win/Mac)│ (Android) │
                     └──────┬─────┴────┬─────┴─────┬─────┘
                            │          │           │
                    ┌───────▼──────────▼───────────▼───┐
                    │     Supabase (PostgreSQL + Deno)  │
                    │      26 Edge Functions            │
                    └───┬──────────┬──────────┬─────────┘
                        │          │          │
                 ┌──────▼──┐ ┌─────▼─────┐ ┌──▼────────┐
                 │ Clerk   │ │ Google    │ │ Notion API │
                 │ Auth    │ │ Calendar  │ │ (9 funcs)  │
                 └─────────┘ │ Sheets    │ └────────────┘
                             └───────────┘
```

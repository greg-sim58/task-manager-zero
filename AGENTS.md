# AGENTS.md — Task Zero

## Project Overview

React 18 + TypeScript + Vite dashboard app with Supabase backend (PostgreSQL, Auth, Realtime). UI built with shadcn/ui + Tailwind CSS + Radix UI primitives. State via TanStack Query. Forms via React Hook Form + Zod.

## Build / Lint / Test Commands

```bash
npm run dev          # Start dev server (Vite, port 8080)
npm run build        # Production build (vite build)
npm run build:dev    # Development build (vite build --mode development)
npm run lint         # ESLint across all .ts/.tsx files
npm run preview      # Preview production build
```

**No test framework is configured.** There are no test scripts, no test runner, no test files. If adding tests, choose Vitest (already Vite-native) and configure in `vite.config.ts`.

## Tech Stack

| Layer          | Technology                                      |
|----------------|------------------------------------------------|
| Framework      | React 18.3 + TypeScript 5.8                    |
| Bundler        | Vite 5 + SWC (via @vitejs/plugin-react-swc)    |
| UI Components  | shadcn/ui (default style, slate base color)     |
| Styling        | Tailwind CSS 3 + CSS variables for theming      |
| Backend        | Supabase (PostgreSQL + Auth + Realtime)         |
| State          | TanStack React Query 5                          |
| Forms          | React Hook Form 7 + Zod 3                       |
| Routing        | React Router DOM 6                              |
| Icons          | lucide-react                                    |
| Date utils     | date-fns                                        |
| Charts         | Recharts                                        |

## Project Structure

```
src/
├── App.tsx                    # Root: providers, routing
├── main.tsx                   # Entry point
├── index.css                  # Global styles + CSS variables
├── components/
│   ├── ui/                    # shadcn/ui primitives (DO NOT EDIT MANUALLY)
│   ├── AppSidebar.tsx        # Navigation sidebar
│   ├── DashboardLayout.tsx   # Auth-gated layout wrapper
│   ├── KPICard.tsx            # Reusable KPI card (variant: revenue|users|orders|conversion)
│   ├── RecentActivity.tsx    # Task list — displays "todo" tasks sorted by priority
│   ├── Notes.tsx             # Notes list — shows tasks where description is not null
│   ├── QuickActions.tsx      # Placeholder actions (4-button grid)
│   ├── TaskDetailsSidebar.tsx # Task detail drawer (slide-over)
│   ├── TaskRow.tsx            # Task table row component
│   ├── MrkPricesCard.tsx      # Precious metals pricing widget
│   └── RecurringEventDialog.tsx
├── hooks/
│   ├── use-mobile.tsx        # Responsive breakpoint hook
│   └── use-toast.ts          # Toast notifications (sonner-based)
├── integrations/
│   └── supabase/
│       ├── client.ts         # Supabase client (auto-generated, do not edit)
│       └── types.ts          # Database types (auto-generated, do not edit)
├── lib/
│   └── utils.ts              # cn() utility for Tailwind class merging
├── pages/
│   ├── Auth.tsx, Dashboard.tsx, Tasks.tsx, Calendar.tsx
│   ├── Settings.tsx, Reports.tsx
│   └── Users.tsx, Products.tsx, Support.tsx  # Placeholder pages
supabase/
├── config.toml               # Supabase project config
└── migrations/               # SQL migrations (3 files)
```

## Path Aliases

```
@/* → ./src/*
```

Configured in `tsconfig.json` and `vite.config.ts`. Always use `@/` for imports from src.

## Code Style

### TypeScript Configuration

- **Strict mode is OFF** (`strict: false` in tsconfig.app.json)
- `noImplicitAny: false`, `noUnusedLocals: false`, `noUnusedParameters: false`
- `strictNullChecks: false`
- Target: ES2020, Module: ESNext, JSX: react-jsx

### Imports — Order Convention

1. React/React DOM imports
2. Third-party libraries (`@supabase/*`, `@tanstack/*`, `react-router-dom`, `date-fns`, etc.)
3. Internal UI components (`@/components/ui/*`)
4. Internal app components (`@/components/*`)
5. Hooks (`@/hooks/*`)
6. Integrations (`@/integrations/*`)
7. Utilities (`@/lib/*`)
8. Icons (from `lucide-react` — named imports)
9. Types (inline or from local interfaces)

```typescript
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
```

### Components

- **Pages**: `export default function PageName()` — function declarations, default exports
- **Shared components**: `export function ComponentName()` — function declarations, named exports
- **shadcn/ui**: Auto-generated in `src/components/ui/` — do not manually edit these files
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes

### Props Typing

- Use `interface` for component props, defined immediately above the component:

```typescript
interface KPICardProps {
  title: string;
  value: string;
  change: string | ReactNode;
  icon: ReactNode;
  variant: "revenue" | "users" | "orders" | "conversion";
}

export function KPICard({ title, value, change, icon, variant }: KPICardProps) {
```

### Types

- **Local interfaces**: Defined in the same file, above the component
- **Database types**: Auto-generated in `src/integrations/supabase/types.ts` — do NOT edit
- Use `interface` for object shapes, `type` for unions/aliases
- Union literal types for status/priority: `"pending" | "in_progress" | "completed"`

### State Management

- **Server state**: TanStack React Query (QueryClient in App.tsx)
- **Local state**: `useState` hooks within components
- **No global state store** (no Context providers, no Zustand/Redux)
- Auth state managed via `supabase.auth.onAuthStateChange()` in layout components

### Supabase Patterns

**Client import** (always use this path):
```typescript
import { supabase } from "@/integrations/supabase/client";
```

**Data fetching** — direct Supabase queries in components (no abstraction layer):
```typescript
const { data, error } = await supabase
  .from("tasks")
  .select("*")
  .order("created_at", { ascending: false });
if (error) throw error;
```

**Auth check before mutations**:
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) { /* show error toast, return */ }
```

**Realtime subscriptions**:
```typescript
const channel = supabase
  .channel('events-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
    fetchData();
  })
  .subscribe();
return () => { supabase.removeChannel(channel); };
```

### Error Handling

- **try/catch with toast notifications** — the standard pattern:
```typescript
try {
  const { data, error } = await supabase.from("tasks").select("*");
  if (error) throw error;
  // use data
} catch (error: any) {
  toast({ title: "Error", description: error.message, variant: "destructive" });
} finally {
  setLoading(false);
}
```
- `console.error()` used for non-user-facing errors (e.g., exchange rate fetch)
- No global error boundary

### Naming Conventions

| Thing              | Convention            | Example                          |
|--------------------|-----------------------|----------------------------------|
| Page components    | PascalCase            | `Dashboard.tsx`, `Tasks.tsx`     |
| Shared components  | PascalCase            | `KPICard.tsx`, `AppSidebar.tsx`  |
| UI primitives      | kebab-case            | `button.tsx`, `alert-dialog.tsx` |
| Hooks              | kebab-case, use-*     | `use-mobile.tsx`, `use-toast.ts` |
| Utility files      | camelCase             | `utils.ts`                       |
| Functions          | camelCase             | `fetchTasks`, `handleSubmit`     |
| Event handlers     | handle* prefix        | `handleEdit`, `handleDelete`     |
| Boolean state      | is/has prefix         | `isLogin`, `isDialogOpen`        |
| Constants          | UPPER_SNAKE or camelCase | `EVENT_COLORS`, `menuItems`   |
| DB columns         | snake_case            | `user_id`, `due_date`            |

### Styling

- Tailwind CSS with CSS custom properties for theming (`hsl(var(--primary))`)
- shadcn/ui components provide the design system base
- `cn()` helper for conditional/merged classes
- Responsive: `md:` and `lg:` breakpoints for grid layouts
- Dark mode via `next-themes` ThemeProvider with `class` strategy

### Database

One table with RLS (Row Level Security) enabled:
- **tasks**: id, user_id, title, description, status (todo|in_progress|done), priority (low|medium|high), due_date, created_at, updated_at, parent_id, position, ai_generated

RLS policies restrict all CRUD to `auth.uid() = user_id`.

**Note:** `events` table was removed from Supabase types. `Dashboard.tsx` mocks calendar data (no live fetch).

### Edge Cases

- **Metal prices**: Uses `supabase.functions.invoke('get-metal-prices')` in `Dashboard.tsx`
- **Weather**: Uses browser geolocation + Open-Meteo API + Nominatim reverse geocoding (cached locally)

### Environment Variables

Required in `.env` (Vite format with `VITE_` prefix):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

### ESLint

- Flat config (`eslint.config.js`) with `typescript-eslint` recommended rules
- `@typescript-eslint/no-unused-vars: "off"`
- React hooks and react-refresh plugins enabled
- No Prettier config (use editor defaults or add one)

### Diagnostics

- **Primary diagnostics source**: Biome LSP (via editor) — catches errors before `npm run lint`
- `npm run lint` runs ESLint separately — both may report different issues
- Run both for full coverage, but fix LSP errors first

### Do NOT

- Edit files in `src/components/ui/` — these are shadcn/ui generated
- Edit `src/integrations/supabase/client.ts` or `types.ts` — auto-generated
- Use `any` types unless matching existing patterns (codebase is lenient on this)
- Add new dependencies without justification
- Modify Supabase migrations after they've been applied — create new ones instead

### StrictNullChecks Off Impact

- `strictNullChecks: false` means `null` and `undefined` are assignable to any type without error
- Code can look like `task.description?.length` or `task.description &&` — both patterns coexist
- Don't add defensive `!` casts or unnecessary null guards just because a value *could* be null
- Only guard when the codebase actually checks (e.g., the Dashboard does `if (!user)` check)

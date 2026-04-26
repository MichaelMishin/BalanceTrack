# BalanceTrack — AI Coding Instructions

## Project Overview

BalanceTrack is a household personal finance tracker web app. Multiple members of a household share one "household" entity and track shared transactions. Each user can also view their personal contributions.

**Live stack:**
- React 19 + Vite 8 + TypeScript 6
- Tailwind CSS v4 + shadcn/ui (new-york style)
- Supabase (Postgres + Auth + Row Level Security)
- Recharts, date-fns, react-i18next (EN + HE with RTL), Zod, Lucide React

---

## Repository Structure

```
src/
  App.tsx                  # Root router (auth guard + HouseholdProvider wrapping)
  main.tsx                 # Entry point — wraps app in BrowserRouter + AuthProvider
  index.css                # Tailwind CSS v4 source (design tokens, animations, glass effects)
  components/
    accounts/              # AccountForm — add/edit financial accounts
    categories/            # CategoryForm, IconPicker, ImportRuleForm
    charts/                # ExpensePieChart (Recharts donut), SavingsGauge (SVG)
    household/             # HouseholdSection (invite/join flow)
    import-export/         # ExportDialog (CSV/PDF), ImportDialog (CSV upload), SaveRulePopover
    layout/                # MainLayout (Outlet), Navbar (period nav), Sidebar
    transactions/          # CategoryDetail (expandable rows), RecurringTransactionForm, TransactionForm
    ui/                    # shadcn/ui components + custom: FormDialog, GlassCard, StatCard, ConfirmDialog
  hooks/
    use-budget-limits.ts   # Budget limits per category with overspending alerts
    use-import-rules.ts    # CSV import mapping rules CRUD
    use-insights.ts        # Insights engine (overspending, spikes, on-track)
    use-recurring-transactions.ts  # Recurring transaction generation + CRUD
    use-savings.ts         # Savings percentage + period snapshots
    use-transactions.ts    # Transaction CRUD + grouping by category
    use-theme.ts           # Dark/light mode toggle (localStorage, .light class on <html>)
  i18n/
    index.ts               # i18next setup
    locales/en.json        # English strings
    locales/he.json        # Hebrew strings (RTL)
  lib/
    csv-import.ts          # CSV parsing + column mapping + import preview logic
    currency.ts            # ExchangeRate-API fetch + DB cache in exchange_rates table
    export.ts              # CSV/PDF export logic
    supabase.ts            # Supabase client (typed with Database type)
    utils.ts               # cn() helper (clsx + tailwind-merge)
  pages/
    Auth.tsx               # Sign-in / sign-up / Google OAuth
    Dashboard.tsx          # Money In/Out summary, pie chart, insights, savings gauge
    Accounts.tsx           # Financial accounts management
    Categories.tsx         # Category CRUD + icon picker + drag-and-drop reorder
    RecurringTransactions.tsx  # Recurring transaction templates
    Settings.tsx           # Profile, currency, timeframe, savings target, household, language
    Transactions.tsx       # Transaction list with filters (date, category, type)
  stores/
    auth-context.tsx       # AuthProvider — user, session, profile, auth actions
    household-context.tsx  # HouseholdProvider — household, members, categories, accounts, period nav
  types/
    database.ts            # AUTO-GENERATED Supabase types + convenience aliases
```

---

## Key Architecture Decisions

### State Management
- **No Redux/Zustand** — two React Contexts cover all global state:
  - `AuthContext` (`stores/auth-context.tsx`): Supabase session, profile, auth actions
  - `HouseholdContext` (`stores/household-context.tsx`): household, members, categories, accounts, active period range
- Page-level data is fetched in **custom hooks** (`use-transactions`, `use-savings`, etc.) that call Supabase directly.

### Routing
- React Router v7 (`react-router-dom`)
- All authenticated routes are wrapped in `HouseholdProvider` inside `ProtectedRoutes`
- Route structure: `/` → Dashboard, `/transactions`, `/recurring`, `/accounts`, `/categories`, `/settings`, `/auth`

### Database Types
- `src/types/database.ts` is **auto-generated** by the Supabase MCP tool — never edit by hand
- Convenience type aliases are at the bottom of the file (`Profile`, `Transaction`, `Category`, etc.)
- Regenerate after any schema change: `npx supabase gen types typescript --project-id rfubvjuvpikquzgilunm > src/types/database.ts`

### Path Aliases
- `@/*` resolves to `./src/*` (configured in `tsconfig.app.json` and `vite.config.ts`)
- TypeScript 6: `baseUrl` is deprecated — only `paths` is used

### Theme System
- Dark OLED default; light mode toggled via `.light` CSS class on `document.documentElement`
- **Never use `dark:` utility classes** — all dark/light variants are CSS variables in `index.css`
- Theme persisted to `localStorage` via `use-theme.ts`
- Font: Inter (loaded via CSS)

---

## Design System

### Component Patterns
- `FormDialog` (`ui/form-dialog.tsx`) — standard modal for all CRUD forms; wraps shadcn Dialog with glass styling
- `GlassCard` (`ui/glass-card.tsx`) — CVA variants: `default` | `elevated` | `interactive`
- `StatCard` (`ui/stat-card.tsx`) — metric cards with icon, color scheme, optional trend
- `ConfirmDialog` (`ui/confirm-dialog.tsx`) — replaces all `window.confirm()` usage

### CSS Conventions
- Semantic tokens only: `text-primary`, `text-success`, `text-destructive`, `text-muted-foreground`, etc.
- No raw Tailwind color classes in pages/components (e.g. no `text-blue-500`)
- Animations: `animate-fade-in`, `animate-slide-up`, `animate-slide-down`, `animate-scale-in`, `animate-shimmer`
- Glass effects: `glass-card` (subtle), `glass-card-elevated` (stronger blur + glow)
- Hover lift: `card-hover`
- Stagger grids: `stagger-children`

### Shadcn/ui
- Style: `new-york`
- Components configured in `components.json`
- Radix UI primitives used directly where shadcn wrappers aren't enough

---

## Database Schema

> Full SQL in `docs/SUPABASE_SETUP.md`. Types in `src/types/database.ts`.

### Tables (10 total)

| Table | Purpose |
|---|---|
| `profiles` | One per auth user — display name, preferred currency, timeframe, savings target |
| `households` | Shared financial entity — name, default currency, owner |
| `household_members` | Many-to-many: profiles ↔ households with role (owner/member) |
| `categories` | Income/expense categories — system defaults + per-household custom |
| `transactions` | Individual financial transactions (manual, bank_import, or estimated) |
| `financial_accounts` | Bank/credit accounts per household member |
| `exchange_rates` | Currency rate cache (base → target, date-keyed) to avoid API hammering |
| `period_snapshots` | Pre-computed period totals for trend/history analysis |
| `recurring_transactions` | Templates that generate transactions at a given frequency |
| `import_mapping_rules` | CSV column-mapping rules for bank import auto-categorization |

### Enums

| Enum | Values |
|---|---|
| `category_type` | `income`, `expense` |
| `account_type` | `checking`, `savings`, `credit_card`, `other` |
| `household_role` | `owner`, `member` |
| `timeframe_type` | `weekly`, `biweekly`, `monthly` |
| `transaction_source` | `manual`, `bank_import`, `estimated` |

### Key DB Behavior
- **RLS is enabled on all tables** — queries automatically scope to the authenticated user's household via the `is_household_member(hh_id)` function
- **Auto-signup trigger**: when a new Supabase Auth user is created, a DB trigger automatically creates: `profile` → `household` → copies system `categories` for the household
- `exchange_rates` is the only table without household RLS (shared cache)

---

## Internationalization

- `react-i18next` with JSON namespaces
- Languages: English (`en.json`), Hebrew (`he.json`)
- Hebrew uses RTL layout (handled via `dir="rtl"` set dynamically)
- Translation keys follow dot-notation: `common.save`, `transactions.addTransaction`, etc.
- Always use `useTranslation()` hook in components — never hardcode English strings

---

## Data Flow Example (Adding a Transaction)

1. User opens `TransactionForm` (in `TransactionForm.tsx`)
2. Form calls `addTransaction()` from `useTransactions()` hook
3. Hook calls `supabase.from('transactions').insert(tx)`
4. Supabase RLS validates the user is a member of the target household
5. Hook calls `fetchTransactions()` to refresh the local state
6. `HouseholdContext` categories are already loaded — no extra fetch needed

---

## Testing

- **Unit tests**: Vitest (`npm test`) — `src/lib/currency.test.ts`, `src/lib/utils.test.ts`
- **E2E tests**: Playwright (`npm run test:e2e`) — `e2e/auth.spec.ts`, `e2e/navigation.spec.ts`, `e2e/accessibility.spec.ts`
- Test setup in `src/test/setup.ts`

---

## Environment Variables

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Both are required at startup — the app throws immediately if missing.

---

## Common Patterns to Follow

1. **All CRUD dialogs use `FormDialog`** — do not create raw Dialog components for forms
2. **No `window.confirm`** — use `ConfirmDialog` with `variant="destructive"` for deletes
3. **Type-safe Supabase queries** — always import types from `@/types/database` not from `@supabase/supabase-js`
4. **Period awareness** — all transaction queries must filter by `period.start`/`period.end` from `HouseholdContext`
5. **Household scoping** — every insert must include `household_id` from `HouseholdContext`
6. **No hardcoded strings** — use i18n keys; add to both `en.json` and `he.json`
7. **Loading states** — use `Skeleton` component from `ui/skeleton.tsx` during data fetches
8. **Empty states** — always render a meaningful empty state when data arrays are empty

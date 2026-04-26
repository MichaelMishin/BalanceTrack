# BalanceTrack

A household personal finance tracker built with React, Vite, and Supabase. Multiple members of a household share one financial workspace to track income, expenses, and savings goals together — while each member can also view their personal contributions.

---

## Features

- **Shared household finances** — invite family or housemates; everyone sees the same transactions
- **Dashboard** — period totals, expense donut chart, savings gauge, AI-style insights
- **Transactions** — add/edit/delete with multi-currency conversion, filter by date, category, and type
- **Recurring transactions** — define templates (weekly/biweekly/monthly) that auto-generate entries
- **Categories** — customise icons, reorder via drag-and-drop, hide unused categories, set budget limits
- **Financial accounts** — track checking, savings, and credit card accounts per member
- **CSV import/export** — upload bank statements, map columns to categories, save reusable import rules
- **Multi-currency** — live exchange rates cached in the database; every transaction can be in a different currency
- **Insights engine** — automatic alerts for overspending, category spikes, and on-track streaks
- **Dark / light mode** — OLED-dark default, persisted to `localStorage`
- **Internationalisation** — English and Hebrew (RTL) with `react-i18next`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, TypeScript 6 |
| Styling | Tailwind CSS v4, shadcn/ui (new-york), Lucide React |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Charts | Recharts |
| Date handling | date-fns |
| i18n | react-i18next |
| Validation | Zod |
| Testing | Vitest (unit), Playwright (e2e) |

---

## Prerequisites

- **Node.js** v20+
- **npm** v10+
- A **Supabase** account (free tier is sufficient)

---

## Quick Start

### 1. Clone and install dependencies

```bash
git clone https://github.com/<your-org>/balancetrack.git
cd balancetrack
npm install
```

### 2. Set up Supabase

Follow the full guide in [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md). The short version:

1. Create a new project at [supabase.com](https://supabase.com).
2. In the Supabase SQL Editor, run the entire contents of [`supabase/schema.sql`](supabase/schema.sql). This creates all tables, enums, indexes, RLS policies, the auto-signup trigger, and seeds the default categories.
3. Copy your project URL and anon key from **Settings → API**.

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), create an account, and your household + 32 default categories are set up automatically.

---

## Project Structure

```
src/
  App.tsx                  # Root router (auth guard + HouseholdProvider wrapping)
  main.tsx                 # Entry point — BrowserRouter + AuthProvider
  index.css                # Tailwind CSS v4 (design tokens, animations, glass effects)
  components/
    accounts/              # AccountForm — add/edit financial accounts
    categories/            # CategoryForm, IconPicker, ImportRuleForm
    charts/                # ExpensePieChart (Recharts donut), SavingsGauge (SVG)
    household/             # HouseholdSection (invite/join flow)
    import-export/         # ExportDialog (CSV/PDF), ImportDialog (CSV upload), SaveRulePopover
    layout/                # MainLayout, Navbar (period nav), Sidebar
    transactions/          # CategoryDetail, RecurringTransactionForm, TransactionForm
    ui/                    # shadcn/ui + custom: FormDialog, GlassCard, StatCard, ConfirmDialog
  hooks/
    use-budget-limits.ts   # Budget limits per category with overspending alerts
    use-import-rules.ts    # CSV import mapping rules CRUD
    use-insights.ts        # Insights engine (overspending, spikes, on-track)
    use-recurring-transactions.ts  # Recurring transaction generation + CRUD
    use-savings.ts         # Savings percentage + period snapshots
    use-transactions.ts    # Transaction CRUD + grouping by category
    use-theme.ts           # Dark/light mode toggle (localStorage)
  i18n/
    index.ts               # i18next config
    locales/en.json        # English strings
    locales/he.json        # Hebrew strings (RTL)
  lib/
    csv-import.ts          # CSV parsing + column mapping + import preview
    currency.ts            # ExchangeRate-API fetch + DB cache
    export.ts              # CSV/PDF export logic
    supabase.ts            # Typed Supabase client
    utils.ts               # cn() helper (clsx + tailwind-merge)
  pages/
    Auth.tsx               # Sign-in / sign-up / Google OAuth
    Dashboard.tsx          # Main summary page
    Accounts.tsx           # Financial accounts
    Categories.tsx         # Category CRUD + drag-and-drop reorder
    RecurringTransactions.tsx
    Settings.tsx           # Profile, currency, timeframe, household, language
    Transactions.tsx       # Transaction list with filters
  stores/
    auth-context.tsx       # AuthProvider — session, profile, auth actions
    household-context.tsx  # HouseholdProvider — household, members, categories, period nav
  types/
    database.ts            # AUTO-GENERATED Supabase types — do not edit by hand

supabase/
  schema.sql               # Complete DB schema (tables, RLS, trigger, seed data)

docs/
  SUPABASE_SETUP.md        # Full Supabase setup guide
```

---

## Development Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server at `localhost:5173` |
| `npm run build` | Type-check + production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright end-to-end tests (headless) |
| `npm run test:e2e:ui` | Playwright interactive UI mode |
| `npm run test:e2e:headed` | Playwright with visible browser |

---

## Database

The full schema lives in [`supabase/schema.sql`](supabase/schema.sql) and is documented in detail in [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md).

### After any schema change

1. Apply the migration in the Supabase SQL Editor.
2. Update `supabase/schema.sql` to reflect the change.
3. Regenerate TypeScript types:
   ```bash
   npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > src/types/database.ts
   ```
4. Commit `supabase/schema.sql` and `src/types/database.ts` together.

---

## Key Conventions

- **No hardcoded strings** — use `useTranslation()` and add keys to both `en.json` and `he.json`
- **No `dark:` Tailwind classes** — all theme variants are CSS variables toggled via `.light` on `<html>`
- **No `window.confirm`** — use `ConfirmDialog` with `variant="destructive"`
- **All CRUD dialogs** use `FormDialog` — never create raw `<Dialog>` components for forms
- **Period-scoped queries** — all transaction queries filter by `period.start`/`period.end` from `HouseholdContext`
- **Type-safe DB queries** — import types from `@/types/database`, not from `@supabase/supabase-js`

---

## Testing

**Unit tests** (Vitest):
```bash
npm test
```
Covers: `src/lib/currency.ts`, `src/lib/utils.ts`

**End-to-end tests** (Playwright):
```bash
npm run test:e2e
```
Covers: auth flow, navigation, accessibility (17 tests across 3 spec files)

---

## Contributing

1. Fork the repository and create a feature branch.
2. Follow the key conventions listed above.
3. Add or update translation keys in both `en.json` and `he.json` for any user-facing strings.
4. Run `npm test` and `npm run test:e2e` before opening a pull request.
5. If you change the database schema, update `supabase/schema.sql` and regenerate `src/types/database.ts`.

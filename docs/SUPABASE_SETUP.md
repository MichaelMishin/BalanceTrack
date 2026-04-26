# BalanceTrack — Supabase Setup Guide

This guide explains how to set up the Supabase backend for BalanceTrack from scratch.

> **Keeping docs in sync:** The `supabase/schema.sql` file is the single source of truth for the database schema. Whenever you apply a migration (via the Supabase MCP tool, SQL Editor, or CLI), update `schema.sql` to reflect the change. Then regenerate the TypeScript types so the frontend stays in sync:
>
> ```bash
> npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > src/types/database.ts
> ```

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Choose your organisation, give it a name (e.g. `balancetrack`), set a strong database password, and pick a region close to your users.
4. Wait for the project to provision (~2 minutes).

---

## 2. Configure Authentication

### Email / Password

1. In the Supabase dashboard → **Authentication** → **Providers**.
2. Ensure **Email** is enabled (it is by default).
3. Under **Authentication** → **URL Configuration**, set:
   - **Site URL**: `http://localhost:5173` (dev) or your production URL.
   - **Redirect URLs**: add both `http://localhost:5173/**` and your production URL.

### Google OAuth (optional)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google+ API** and create OAuth 2.0 credentials.
3. Add `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorised redirect URI.
4. In Supabase → **Authentication** → **Providers** → **Google**, paste the client ID and secret.

---

## 3. Apply the Database Schema

### Option A — SQL Editor (recommended for new projects)

1. In the Supabase dashboard → **SQL Editor** → **New query**.
2. Paste the full contents of [`supabase/schema.sql`](../supabase/schema.sql).
3. Click **Run**.

The script will:
- Create all 5 enum types.
- Create all 10 tables with correct foreign keys and constraints.
- Create performance indexes.
- Create the `is_household_member()` RLS helper function.
- Enable RLS and apply all policies on every table.
- Create the `handle_new_user` trigger (fires on every new Auth user).
- Seed the 32 system categories.

### Option B — Supabase CLI

```bash
# Install CLI if needed
npm install -g supabase

# Link to your project
supabase login
supabase link --project-ref <YOUR_PROJECT_ID>

# Push the schema
supabase db push --file supabase/schema.sql
```

---

## 4. Set Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Find both values in the Supabase dashboard → **Settings** → **API**.

> **Never commit `.env.local`.** It is already in `.gitignore`.

---

## 5. Regenerate TypeScript Types

After any schema change, regenerate `src/types/database.ts` so the frontend types stay accurate:

```bash
npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > src/types/database.ts
```

> **Important:** `src/types/database.ts` is **auto-generated** — do not edit it by hand. Every table, column, and enum is reflected there automatically.

---

## 6. Verify the Setup

1. Start the dev server: `npm run dev`.
2. Navigate to `http://localhost:5173/auth`.
3. Create a new account.
4. You should be redirected to the Dashboard. If the auto-signup trigger ran correctly, you'll already have a household and 32 default categories.

Check in Supabase → **Table Editor**:
- `profiles`: 1 row for your user.
- `households`: 1 row.
- `household_members`: 1 row (owner role).
- `categories`: 32 rows copied from system categories.

---

## Schema Reference

### Enums

| Enum | Values |
|---|---|
| `category_type` | `income` \| `expense` |
| `account_type` | `checking` \| `savings` \| `credit_card` \| `other` |
| `household_role` | `owner` \| `member` |
| `timeframe_type` | `weekly` \| `biweekly` \| `monthly` |
| `transaction_source` | `manual` \| `bank_import` \| `estimated` |

### Tables

#### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, references `auth.users` |
| `display_name` | `text` | Nullable |
| `preferred_currency` | `text` | Default `'USD'` |
| `preferred_timeframe` | `timeframe_type` | Default `'monthly'` |
| `savings_target_pct` | `numeric` | Default `20` (%) |
| `locale` | `text` | Default `'en'` (also supports `'he'`) |
| `created_at` | `timestamptz` | Auto |
| `updated_at` | `timestamptz` | Auto |

#### `households`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | Required |
| `owner_id` | `uuid` | FK → `profiles` |
| `default_currency` | `text` | Default `'USD'` |
| `created_at` | `timestamptz` | Auto |

#### `household_members`
| Column | Type | Notes |
|---|---|---|
| `household_id` | `uuid` | PK + FK → `households` |
| `profile_id` | `uuid` | PK + FK → `profiles` |
| `role` | `household_role` | Default `'member'` |
| `joined_at` | `timestamptz` | Auto |

#### `categories`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | Display name |
| `name_key` | `text` | i18n key (system categories only) |
| `type` | `category_type` | Required |
| `icon` | `text` | Lucide icon name |
| `sort_order` | `integer` | Default `0` |
| `is_system` | `boolean` | If true: template row, not used directly |
| `is_hidden` | `boolean` | Soft-hide from UI |
| `household_id` | `uuid` | Null for system rows; FK → `households` |
| `created_at` | `timestamptz` | Auto |

#### `financial_accounts`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `household_id` | `uuid` | FK → `households` |
| `owner_id` | `uuid` | FK → `profiles` |
| `name` | `text` | Required |
| `type` | `account_type` | Default `'checking'` |
| `currency` | `text` | Default `'USD'` |
| `is_primary_checking` | `boolean` | Default `false` |
| `created_at` | `timestamptz` | Auto |

#### `transactions`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `household_id` | `uuid` | FK → `households` |
| `entered_by` | `uuid` | FK → `profiles` |
| `category_id` | `uuid` | FK → `categories` |
| `financial_account_id` | `uuid` | Nullable FK → `financial_accounts` |
| `amount` | `numeric` | In `currency` units |
| `currency` | `text` | ISO 4217 code |
| `converted_amount` | `numeric` | Nullable — in household default currency |
| `exchange_rate` | `numeric` | Nullable |
| `description` | `text` | Nullable |
| `transaction_date` | `date` | Required |
| `source` | `transaction_source` | Default `'manual'` |
| `is_manual` | `boolean` | Default `true` |
| `is_recurring` | `boolean` | Default `false` |
| `created_at` | `timestamptz` | Auto |
| `updated_at` | `timestamptz` | Auto |

#### `recurring_transactions`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `household_id` | `uuid` | FK → `households` |
| `category_id` | `uuid` | FK → `categories` |
| `financial_account_id` | `uuid` | Nullable FK → `financial_accounts` |
| `amount` | `numeric` | Required |
| `currency` | `text` | ISO 4217 code |
| `description` | `text` | Nullable |
| `frequency` | `timeframe_type` | Required |
| `next_due_date` | `date` | Required |
| `is_active` | `boolean` | Default `true` |
| `is_estimated` | `boolean` | Default `false` |
| `created_at` | `timestamptz` | Auto |

#### `period_snapshots`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `household_id` | `uuid` | FK → `households` |
| `timeframe` | `timeframe_type` | Required |
| `period_start` | `date` | Required |
| `period_end` | `date` | Required |
| `currency` | `text` | ISO 4217 code |
| `total_income` | `numeric` | Default `0` |
| `total_expenses` | `numeric` | Default `0` |
| `net_savings` | `numeric` | Default `0` |
| `cumulative_savings` | `numeric` | Default `0` |
| `created_at` | `timestamptz` | Auto |

#### `exchange_rates`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `base_currency` | `text` | ISO 4217 code |
| `target_currency` | `text` | ISO 4217 code |
| `rate` | `numeric` | Required |
| `rate_date` | `date` | Required |
| `fetched_at` | `timestamptz` | Auto |

Unique constraint on `(base_currency, target_currency, rate_date)`.
No RLS — shared cache accessible to all authenticated users.

#### `import_mapping_rules`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `household_id` | `uuid` | FK → `households` |
| `category_id` | `uuid` | Nullable FK → `categories` |
| `name` | `text` | Display label |
| `pattern` | `text` | Regex or substring to match against CSV description |
| `direction` | `text` | `'income'` or `'expense'` |
| `is_active` | `boolean` | Default `true` |
| `sort_order` | `integer` | Default `0` |
| `created_at` | `timestamptz` | Auto |
| `updated_at` | `timestamptz` | Auto |

---

## RLS Policy Summary

All tables except `exchange_rates` have RLS enabled. The helper function `is_household_member(hh_id uuid)` is used by every policy to verify household membership without a round-trip.

| Table | Select | Insert | Update | Delete |
|---|---|---|---|---|
| `profiles` | own row | — | own row | — |
| `households` | member | owner | owner | — |
| `household_members` | member | member/owner | — | member/owner |
| `categories` | system or member | member | member | member (non-system) |
| `financial_accounts` | member | member | member | member |
| `transactions` | member | member | member | member |
| `recurring_transactions` | member | member | member | member |
| `period_snapshots` | member | member | member | member |
| `import_mapping_rules` | member | member | member | member |
| `exchange_rates` | all | all | all | all |

---

## Making Schema Changes

1. Write the migration SQL (alter table, add column, create index, etc.).
2. Run it in the Supabase SQL Editor or via the MCP tool.
3. **Update `supabase/schema.sql`** to reflect the change so other developers can reproduce the full schema.
4. Regenerate TypeScript types:
   ```bash
   npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > src/types/database.ts
   ```
5. Update any affected hooks or components.
6. Commit both `supabase/schema.sql` and `src/types/database.ts` together.

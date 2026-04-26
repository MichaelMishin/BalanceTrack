-- ============================================================
-- BalanceTrack — Complete Database Schema
-- ============================================================
-- Run this script on a fresh Supabase project to recreate
-- the full schema, RLS policies, seed data, and triggers.
--
-- After running this script, regenerate TypeScript types:
--   npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> \
--     > src/types/database.ts
--
-- Last updated: matches src/types/database.ts auto-generated types
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE category_type AS ENUM ('income', 'expense');

CREATE TYPE account_type AS ENUM ('checking', 'savings', 'credit_card', 'other');

CREATE TYPE household_role AS ENUM ('owner', 'member');

CREATE TYPE timeframe_type AS ENUM ('weekly', 'biweekly', 'monthly');

CREATE TYPE transaction_source AS ENUM ('manual', 'bank_import', 'estimated');


-- ============================================================
-- TABLES
-- ============================================================

-- profiles: one row per authenticated user
CREATE TABLE IF NOT EXISTS profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name        text,
  preferred_currency  text        NOT NULL DEFAULT 'USD',
  preferred_timeframe timeframe_type NOT NULL DEFAULT 'monthly',
  savings_target_pct  numeric     NOT NULL DEFAULT 20,
  locale              text        NOT NULL DEFAULT 'en',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- households: shared financial entity for a group of users
CREATE TABLE IF NOT EXISTS households (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  owner_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  default_currency text        NOT NULL DEFAULT 'USD',
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- household_members: links profiles to households with a role
CREATE TABLE IF NOT EXISTS household_members (
  household_id uuid          NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  profile_id   uuid          NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  role         household_role NOT NULL DEFAULT 'member',
  joined_at    timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, profile_id)
);

-- categories: income/expense categories (system-wide + per-household)
CREATE TABLE IF NOT EXISTS categories (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text          NOT NULL,
  name_key     text,                          -- i18n key for system categories
  type         category_type NOT NULL,
  icon         text,                          -- Lucide icon name
  sort_order   integer       NOT NULL DEFAULT 0,
  is_system    boolean       NOT NULL DEFAULT false,
  is_hidden    boolean       NOT NULL DEFAULT false,
  household_id uuid          REFERENCES households(id) ON DELETE CASCADE,
  created_at   timestamptz   NOT NULL DEFAULT now()
);

-- financial_accounts: bank/credit card accounts owned by a household member
CREATE TABLE IF NOT EXISTS financial_accounts (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id        uuid         NOT NULL REFERENCES households(id)  ON DELETE CASCADE,
  owner_id            uuid         NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
  name                text         NOT NULL,
  type                account_type NOT NULL DEFAULT 'checking',
  currency            text         NOT NULL DEFAULT 'USD',
  is_primary_checking boolean      NOT NULL DEFAULT false,
  created_at          timestamptz  NOT NULL DEFAULT now()
);

-- exchange_rates: shared currency conversion cache (no household scoping)
CREATE TABLE IF NOT EXISTS exchange_rates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency   text        NOT NULL,
  target_currency text        NOT NULL,
  rate            numeric     NOT NULL,
  rate_date       date        NOT NULL,
  fetched_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (base_currency, target_currency, rate_date)
);

-- period_snapshots: pre-computed totals for a household period
CREATE TABLE IF NOT EXISTS period_snapshots (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id       uuid          NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  timeframe          timeframe_type NOT NULL,
  period_start       date          NOT NULL,
  period_end         date          NOT NULL,
  currency           text          NOT NULL,
  total_income       numeric       NOT NULL DEFAULT 0,
  total_expenses     numeric       NOT NULL DEFAULT 0,
  net_savings        numeric       NOT NULL DEFAULT 0,
  cumulative_savings numeric       NOT NULL DEFAULT 0,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (household_id, timeframe, period_start)
);

-- transactions: individual financial transactions
CREATE TABLE IF NOT EXISTS transactions (
  id                   uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id         uuid               NOT NULL REFERENCES households(id)          ON DELETE CASCADE,
  entered_by           uuid               NOT NULL REFERENCES profiles(id)            ON DELETE CASCADE,
  category_id          uuid               NOT NULL REFERENCES categories(id)          ON DELETE RESTRICT,
  financial_account_id uuid               REFERENCES financial_accounts(id)           ON DELETE SET NULL,
  amount               numeric            NOT NULL,
  currency             text               NOT NULL DEFAULT 'USD',
  converted_amount     numeric,                    -- amount in household default currency
  exchange_rate        numeric,
  description          text,
  transaction_date     date               NOT NULL,
  source               transaction_source NOT NULL DEFAULT 'manual',
  is_manual            boolean            NOT NULL DEFAULT true,
  is_recurring         boolean            NOT NULL DEFAULT false,
  created_at           timestamptz        NOT NULL DEFAULT now(),
  updated_at           timestamptz        NOT NULL DEFAULT now()
);

-- recurring_transactions: templates that generate transactions on a schedule
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id         uuid          NOT NULL REFERENCES households(id)        ON DELETE CASCADE,
  category_id          uuid          NOT NULL REFERENCES categories(id)        ON DELETE RESTRICT,
  financial_account_id uuid          REFERENCES financial_accounts(id)         ON DELETE SET NULL,
  amount               numeric       NOT NULL,
  currency             text          NOT NULL DEFAULT 'USD',
  description          text,
  frequency            timeframe_type NOT NULL,
  next_due_date        date          NOT NULL,
  is_active            boolean       NOT NULL DEFAULT true,
  is_estimated         boolean       NOT NULL DEFAULT false,
  created_at           timestamptz   NOT NULL DEFAULT now()
);

-- import_mapping_rules: CSV column-mapping rules for bank import auto-categorization
CREATE TABLE IF NOT EXISTS import_mapping_rules (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES households(id)  ON DELETE CASCADE,
  category_id  uuid        REFERENCES categories(id)           ON DELETE SET NULL,
  name         text        NOT NULL,
  pattern      text        NOT NULL,    -- regex or substring match
  direction    text        NOT NULL DEFAULT 'expense',
  is_active    boolean     NOT NULL DEFAULT true,
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_transactions_household_date
  ON transactions (household_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_category
  ON transactions (category_id);

CREATE INDEX IF NOT EXISTS idx_transactions_entered_by
  ON transactions (entered_by);

CREATE INDEX IF NOT EXISTS idx_categories_household
  ON categories (household_id);

CREATE INDEX IF NOT EXISTS idx_period_snapshots_household
  ON period_snapshots (household_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_recurring_household
  ON recurring_transactions (household_id);

CREATE INDEX IF NOT EXISTS idx_import_rules_household
  ON import_mapping_rules (household_id);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup
  ON exchange_rates (base_currency, target_currency, rate_date DESC);


-- ============================================================
-- HELPER FUNCTION (used by RLS policies)
-- ============================================================

CREATE OR REPLACE FUNCTION is_household_member(hh_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM household_members
    WHERE household_id = hh_id
      AND profile_id   = auth.uid()
  );
$$;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE households            ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_snapshots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_mapping_rules  ENABLE ROW LEVEL SECURITY;
-- exchange_rates: no RLS — shared cache, no sensitive data

-- profiles
CREATE POLICY "profiles_select_own"  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE USING (auth.uid() = id);

-- households
CREATE POLICY "households_select_member"
  ON households FOR SELECT USING (is_household_member(id));
CREATE POLICY "households_insert_owner"
  ON households FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "households_update_owner"
  ON households FOR UPDATE USING (auth.uid() = owner_id);

-- household_members
CREATE POLICY "members_select_member"
  ON household_members FOR SELECT USING (is_household_member(household_id));
CREATE POLICY "members_insert_owner"
  ON household_members FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()  -- joining yourself
    OR EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
        AND hm.profile_id   = auth.uid()
        AND hm.role         = 'owner'
    )
  );
CREATE POLICY "members_delete_owner"
  ON household_members FOR DELETE
  USING (
    profile_id = auth.uid()  -- leaving
    OR EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
        AND hm.profile_id   = auth.uid()
        AND hm.role         = 'owner'
    )
  );

-- categories
CREATE POLICY "categories_select_member"
  ON categories FOR SELECT
  USING (is_system = true OR is_household_member(household_id));
CREATE POLICY "categories_insert_member"
  ON categories FOR INSERT WITH CHECK (is_household_member(household_id));
CREATE POLICY "categories_update_member"
  ON categories FOR UPDATE USING (is_household_member(household_id));
CREATE POLICY "categories_delete_member"
  ON categories FOR DELETE USING (is_household_member(household_id) AND is_system = false);

-- financial_accounts
CREATE POLICY "accounts_select_member"
  ON financial_accounts FOR SELECT USING (is_household_member(household_id));
CREATE POLICY "accounts_insert_member"
  ON financial_accounts FOR INSERT WITH CHECK (is_household_member(household_id));
CREATE POLICY "accounts_update_member"
  ON financial_accounts FOR UPDATE USING (is_household_member(household_id));
CREATE POLICY "accounts_delete_member"
  ON financial_accounts FOR DELETE USING (is_household_member(household_id));

-- transactions
CREATE POLICY "transactions_select_member"
  ON transactions FOR SELECT USING (is_household_member(household_id));
CREATE POLICY "transactions_insert_member"
  ON transactions FOR INSERT WITH CHECK (is_household_member(household_id));
CREATE POLICY "transactions_update_member"
  ON transactions FOR UPDATE USING (is_household_member(household_id));
CREATE POLICY "transactions_delete_member"
  ON transactions FOR DELETE USING (is_household_member(household_id));

-- recurring_transactions
CREATE POLICY "recurring_select_member"
  ON recurring_transactions FOR SELECT USING (is_household_member(household_id));
CREATE POLICY "recurring_insert_member"
  ON recurring_transactions FOR INSERT WITH CHECK (is_household_member(household_id));
CREATE POLICY "recurring_update_member"
  ON recurring_transactions FOR UPDATE USING (is_household_member(household_id));
CREATE POLICY "recurring_delete_member"
  ON recurring_transactions FOR DELETE USING (is_household_member(household_id));

-- period_snapshots
CREATE POLICY "snapshots_select_member"
  ON period_snapshots FOR SELECT USING (is_household_member(household_id));
CREATE POLICY "snapshots_insert_member"
  ON period_snapshots FOR INSERT WITH CHECK (is_household_member(household_id));
CREATE POLICY "snapshots_update_member"
  ON period_snapshots FOR UPDATE USING (is_household_member(household_id));
CREATE POLICY "snapshots_delete_member"
  ON period_snapshots FOR DELETE USING (is_household_member(household_id));

-- import_mapping_rules
CREATE POLICY "import_rules_select_member"
  ON import_mapping_rules FOR SELECT USING (is_household_member(household_id));
CREATE POLICY "import_rules_insert_member"
  ON import_mapping_rules FOR INSERT WITH CHECK (is_household_member(household_id));
CREATE POLICY "import_rules_update_member"
  ON import_mapping_rules FOR UPDATE USING (is_household_member(household_id));
CREATE POLICY "import_rules_delete_member"
  ON import_mapping_rules FOR DELETE USING (is_household_member(household_id));


-- ============================================================
-- AUTO-SIGNUP TRIGGER
-- Creates a profile, a default household, and copies system
-- categories for every new Supabase Auth user.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_household_id uuid;
BEGIN
  -- 1. Create profile
  INSERT INTO profiles (id, display_name, preferred_currency, locale)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'USD',
    'en'
  );

  -- 2. Create a default household
  INSERT INTO households (name, owner_id, default_currency)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)) || '''s Household',
    NEW.id,
    'USD'
  )
  RETURNING id INTO new_household_id;

  -- 3. Add user as owner member
  INSERT INTO household_members (household_id, profile_id, role)
  VALUES (new_household_id, NEW.id, 'owner');

  -- 4. Copy system categories to the new household
  INSERT INTO categories (name, name_key, type, icon, sort_order, is_system, household_id)
  SELECT name, name_key, type, icon, sort_order, false, new_household_id
  FROM categories
  WHERE is_system = true;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- SYSTEM CATEGORIES SEED DATA
-- These are the default categories copied to every new household.
-- Run ONCE on the Supabase project — the trigger copies them.
-- ============================================================

INSERT INTO categories (name, name_key, type, icon, sort_order, is_system, household_id) VALUES
-- Income
('Salary',        'categories.salary',      'income',  'Briefcase',     1,  true, NULL),
('Freelance',     'categories.freelance',   'income',  'Laptop',        2,  true, NULL),
-- Expenses
('Housing',       'categories.housing',     'expense', 'Home',          10, true, NULL),
('Utilities',     'categories.utilities',   'expense', 'Zap',           11, true, NULL),
('Groceries',     'categories.groceries',   'expense', 'ShoppingCart',  12, true, NULL),
('Transport',     'categories.transport',   'expense', 'Car',           13, true, NULL),
('Health',        'categories.health',      'expense', 'Heart',         14, true, NULL),
('Dining',        'categories.dining',      'expense', 'UtensilsCrossed',15, true, NULL),
('Entertainment', 'categories.entertainment','expense','Tv',             16, true, NULL),
('Shopping',      'categories.shopping',    'expense', 'ShoppingBag',   17, true, NULL),
('Education',     'categories.education',   'expense', 'BookOpen',      18, true, NULL),
('Savings',       'categories.savings',     'expense', 'PiggyBank',     19, true, NULL),
('Insurance',     'categories.insurance',   'expense', 'Shield',        20, true, NULL),
('Subscriptions', 'categories.subscriptions','expense','RefreshCw',     21, true, NULL),
('Personal Care', 'categories.personalCare','expense', 'Smile',         22, true, NULL),
('Gifts',         'categories.gifts',       'expense', 'Gift',          23, true, NULL),
('Travel',        'categories.travel',      'expense', 'Plane',         24, true, NULL),
('Childcare',     'categories.childcare',   'expense', 'Baby',          25, true, NULL),
('Pets',          'categories.pets',        'expense', 'PawPrint',      26, true, NULL),
('Electronics',   'categories.electronics', 'expense', 'Cpu',           27, true, NULL),
('Home Repairs',  'categories.homeRepairs', 'expense', 'Wrench',        28, true, NULL),
('Sports',        'categories.sports',      'expense', 'Dumbbell',      29, true, NULL),
('Charity',       'categories.charity',     'expense', 'HandHeart',     30, true, NULL),
('Taxes',         'categories.taxes',       'expense', 'Receipt',       31, true, NULL),
('Bank Fees',     'categories.bankFees',    'expense', 'Landmark',      32, true, NULL),
('Clothing',      'categories.clothing',    'expense', 'Shirt',         33, true, NULL),
('Furniture',     'categories.furniture',   'expense', 'Sofa',          34, true, NULL),
('Business',      'categories.business',    'expense', 'Building2',     35, true, NULL),
('Hobbies',       'categories.hobbies',     'expense', 'Palette',       36, true, NULL),
('Other',         'categories.other',       'expense', 'MoreHorizontal',99, true, NULL)
ON CONFLICT DO NOTHING;

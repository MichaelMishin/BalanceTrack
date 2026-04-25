# BalanceTrack — Roadmap

## Phase 1: Foundation (DONE)
- [x] Supabase project provisioned (eu-central-1)
- [x] React + Vite + TypeScript scaffolding
- [x] Tailwind CSS v4 with dark-mode fintech design system (IBM Plex Sans)
- [x] shadcn/ui components installed (16 components)
- [x] Project folder structure (components, pages, hooks, lib, stores, i18n, types)
- [x] Supabase client + typed Database interface
- [x] Database schema: 9 tables with indexes, enums, triggers
- [x] Row Level Security (RLS) policies on all tables
- [x] Security advisors clean (0 warnings)
- [x] Default categories seeded (2 income + 30 expense)
- [x] Auto-signup trigger (creates profile → household → copies categories)
- [x] i18n setup (English + Hebrew with RTL)
- [x] Auth pages (email/password + Google OAuth)
- [x] Auth context + Household context providers
- [x] Main layout (sidebar + navbar with period navigation)
- [x] Dashboard page (Money In / Money Out / Summary / Pie Chart / Insights)
- [x] Personal View page
- [x] Transaction form (add/edit with multi-currency conversion preview)
- [x] Category detail (expandable rows with per-transaction details)
- [x] Expense donut chart (Recharts, accessible data table, tooltips)
- [x] Savings gauge (SVG, color-coded)
- [x] Settings page (profile, currency, timeframe, savings target, language)
- [x] Categories page (add/rename/hide categories)
- [x] Financial accounts management
- [x] Insights engine (overspending, category spikes, on-track)
- [x] Currency conversion lib (ExchangeRate-API + DB cache)
- [x] Savings/period snapshot hooks

## Phase 2: Polish & Testing (NEXT)
- [x] Clean up unused Vite template files (App.css, assets/)
- [x] Fix TypeScript strict-mode warnings
- [x] Add loading skeletons for all data-fetching pages
- [x] Add empty-state illustrations for zero-data scenarios
- [x] End-to-end tests (Playwright)
- [x] Transaction list view with filters (date range, category, type)
- [ ] Household invite/join flow (invite by email, accept invite)
- [ ] Period snapshot auto-computation (daily cron or on-demand)
- [ ] Recurring transaction generation (Edge Function or pg_cron)
- [ ] Paycheck estimation from historical data
- [x] Unit tests for hooks and utility functions

## Phase 3: Advanced Features
- [ ] Data export (CSV/PDF per period)
- [ ] Bank import via CSV upload
- [ ] Advanced insights (historical comparison, trend analysis)
- [ ] Budget limits per category with alerts
- [ ] Drag-and-drop category reordering
- [ ] Custom Lucide icon picker for categories
- [ ] Dark/light mode persistence (localStorage)

## Phase 4: Mobile
- [ ] Capacitor integration (iOS/Android compilation)
- [ ] PWA manifest + service worker
- [ ] Push notifications for budget warnings
- [ ] Native-feel navigation (bottom tabs on mobile)
- [ ] Offline support with local-first sync

## Phase 5: Integrations
- [ ] Plaid API integration for automated bank/credit card import
- [ ] Automated paycheck detection from bank transactions
- [ ] Auto-categorization of imported transactions (rule-based)
- [ ] Email notifications for period summaries

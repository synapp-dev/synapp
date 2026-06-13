# Supersolt v1 launch — test checklist

> **Use this during a staging dry-run.** Check boxes as you go.  
> **Scope:** v1 = onboarding (Phase 1a wizard) + Square → Sales + invoice automation (≥1 path) + thin Invoices UI.  
> **References:** [Module Overview (Notion)](https://www.notion.so/34f64094bde68086bf03c99d2c737068) · [`module-overview-program.md`](module-overview-program.md) · [`roadmap.md`](roadmap.md) · fuller matrix in [`production-readiness-checklist.md`](production-readiness-checklist.md)

**Tester:** _______________  
**Environment:** staging / production dry-run  
**Date:** _______________  
**Git SHA / build:** _______________

---

## Before you start

- [ ] Supabase migrations applied (incl. `onboarding_setup_progress`, `venues_data_starts_from`)
- [ ] `.env.local` matches [`.env.example`](../.env.example) for this environment (auth, `DATABASE_URL`, Square, Xero, `CRON_SECRET`, etc.)
- [ ] Test user email is on the **whitelist**
- [ ] Square sandbox (or prod) OAuth redirect URI matches env
- [ ] Note canonical routes: **`/purchasing/invoices`** (not `…/inventory/invoices`), **`/stock-management/*`** (not legacy inventory paths)

---

## A. v1 launch gate — must all pass

These block go-live. If any fail, log repro steps at the bottom of this file.

### A1. Authentication

- [ ] Whitelisted email: request OTP / magic link → arrives → verify → session active
- [ ] Non-whitelisted email: rejected with generic message (no account enumeration leak)
- [ ] Visit protected route while logged out → redirect to `/auth`
- [ ] `/auth/callback` completes without error loop
- [ ] Logout → session cleared; login again works

### A2. Onboarding (Phase 1a wizard)

**Entry**

- [ ] Incomplete user lands on `/setup` (not full app nav)
- [ ] User with `setup_completed_at` set → redirected away from setup (e.g. dashboard)

**Mandatory path**

- [ ] Step 1: save organisation (name required)
- [ ] Step 2: save venue with **Sales history starts from** date (`data_starts_from`)
- [ ] Step 3: Square OAuth succeeds; connected state shown
- [ ] Cannot advance past step 3 without Square connected
- [ ] Cannot **Confirm and go live** without Square connected
- [ ] Square OAuth failure/cancel: retry path works (no dead end)

**Early Sales (instant value)**

- [ ] After Square connect, sidebar shows **Setup** + **Sales Insights** (during setup)
- [ ] Can open `/{org}/{venue}/insights/sales` **before** finalize (cookie `ss_onboarding_early_sales`)
- [ ] Sales page shows **live** Square data (no DEMO banner when integration is live)

**Optional steps**

- [ ] Skip Xero: dialog explains consequence → progress saved → can continue
- [ ] Skip team invites: dialog explains consequence → progress saved → can continue
- [ ] Connect Xero from step 4 (if testing): connection state updates

**Finalize**

- [ ] Finalize succeeds with Square + org + ≥1 venue
- [ ] After finalize: full sidebar unlocks (not stuck on setup-only nav)
- [ ] `needsSetup` cleared on `/api/me` or equivalent
- [ ] Early-sales cookie no longer required for normal navigation

**Resume**

- [ ] Refresh browser mid-wizard → resumes at sensible step
- [ ] URL `?step=` deep link respects gates (cannot jump ahead of Square)

### A3. Tenancy & access

- [ ] After login, user reaches valid `/{organisation}/{venue}/…` scope
- [ ] Venue switcher changes venue; navigation stays coherent
- [ ] `GET /api/access/context` returns expected roles for test user
- [ ] Staff (non-admin) user: cannot access admin-only settings (spot-check one route)
- [ ] User without venue access: API returns 403 or safe redirect (one negative test)

### A4. Square → Sales Insights

- [ ] Square OAuth from **Settings → Integrations** reconnect works (post-onboarding)
- [ ] Sales insights: KPIs/charts load with real data for connected venue
- [ ] Period / tab UI behaves (no crash on empty range if applicable)

### A5. Invoice automation (≥ one path)

Pick the path(s) you ship in this environment and check each enabled path:

**Manual upload**

- [ ] `/{org}/{venue}/purchasing/invoices` loads
- [ ] Upload PDF/image → appears in list or **pending review** queue
- [ ] Background parse/review pipeline completes (no stuck spinner forever)

**Xero sync** (if enabled)

- [ ] Xero connected for venue
- [ ] Cron or manual sync creates/updates invoice rows without operator in UI
- [ ] `GET` stale-invoice / xero-invoice cron runs once in logs without 500

**Email inbound** (if enabled)

- [ ] Test message documented in runbook → invoice row or parse job created

**Automation health**

- [ ] At least one path above verified end-to-end in staging
- [ ] Stale-invoice cron (if configured): single run OK in logs

### A6. Invoices UI (thin v1)

- [ ] Invoice list loads with real or test data
- [ ] Open invoice detail panel/sheet
- [ ] Pending review queue (if applicable): item openable
- [ ] Confirm or dispute (or equivalent status change) without breaking list
- [ ] Cost-change confirm dialog on first supplier price change (if implemented)

---

## B. Cross-module checks (v1-relevant)

- [ ] Onboarding → Square → Sales reachable (see A2 + A4)
- [ ] Invoice lines reference a supplier where expected
- [ ] Agent `suggest_app_navigation` (if used): links use **`purchasing/*`**, not legacy `inventory/invoices`
- [ ] Permissions: invited manager can access scoped routes; cannot access org-admin-only settings

| Integration | Pass |
|-------------|------|
| Onboarding → Square → Sales | [ ] |
| Upload/Xero → Invoices list | [ ] |
| Permissions → nav visibility | [ ] |
| Agent → live routes | [ ] |

---

## C. Engineering gates (quick)

- [ ] `pnpm typecheck` in `apps/supersolt` passes
- [ ] `pnpm lint:architecture` from monorepo root passes
- [ ] `pnpm exec vitest run entities/onboarding/lib/module-gates.test.ts` passes (or full test suite if time allows)

---

## D. Non-functional spot checks

- [ ] RLS: second test user cannot read first user's org/venue data (one API or UI check)
- [ ] Primary list pages: loading and error states (throttle network once)
- [ ] Auth + one workforce page usable at ~390px width (optional but recommended)

---

## E. Smoke only — does not block v1

Check if you have time; failures here are backlog, not launch blockers.

### Insights (beyond Sales)

- [ ] Labour insights tab loads (DEMO label OK)
- [ ] Inventory insights tab loads (DEMO label OK)
- [ ] P&L tab: empty/TBC scaffold OK (Notion spec blank)

### Dashboard & Agent

- [ ] `/{org}/{venue}/dashboard` loads
- [ ] `/agent` or scoped agent route responds

### Purchasing & stock

- [ ] `purchasing/suppliers` list + detail
- [ ] `purchasing/orders` (order guide / POs) loads
- [ ] `stock-management/stock-counts` page loads
- [ ] `stock-management/waste` entry saves

### Workforce

- [ ] `workforce/people` list
- [ ] `workforce/roster` week grid
- [ ] `workforce/timesheets` period list
- [ ] `settings/award-rates` loads for org admin

### Settings

- [ ] `settings/permissions` — invite / role change
- [ ] `settings/integrations` — Square/Xero reconnect
- [ ] `settings/organisation` / `settings/venues` save

### Operations

- [ ] `operations/daybook` loads

---

## F. Explicitly out of v1 — do not block launch

Do **not** check these as launch requirements:

- [ ] ~~Agent-owned `/setup` (Phase 1b)~~
- [ ] ~~Full sidebar blur/unblur for every onboarding step~~
- [ ] ~~Onboarding wizard steps: import items, suppliers, recipes in-setup~~
- [ ] ~~P&L business logic~~ (Notion page blank)
- [ ] ~~Flash P&L, Reviews~~ (Phase 2)
- [ ] ~~Employee self-onboarding `/onboard/{token}`~~
- [ ] ~~Multi-venue copy-from-venue-1, multi-org migration~~
- [ ] ~~Deep forecast consumers on Order Guide~~

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering | | | |
| Product / QA | | | |

**Launch decision:** ☐ Go · ☐ No-go (see issues below)

---

## Issues found (repro notes)

| # | Area | Steps | Expected | Actual | Severity |
|---|------|-------|----------|--------|----------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

# Supersolt production readiness checklist

> Manual QA for v1 launch. Complements automated tests in each feature `tdd.md`.  
> **Program:** [`module-overview-program.md`](module-overview-program.md)  
> **Last updated:** 2026-06-01  
> **Working copy for test sessions:** [`launch-test-checklist.md`](launch-test-checklist.md) (v1 gates + sign-off table)

Sign off each section in staging (or production dry-run) before go-live. Record tester, date, and build SHA in your release notes.

---

## 1. Environment and gates

- [ ] Supabase project linked (`user-supabase-supersolt-mvp`); migrations applied (`supabase/migrations/`)
- [ ] Env from [`.env.example`](../.env.example): auth, Square, Xero, cron secrets, AI agent keys as needed
- [ ] `pnpm lint:architecture` passes from monorepo root
- [ ] Cron routes reachable with `CRON_SECRET`: `app/api/cron/*` (stale invoices, payroll retry, timesheet auto-clock-out, xero invoice sync, etc.)
- [ ] Optional: demo seed run; document if staging uses seeded data

---

## 2. Core loop (v1 — must pass)

### Auth

- [ ] Whitelisted email receives OTP / magic link; non-whitelisted gets generic rejection
- [ ] `/auth/callback` completes session; protected routes redirect unauthenticated users to `/auth`
- [ ] Trial-expired account blocked with clear message (if trial enforcement enabled)
- [ ] Logout clears session; return URL preserved on re-login

### Onboarding

- [ ] `/setup` loads for org with incomplete onboarding; completed org redirects to dashboard
- [ ] Mandatory path: organisation → venues → Square connect (verify OAuth success + failure retry)
- [ ] Optional steps skippable with consequence messaging (Xero, suppliers, recipes, team) per spec
- [ ] `needsSetup` / finalize clears; main sidebar modules unlock (not stuck on setup-only nav)
- [ ] Multi-venue: second venue prompt or copy-from-venue-1 where implemented

### Tenancy

- [ ] After login, user lands in valid `/{organisation}/{venue}/…` scope
- [ ] Venue switcher changes venue; same nav section preserved where designed
- [ ] `/api/access/context` returns roles; staff cannot open admin-only settings
- [ ] Deep link to scoped route works when user has access; 403/redirect when not

### POS → Sales

- [ ] Square OAuth from setup or settings integrations
- [ ] Insights → Sales shows live data (no DEMO banner when integration live)
- [ ] Period selector and tab shell persist as designed

### Invoice automation

- [ ] At least one ingestion path configured (Xero sync, upload, or email — per env)
- [ ] Background job/cron creates or updates invoice rows without operator in UI
- [ ] Stale-invoice cron runs without error in logs

### Invoices UI (thin v1)

- [ ] `…/purchasing/invoices` list loads
- [ ] Open invoice detail; pending review queue if applicable
- [ ] Basic status transition (confirm / dispute) without blocking automation setup

---

## 3. Per-module smoke (venue-scoped)

### W1 — Foundation

**Authentication**

- [ ] Email entry → OTP verify → session
- [ ] Multi-org user sees org picker when applicable

**Onboarding**

- [ ] Resume incomplete step after browser refresh
- [ ] Square failure shows retry; cannot finalize without POS if mandatory in env

**Tenancy**

- [ ] Non-member email cannot access venue APIs (spot-check one 403)

### W2 — Invoicing

**Invoices module**

- [ ] Upload dialog accepts PDF/image; lands in pending review
- [ ] Cost-change confirm dialog on first price change per session (if implemented)

**Email infrastructure**

- [ ] Inbound path documented in staging (webhook or cron) processes test message

### W3 — Insights

**Sales**

- [ ] Tab loads; KPIs or charts render with Square data

**Labour / Inventory insights**

- [ ] Tabs load; DEMO/seeded states labeled if data not live

**P&L**

- [ ] Route gated; empty/TBC state if Notion spec blank

**Forecast engine**

- [ ] Daily sales/forecast rows exist for venue after sync job

### W4 — Dashboard & Agent

**Dashboard**

- [ ] Venue dashboard loads widgets; links to insights/modules work

**Agent**

- [ ] `/agent` and scoped agent route respond
- [ ] `suggest_app_navigation` returns `purchasing/*` paths (not legacy `inventory/invoices`)

### W5 — Stock & purchasing

**Stock management**

- [ ] Stock counts page loads; create/submit count if API exists
- [ ] Waste entry saves

**Purchasing**

- [ ] Suppliers list and detail
- [ ] Order guide / PO list; create draft PO if in scope
- [ ] Supplier product → ingredient mapping visible

### W6 — Workforce

**People**

- [ ] People list; add/edit member

**Roster**

- [ ] Week grid loads; add/edit shift
- [ ] Publish flow or draft state per implementation

**Timesheets**

- [ ] Period list; approve entry (manager)

**Leave / Availability**

- [ ] Request leave; set availability pattern

**Payroll export**

- [ ] Preview run; export blocked on wage-theft flags per spec

**Award rates**

- [ ] Org award config loads; venue inherits

### W7 — Settings & operations

**Settings**

- [ ] Permissions: invite, role change, archive member
- [ ] Integrations: Square/Xero reconnect
- [ ] Organisation / venue settings save

**Daybook**

- [ ] Daybook page loads for venue

### W8 — Phase 2 (not v1 sign-off)

- [ ] Flash P&L: route may 404 or placeholder — **do not block v1**
- [ ] Reviews: route may 404 or placeholder — **do not block v1**

---

## 4. Cross-module integration matrix

| From | To | Test | Pass |
|------|-----|------|------|
| Onboarding | Square | OAuth unlocks Sales | [ ] |
| Onboarding | Suppliers | Supplier seed enables purchasing | [ ] |
| Roster | Timesheets | Published shifts visible in timesheets | [ ] |
| Timesheets | Payroll export | Approved hours in payroll preview | [ ] |
| Award library | Roster | Costing uses award rates (not hardcoded mock) | [ ] |
| Forecast engine | Sales / Order guide | Forecast data consumed | [ ] |
| Suppliers | Invoices | Supplier on invoice lines | [ ] |
| Invoice confirm | Recipes / Sales GP | Cost propagation prompt | [ ] |
| Permissions | All modules | Staff nav hides admin routes | [ ] |
| Agent | Nav catalog | Links match live routes | [ ] |

---

## 5. Non-functional

- [ ] RLS: User A cannot read User B's org venue data (one negative test)
- [ ] Cron jobs: run each configured job once in staging; no unhandled 500
- [ ] Mobile width: auth + timesheets clock UI usable at 390px
- [ ] Slow network: primary list pages show loading/error, not infinite spinner

---

## 6. Explicitly out of v1 sign-off

- Flash P&L, Reviews (Phase 2)
- Full agent-driven onboarding UX (if still wizard — track in [`onboarding/plan.md`](features/onboarding/plan.md))
- P&L logic until Notion Module Overview body exists
- Deep Workforce Phase 2 (staff app, geofencing, etc.) per child plans

---

## Sign-off

| Role | Name | Date | Build |
|------|------|------|-------|
| Engineering | | | |
| Product / QA | | | |

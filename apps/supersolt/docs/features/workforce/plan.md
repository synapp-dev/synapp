# Workforce (parent)

> **Product:** `apps/supersolt`
> **Slug:** `workforce`
> **Route:** `/{organisation}/{venue}/workforce`
> **Status:** In progress
> **Owner:** TBD
> **Created:** 2026-05-31
> **Updated:** 2026-06-01 (people triad)

## 1. Summary

Workforce is the people side of Supersolt: employee records, availability, leave, rostering, timesheets, and payroll export. It saves operators 5–10 hours/week of admin and reduces Fair Work compliance risk. The module is a peer to Purchasing and Stock Management — downstream of Onboarding and upstream of Insights → Labour, Flash P&L (Phase 2), and the compliance forecasting bundle (P2.6).

**Personas:** Owner / Area Manager (org-wide setup, payroll sign-off, multi-venue roster cost); Venue Manager (day-to-day roster, leave, timesheets); Staff (mobile clock-in/out on Timesheets; roster via email/PDF in Phase 1; swaps/open-shift pickup Phase 2).

**Notion:** [Workforce (Module Overview)](https://www.notion.so/34f64094bde680d0bd7de16209ff9344)

## 2. Scope

### In scope (MVP / Phase 1)

- Six sub-modules at functional MVP level (see child table below)
- Single Touch Payroll data preparation in Payroll Export (Xero lodges with ATO)
- Award classification capture; penalty rate awareness in roster + payroll math via **Award Rate Library**
- Multi-venue support (employees may work across venues; org-scoped compliance checks)
- Permission gating (Owner / Area Manager / Venue Manager / Staff)
- Audit trails on sensitive operations (pay rate changes, leave approvals, compliance overrides, payroll exports)
- Phase 1 roster delivery: **email + PDF** (no in-app roster view for staff); **Timesheets** staff mobile clock-in/out per [Notion Timesheets](https://www.notion.so/34f64094bde68098a187cddc4c51b467)
- Notifications for roster publication, leave decisions, payroll due (when Notifications module lands)

### Out of scope (Phase 2+)

- AU compliance bundle (P2.6): award uplift projection, penalty forecasting, license expiry dashboards, BAS/super forecasting
- Hardware time-and-attendance (biometric, RFID)
- In-app payslip viewing (Xero is source of truth in MVP)
- Performance management, recruitment, worker's comp, full LMS
- EBA support, tips/gratuity handling
- Dedicated native crew app; in-app roster view; swaps, open-shift pickup — Phase 2 (Timesheets browser clock-in is Phase 1)

### Non-goals

- Promoting Workforce UI to `packages/*` before a second app consumer ([ARCHITECTURE.md §5.1](../../../../ARCHITECTURE.md))
- App-to-app imports ([ARCHITECTURE.md §3.1](../../../../ARCHITECTURE.md))
- Agent read access to sensitive fields (TFN, super, bank, visa numbers)

## The workforce lifecycle

```
People setup → Availability → Leave → Roster (draft/publish) → Timesheets (actuals) → Payroll Export → Xero
```

The [**Award Rate Library**](https://www.notion.so/36264094bde681449229f6912d2f6451) is the shared costing + compliance spine beneath Roster and Payroll Export (MA000119 + MA000009 live; MA000003 + MA000020 ready to load).

## Child feature triads

Each sub-module owns `plan.md`, `tdd.md`, `flows.md` when engineering work begins. Implement in dependency order in §8.

| Child folder | Route | Notion | Primary dependency | Status |
|--------------|-------|--------|-------------------|--------|
| [`people/`](people/plan.md) | `/workforce/people` | [People](https://www.notion.so/34f64094bde6808393eee71ac4e611e8) | Onboarding, Permissions | **specced** |
| [`availability/`](availability/plan.md) | `/workforce/availability` · `/me` | [Availability](https://www.notion.so/34f64094bde680af8d86f371fdb250b8) | People | **specced** |
| [`leave/`](leave/plan.md) | `/workforce/leave` | [Leave](https://www.notion.so/34f64094bde680f8a37cd54ff7106475) | People | **specced** |
| [`roster/`](roster/plan.md) | `/workforce/roster` | [Roster](https://www.notion.so/34f64094bde680a2a2f8e7a582110aab) | People, Availability, Leave, Forecast, Award Library | **specced** |
| [`timesheets/`](timesheets/plan.md) | `/workforce/timesheets` | [Timesheets](https://www.notion.so/34f64094bde68098a187cddc4c51b467) | Roster (published shifts), People, Leave | **specced** |
| [`payroll-export/`](payroll-export/plan.md) | `/workforce/payroll-export` | [Payroll Export](https://www.notion.so/34f64094bde6809fbb84e54ef1bd8269) | Timesheets, People, Leave, Award Library, Xero | **specced** |
| [`award-rate-library/`](award-rate-library/plan.md) | `/settings/award-rates` | [Award Rate Library](https://www.notion.so/36264094bde681449229f6912d2f6451) | Settings → Organisation | **specced** |

> **Roster is the integration layer** — reads every other Workforce sub-module plus Forecast Engine and Award Rate Library. Foundations (People, Availability, Leave) should reach MVP data contracts before Roster Phase 1 ships compliance + costing features.

## Notion specification

### Cross-cutting decisions (locked)

- **Position taxonomy in People** — 11 default positions; configurable per org; default pay rate overridable per employee.
- **Every employee is a platform user in MVP** — `employees` row paired with `users` row.
- **Roles (permissions) decoupled from positions (stations).**
- **AU compliance fields foundational** — award classification, TFN, super (12% from 1 July 2025), long service from start date.
- **Sensitive fields** (TFN, super, bank, visa, tax codes) — **employee + Owner only** (not Area Manager); Agent blocked.
- **Xero is canonical payroll** — Supersolt exports wage journal; Xero handles payment / payslip / STP lodgement.
- **Forecast Engine → Roster** — hourly demand overlay + hourly/daily labour budget (**Phase 1**, supersedes earlier daily-only note).
- **AI auto-build = Phase 1** — draft-only; operator review required.
- **Penalty-aware live costing = Phase 1** — Award Rate Library order-of-operations pipeline.
- **Tiered compliance** — hard-block vs warn-with-override-and-reason.
- **Phase 1 roster delivery** — email + PDF (no in-app roster for staff); **Timesheets** provides browser mobile clock-in/out ([`timesheets/plan.md`](timesheets/plan.md)).

### Permission gating

| Role | Sees | Edits |
|------|------|-------|
| Owner | All employees in scope; all sensitive fields | Everything |
| Area Manager | All employees in scope; **non-sensitive** fields only | Same as Venue Manager at org scope; **not** TFN/super/bank/visa/tax codes |
| Venue Manager | Employees at their venue(s), non-sensitive fields | Non-sensitive employee details, leave approvals, roster, timesheets, payroll export |
| Staff | Own record only, non-sensitive (+ own sensitive) | Own availability, leave requests, clock-in/out, timesheet disputes; own TFN/super/bank |

Sensitive fields (TFN, super, bank, visa detail, tax treatment, STP2 income type) visible only to the **employee** and the **Owner** (`grants_org_admin`). See [`people/plan.md`](people/plan.md) §7.

### Other modules this touches

Onboarding → Invite Team, Settings (Permissions, Venues, Organisation, Integrations), Forecast Engine, Sales Insights, Insights → Labour, Flash P&L (Phase 2), Agent, Email Infrastructure, Notifications (when specced).

## Open questions

### Product (from Notion)

- Multi-org employee records — separate in MVP (privacy); Phase 2 evaluate shared identity.
- Casual conversion compliance — flag on People; no automated workflow in MVP.
- EBA support — out of MVP.
- Award interpreter depth — standard rates in MVP; full interpreter Phase 2 (P2.6).
- Tips/gratuity — out of MVP.
- Visa expiry — capture on People; proactive workflow Phase 2.
- Annualised salaries — supported via employment type + annual pay rate field.

### Engineering

- [x] Award Rate Library triad — [`award-rate-library/plan.md`](award-rate-library/plan.md) (owner: eng, due: before roster Phase 1 merge).
- [ ] Forecast Engine **hourly** grain — Roster Notion spec requires hourly overlay; extend [`forecast-engine/plan.md`](../insights-platform/forecast-engine/plan.md) or document interim daily-only degradation (owner: eng, due: roster sprint 1).

## Decision log

- *3 May 2026 (Notion)* — Six sub-modules; Roster is integration layer; every employee is a platform user.
- *25 May 2026 (Notion)* — Roster fully specced: hourly overlay, penalty costing, AI auto-build, tiered compliance, email+PDF delivery, Phase 1 data model for Phase 2 crew app.
- *31 May 2026* — Parent `workforce/plan.md` created from Module Overview; [`roster/`](roster/plan.md) triad is first engineering spec (gap-fill from existing grid CRUD).
- *31 May 2026* — [`availability/`](availability/plan.md) triad: full Notion model redo (4 blocks, approvals, `/me` staff route); atomic cutover from legacy day/HH:mm tables.
- *31 May 2026* — [`leave/`](leave/plan.md) triad: full Notion MVP (balances, accrual on timesheet approve, workflow, LSL, DFV privacy, syncs); replaces demo seeded UI.
- *31 May 2026* — [`timesheets/`](timesheets/plan.md) triad: full Notion MVP + MVP-light (staff clock-in/out, variance, disputes, pay periods, leave accrual hook, payroll staging); supersedes earlier “manual actuals only” note for this sub-module.
- *31 May 2026* — [`payroll-export/`](payroll-export/plan.md) triad: full Notion Compliance Floor A (hybrid Xero **Approve and pay**, pre-flight Wage Theft check, calculation engine, Owner workflow, FDV suppression, status pipeline); People triad hard prerequisite for payroll profile DDL.
- *31 May 2026* — [`award-rate-library/`](award-rate-library/plan.md) triad: full Notion MVP engine (MA000119 + MA000009 seed, rule-pack pipeline, platform-global DDL, Settings tab, AWR selective apply, atomic roster/payroll consumer migration); supersedes payroll-export interim `payroll_penalty_rate_config`.

## 3. Architecture placement

| Decision | Choice | ARCHITECTURE.md |
|----------|--------|-----------------|
| Lives in app | `apps/supersolt` only | §3.2, §5.1 |
| Domain | `server/workforce/`, `entities/workforce/` (roster UI extraction), route-colocated `_components/` during migration | §7.1 |
| Shell | `components/organisms/app-sidebar.tsx`, `app/(main)/[org]/[venue]/workforce/*` | §7.1 |
| Auth | `@/lib/api/route-auth` → `RequestAuthContext` → Drizzle RLS (`AGENTS.md`) | §3.2, §8.1 |
| UI primitives | `@workspace/ui` | §6, §7.1 |
| New package edges | None | §3.2 |

## 4. Shared data contracts

Workforce-wide tables already in schema (partial):

- `positions`, `roster_shifts`, `roster_templates`, `roster_template_shifts`
- Venue staff assignment; availability migrates to Notion model in [`availability/plan.md`](availability/plan.md) (replaces `venue_staff_weekly_*` tables)

Child plans own additional DDL. Roster introduces `roster_weeks`, `shift_compliance_flags`, cost columns on shifts, and Timesheet/Break skeleton per Notion.

## 5. Rollout

- **Feature flag:** none for Workforce shell (nav always visible for operators); optional `ROSTER_AUTO_BUILD_ENABLED` for AI draft (env in roster plan).
- **Migration sequencing:** app-owned SQL in `apps/supersolt/supabase/migrations/`; apply via Supabase MCP (`user-supabase-supersolt-mvp`) in same order as committed files; `pnpm drizzle:pull` after apply.
- **Backout:** roster migrations are forward-only; publish pipeline can be disabled via flag without DDL rollback.

## 6. Implementation order (platform)

1. People MVP data model + UI (blocking roster compliance inputs)
2. Availability + [`Leave`](leave/plan.md) MVP (blocking roster hard-blocks)
3. Award Rate Library (blocking penalty costing + compliance rules)
4. Forecast Engine hourly extension (blocking demand overlay — or ship roster with daily budget first)
5. **[`roster/`](roster/plan.md)** — primary integration deliverable
6. **[`timesheets/`](timesheets/plan.md)** — staff clock + manager approve (consumes published roster)
7. Payroll Export (consumes approved timesheets)
8. Remaining child triads as needed

## 7. Cross-references

- People triad: [`people/plan.md`](people/plan.md) · [`people/tdd.md`](people/tdd.md) · [`people/flows.md`](people/flows.md)
- Roster triad: [`roster/plan.md`](roster/plan.md) · [`roster/tdd.md`](roster/tdd.md) · [`roster/flows.md`](roster/flows.md)
- Availability triad: [`availability/plan.md`](availability/plan.md) · [`availability/tdd.md`](availability/tdd.md) · [`availability/flows.md`](availability/flows.md)
- Leave triad: [`leave/plan.md`](leave/plan.md) · [`leave/tdd.md`](leave/tdd.md) · [`leave/flows.md`](leave/flows.md)
- Timesheets triad: [`timesheets/plan.md`](timesheets/plan.md) · [`timesheets/tdd.md`](timesheets/tdd.md) · [`timesheets/flows.md`](timesheets/flows.md)
- Payroll Export triad: [`payroll-export/plan.md`](payroll-export/plan.md) · [`payroll-export/tdd.md`](payroll-export/tdd.md) · [`payroll-export/flows.md`](payroll-export/flows.md)
- Award Rate Library triad: [`award-rate-library/plan.md`](award-rate-library/plan.md) · [`award-rate-library/tdd.md`](award-rate-library/tdd.md) · [`award-rate-library/flows.md`](award-rate-library/flows.md)
- Insights Labour (downstream): [`../insights-platform/labour/plan.md`](../insights-platform/labour/plan.md)
- Forecast Engine (upstream): [`../insights-platform/forecast-engine/plan.md`](../insights-platform/forecast-engine/plan.md)
- Architecture: [ARCHITECTURE.md](../../../../ARCHITECTURE.md)
- Program index: [`module-overview-program.md`](../../module-overview-program.md)

## Compliance audit (program 2026-06-01)

| Child | Triad | Audit |
|-------|-------|-------|
| People | Added | Done — ESO route pending |
| Roster | Existing gap matrix | Done — refresh on implementation |
| Timesheets, Leave, Availability, Payroll, Award | Full triads | Done |
| Employee Self-Onboarding | § `people/flows.md` | Deferred implementation |

**Updated:** 2026-06-01

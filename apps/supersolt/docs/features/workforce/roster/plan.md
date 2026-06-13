# Roster

> **Product:** `apps/supersolt`
> **Slug:** `workforce/roster`
> **Parent:** [`../plan.md`](../plan.md)
> **Route:** `/{organisation}/{venue}/workforce/roster`
> **Status:** In progress
> **Owner:** TBD
> **Created:** 2026-05-31
> **Updated:** 2026-06-01

## 1. Summary

Roster is where demand, people, and award law converge into a costed, compliant weekly schedule. It is the **integration spine of Workforce**: reads Forecast Engine (hourly demand), Availability and Leave (who can work), People (positions, rates, certs, junior/visa status), and the Award Rate Library (penalty order-of-operations), and produces a published roster plus cost and compliance signals for Timesheets, Labour Insights, and Flash P&L.

Three product commitments: **(1) cost as you build** — every shift shows true award cost with base vs penalty split vs forecast-driven labour budget; **(2) compliant by construction** — tiered hard-block vs warn-with-override; **(3) forecast-aware with context** — hourly demand curve under the grid with named drivers.

**Personas:** Owner / Area Manager (budget targets, multi-venue cost review); Venue Manager (primary weekly builder); Staff (Phase 1: email/PDF recipients only); Agent (draft rosters, surface risks — no sensitive reads).

**Notion:** [Roster (Module Overview)](https://www.notion.so/34f64094bde680a2a2f8e7a582110aab)

**Current code (baseline — keep):**

| Area | Location | Notes |
|------|----------|-------|
| Route + client shell | `app/(main)/…/workforce/roster/` | Week + day views, shift add/edit sheets |
| API | `app/api/…/venues/[venue]/roster/route.ts` | GET week, POST/PATCH shift |
| Service | `server/workforce/roster.service.ts` | Week fetch, CRUD, availability hints |
| Repo | `server/workforce/workforce.repo.ts` | Positions, shifts, overlap checks |
| Schema | `roster_shifts`, `positions`, `roster_templates`, `roster_template_shifts` | Draft/published lifecycle, `source` enum includes `autofill` / `demand_fill` |
| Time utils | `lib/roster/venue-time.ts`, `lib/roster/position-styles.ts` | Venue TZ boundaries |
| Demo seed | `scripts/seed-demo-people.ts` | Positions + sample shifts |

**Gaps vs Notion (this spec closes):** mock costing in UI (`hourlyRateCentsForStaff`), hardcoded budget, no position/station grid view, no open shifts, no compliance engine, no Award Library integration, no forecast overlay, no auto-build, no publish (email/PDF), no `roster_weeks` aggregate, no timesheet handoff, no SPLH / projected labour outputs.

## 2. Scope

### In scope (Phase 1)

- **Roster grid** — weekly view; **by employee** and **by position/station**; single venue; org/venue switcher
- **Shift CRUD** — start/end, unpaid break, position, venue; drag move/resize; click to edit; **open (unassigned) shifts**
- **Copy previous week**, **shift templates**, **recurring patterns** (extend existing template tables)
- **Penalty-aware live costing** — Award Rate Library pipeline; base vs penalty per shift/day/week
- **Forecast-driven labour budget** — daily + hourly target from forecast sales × org labour %; variance flags
- **Hourly demand overlay** — Forecast Engine hourly curve under each day; expandable drivers
- **AI one-click auto-build** — draft from forecast + availability + leave + award constraints; never auto-publishes
- **Tiered compliance** — hard-block (leave clash, cert missing/expired, under-18 hours, expired visa); warn-with-override (rest gap, max hours, availability, over-budget, min engagement, PT outside pattern)
- **Roster states** — Draft → Published → Modified-after-publish (re-publish)
- **Publish via email + PDF** — per-employee email + full-venue PDF; R2D quiet hours
- **Manual actuals handoff** — published shifts seed Timesheets baseline (accept-as-rostered or edit)
- **Outputs** — SPLH Planned → Labour Insights; projected labour → Flash P&L; coverage-gap in-module + Agent
- Cost summary panel; empty states; permission gating

### In scope (Phase 1 data model, Phase 2 surface)

- `roster_shifts` carries **rostered** and **clocked** time fields (clocked null in P1)
- **Timesheet** and **Break** first-class entities (manual entry P1; clock-in P2)

### Out of scope (Phase 2 — crew app)

- Staff mobile app: roster view, push, clock-in/out, swaps, open-shift pickup, in-app availability/leave
- Tablet/kiosk clock; GPS geofencing
- Auto timesheets from clock-in; live labour ticker; roster-vs-actual analytics surface
- In-app two-way notifications / shift confirmations

### Out of scope (later)

- ML roster optimisation; annualised-salary reconciliation; cross-venue shift lending; skills matrix auto-assign; fatigue analytics beyond rest/max rules

### Non-goals

- Replacing Xero payroll or STP lodgement
- Staff self-service roster UI in Phase 1
- Auto-publish from Agent or auto-build

## Notion specification

### User flows

1. **Build the week against demand** — grid loads with hourly demand curve + labour budget; copy last week or auto-build; drag shifts; live cost; resolve flags; publish.
2. **AI auto-build** — generates Draft + plain-English summary; manager edits; never auto-publishes.
3. **Cost a shift as placed** — Award Library prices shift; base vs penalty on hover; day/week totals update.
4. **Hard-block: rostering over approved leave** — cannot save; no override.
5. **Warn-with-override: rest gap** — warning + required reason + audit log.
6. **Publish + deliver** — Published state; per-employee email + venue PDF; quiet hours; Modified-after-publish re-notifies affected only.
7. **Enter actuals (Phase 1 manual)** — Timesheets pre-loaded from published shifts.
8. **Coverage gap + SPLH planned** — cost summary shows SPLH Planned and under-covered hours.

### Intended functionality

**Grid:** Two views (employee / station). Drag-resize. Open shifts. Copy week + templates.

**Cost-as-you-build:** Shift chip total cost; hover breakdown; day/week footers vs budget; penalty share surfaced.

**Demand overlay + budget:** Hourly curve from Forecast Engine; labour budget = forecast × target %; daily + hourly variance; driver expand.

**AI auto-build:** Constraint-satisfaction over forecast + availability + award rules; lowest compliant cost; Draft + summary.

**States:** Draft → Published → Modified-after-publish.

**Publish:** Email per employee + A4 landscape PDF (station-grouped; cost hidden on staff PDF).

**Timesheets handoff:** Published shifts → expected baseline rows.

**Permissions:** Owner/Area Manager all venues + budgets; Venue Manager own venue build/publish; Staff no Phase 1 access.

**Empty states:** No forecast / no staff / first roster CTAs per Notion.

### Compliance enforcement (tiered)

| Tier | Rules |
|------|-------|
| **Hard block** | Approved leave clash; required cert missing/expired; under-18 legal hours; expired visa/work rights |
| **Warn + override** | Rest gap (<10h / <8h post-OT); max weekly hours; availability mismatch; over labour budget; sub-minimum engagement; PT outside agreed pattern |

Override records: reason + user + timestamp (7-year retention). Hard/warn split is a **constant**, not operator-configurable.

### Data + integrations

**Reads:** Forecast Engine (hourly + drivers), Availability, Leave, People, Award Rate Library, Settings → Organisation (labour %, R2D quiet hours, default award), Settings → Venues (trading hours, PH calendar, state).

**Writes:** Timesheets (baseline rows), Labour Insights aggregates (SPLH Planned), Flash P&L projected labour (Phase 2 route), `shift_compliance_flags`, publish delivery log.

### Other modules this touches

Forecast Engine, Availability, Leave, People, Award Rate Library, Timesheets, Payroll Export, Labour Insights, Flash P&L, Settings, Agent, Email Infrastructure.

## Open questions

### Product (from Notion — defaults for implementation)

| Question | Lean default |
|----------|--------------|
| Auto-build cost vs fairness | Lowest compliant cost P1; fairness toggle P2 |
| Public holidays in auto-build | Flag PHs; operator confirms coverage |
| Demand curve before forecast maturity | Grid works without overlay; “learning” state |
| Multi-venue staff rest/max hours | Org-wide read for same employee P1 |
| PDF format | A4 landscape, station-grouped, no costs on staff copy |
| Re-publish notifications | Affected employees only + manual notify-all |
| Overtime in auto-build | Avoid OT by default; surface when unavoidable |

### Engineering

- [ ] Hourly forecast API shape — extend `server/forecast/` or consume existing daily until hourly lands (owner: eng, due: sprint 1).
- [ ] Email provider for roster PDF — reuse Postmark path from [`invoices-module/email-infrastructure`](../invoices-module/email-infrastructure/plan.md) (owner: eng).

## Decision log

- *25 May 2026 (Notion)* — AI auto-build, hourly overlay, penalty costing, tiered compliance, email+PDF delivery locked for Phase 1.
- *31 May 2026* — Spec authored gap-fill from existing `roster_shifts` CRUD + UI prototype; extend schema rather than greenfield rewrite.

## 3. Architecture placement

| Decision | Choice | ARCHITECTURE.md |
|----------|--------|-----------------|
| Lives in app | `apps/supersolt` only | §3.2, §5.1 |
| Domain services | `server/workforce/roster.service.ts`, new `server/workforce/roster-cost.service.ts`, `server/workforce/roster-compliance.service.ts`, `server/workforce/roster-autobuild.service.ts`, `server/workforce/roster-publish.service.ts` | §7.1 |
| Award costing | `server/workforce/award/` (new) — consumed by roster + payroll; no package until second app | §5.1 |
| Forecast reads | `server/forecast/` existing repos | §7.1 |
| Client | Migrate logic from `roster-page-client.tsx` → `entities/workforce/roster/` hooks + components; route keeps thin wrapper | §7.1 |
| API | Route handlers under `app/api/organisations/[organisation]/venues/[venue]/roster/` | §8.1 |
| Auth | `requireRequestAuth` + `assertVenueMember`; roster write requires manager-capable role | §3.2 |
| UI primitives | `@workspace/ui` | §6 |
| New package edges | None | §3.2 |

## 4. Data model

### Existing (keep)

- `positions`, `roster_templates`, `roster_template_shifts`
- `roster_shifts` — extend in migration below

### Migration: `20260601120000_roster_phase1.sql`

```sql
-- Extend lifecycle for modified-after-publish
ALTER TYPE roster_shift_lifecycle ADD VALUE IF NOT EXISTS 'modified';

-- roster_weeks: one row per venue per ISO week (Monday start)
CREATE TABLE public.roster_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  week_start date NOT NULL,
  state text NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft', 'published', 'modified')),
  target_labour_pct numeric(5,2),
  forecast_sales_cents bigint,
  labour_budget_cents bigint,
  total_cost_cents bigint,
  total_base_cost_cents bigint,
  total_penalty_cost_cents bigint,
  splh_planned numeric(12,4),
  published_at timestamptz,
  published_by uuid REFERENCES public.user_profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, week_start)
);

-- Extend roster_shifts
ALTER TABLE public.roster_shifts
  ALTER COLUMN user_profile_id DROP NOT NULL, -- open shifts
  ADD COLUMN IF NOT EXISTS award_code text,
  ADD COLUMN IF NOT EXISTS computed_cost_cents integer,
  ADD COLUMN IF NOT EXISTS base_cost_cents integer,
  ADD COLUMN IF NOT EXISTS penalty_cost_cents integer,
  ADD COLUMN IF NOT EXISTS roster_week_id uuid REFERENCES public.roster_weeks (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES public.user_profiles (id),
  ADD COLUMN IF NOT EXISTS clocked_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS clocked_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS clocked_break_minutes integer;

CREATE TYPE shift_compliance_rule AS ENUM (
  'leave_clash', 'cert_missing', 'cert_expired', 'under18_hours', 'visa_expired',
  'rest_gap', 'max_hours', 'availability', 'over_budget', 'min_engagement', 'pt_pattern'
);
CREATE TYPE shift_compliance_tier AS ENUM ('hard_block', 'warn');

CREATE TABLE public.shift_compliance_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.roster_shifts (id) ON DELETE CASCADE,
  rule shift_compliance_rule NOT NULL,
  tier shift_compliance_tier NOT NULL,
  message text NOT NULL,
  overridden boolean NOT NULL DEFAULT false,
  override_reason text,
  override_by uuid REFERENCES public.user_profiles (id),
  override_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.roster_publish_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_week_id uuid NOT NULL REFERENCES public.roster_weeks (id) ON DELETE CASCADE,
  user_profile_id uuid REFERENCES public.user_profiles (id),
  channel text NOT NULL CHECK (channel IN ('email', 'pdf')),
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Timesheet skeleton (Phase 1 manual; Phase 2 clock-in)
CREATE TABLE public.timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES public.roster_shifts (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  rostered_starts_at timestamptz NOT NULL,
  rostered_ends_at timestamptz NOT NULL,
  rostered_break_minutes integer NOT NULL DEFAULT 0,
  actual_starts_at timestamptz,
  actual_ends_at timestamptz,
  actual_break_minutes integer,
  source text NOT NULL DEFAULT 'manual_p1'
    CHECK (source IN ('manual_p1', 'clock_in_p2', 'accept_as_rostered')),
  approved_by uuid REFERENCES public.user_profiles (id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shift_id)
);

CREATE TABLE public.shift_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.roster_shifts (id) ON DELETE CASCADE,
  break_type text NOT NULL CHECK (break_type IN ('meal_unpaid', 'rest_paid')),
  minutes integer NOT NULL CHECK (minutes >= 0),
  taken boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### RLS

Follow existing `user_organisations` org-membership pattern on all new tables (same as `roster_shifts`). Roster **writes** additionally gated in service layer: `manager`, `supervisor`, `admin`, `owner` roles at venue or org level.

| Table | Select | Insert/Update/Delete |
|-------|--------|----------------------|
| `roster_weeks` | org member | venue manager+ |
| `shift_compliance_flags` | org member | system on shift save; override by venue manager+ |
| `roster_publish_deliveries` | org admin / venue manager | publish job (service role or authenticated publisher) |
| `timesheets` | org member (staff: own rows only via policy refinement) | venue manager+ approve; staff dispute own |
| `shift_breaks` | org member | venue manager+ |

### Migration ownership

- **Path:** `apps/supersolt/supabase/migrations/20260601120000_roster_phase1.sql`
- **Pattern:** App-owned §8.1
- **Apply:** `user-supabase-supersolt-mvp` MCP `apply_migration` in implementation session; then `pnpm drizzle:pull` in `apps/supersolt`
- **Backfill:** Link existing `roster_shifts` to new `roster_weeks` via script `scripts/backfill-roster-weeks.ts` (venue TZ Monday of `starts_at`)

## 5. API surface

| Operation | Surface | Path | Auth | Notes |
|-----------|---------|------|------|-------|
| Get week payload | GET | `/api/…/roster?weekStart=&lifecycle=` | venue member | Extend with costs, budget, overlay, flags |
| Create shift | POST | `/api/…/roster` | venue manager+ | Run compliance + cost before insert |
| Update shift | PATCH | `/api/…/roster` | venue manager+ | Recompute cost; re-flag compliance |
| Delete shift | DELETE | `/api/…/roster/[shiftId]` | venue manager+ | *new route* |
| Copy previous week | POST | `/api/…/roster/copy-week` | venue manager+ | `source=copy_week` |
| Apply template | POST | `/api/…/roster/apply-template` | venue manager+ | existing template tables |
| Auto-build | POST | `/api/…/roster/auto-build` | venue manager+ | Draft only; `source=autofill` |
| Compliance override | POST | `/api/…/roster/shifts/[shiftId]/override` | venue manager+ | Warn tier only |
| Publish week | POST | `/api/…/roster/publish` | venue manager+ | Email + PDF queue |
| Re-publish | POST | `/api/…/roster/republish` | venue manager+ | Modified state; partial notify |
| Forecast overlay | GET | `/api/…/roster/forecast-overlay?weekStart=` | venue member | Hourly buckets + drivers |
| Week cost summary | GET | `/api/…/roster/cost-summary?weekStart=` | venue member | SPLH planned, penalty share |

### Validation

- Zod schemas: `entities/workforce/roster/schemas.ts`
- Every `PeopleServiceError` / domain error maps to [`flows.md`](flows.md) §2

## 6. UI composition

```
apps/supersolt/
├── app/(main)/[organisation]/[venue]/workforce/roster/
│   ├── page.tsx
│   └── _components/roster-page-client.tsx   → thin; migrate to entities/
├── entities/workforce/roster/
│   ├── components/
│   │   ├── roster-grid.tsx                  # employee + station views
│   │   ├── roster-demand-overlay.tsx
│   │   ├── roster-cost-summary.tsx
│   │   ├── roster-compliance-banner.tsx
│   │   ├── roster-shift-sheet.tsx
│   │   └── roster-publish-dialog.tsx
│   ├── hooks/
│   │   ├── use-roster-week.ts
│   │   └── use-roster-mutations.ts
│   └── schemas.ts
└── server/workforce/
    ├── roster.service.ts
    ├── roster-cost.service.ts
    ├── roster-compliance.service.ts
    ├── roster-autobuild.service.ts
    └── roster-publish.service.ts
```

### Component map

| UI | Source | Notes |
|----|--------|-------|
| Grid, sheets, dialogs | `entities/workforce/roster/` | Domain composition |
| Button, Card, Sheet, ToggleGroup | `@workspace/ui` | Reuse |
| Position badges | `lib/roster/position-styles.ts` | Keep |

## 7. Dependencies

### Existing packages

- `@workspace/ui` — layout, forms, alerts
- Drizzle + Supabase Auth per `AGENTS.md`

### Upstream modules (must implement or stub)

| Module | Contract needed |
|--------|-----------------|
| Award Rate Library | `computeShiftCost({ awardCode, classification, shiftBounds, employmentType }) → { total, base, penalty, rulesApplied[] }` |
| People | Pay rate, award classification, certs + expiry, DOB, visa expiry, employment type |
| Leave | Approved leave ranges for hard-block |
| Availability | Recurring + instance hints (already partially wired) |
| Forecast Engine | Hourly revenue/covers series + drivers for week |
| Email Infrastructure | Outbound roster emails + PDF attachment |

### New external deps

- PDF generation: `@react-pdf/renderer` or server-side `pdfkit` (pick one in implementation; prefer existing monorepo pattern if any)
- None otherwise

### New package edges

None.

## 8. Implementation order (commits)

Gap-fill sequence — each commit keeps tree green.

1. `docs(supersolt): add workforce roster feature triad` — this folder
2. `feat(supersolt): roster phase1 migration + drizzle pull` — DDL §4
3. `feat(supersolt): roster week aggregate + link shifts` — `roster_weeks` service + backfill script
4. `feat(supersolt): award shift cost engine` — `roster-cost.service.ts` + unit tests
5. `feat(supersolt): roster compliance rules engine` — hard-block + warn flags
6. `feat(supersolt): extend roster week API with costs and flags` — replace mock UI costing
7. `feat(supersolt): roster station view + open shifts` — UI + nullable assignee
8. `feat(supersolt): roster copy-week and template apply` — wire existing templates
9. `feat(supersolt): roster forecast overlay endpoint` — hourly or daily fallback
10. `feat(supersolt): roster auto-build draft` — constraint solver + summary
11. `feat(supersolt): roster publish email and pdf` — publish service + quiet hours
12. `feat(supersolt): timesheet baseline from published roster` — timesheets insert on publish
13. `feat(supersolt): roster splh and labour insights feed` — write aggregate hook for Labour tab
14. `test(supersolt): roster integration and e2e` — per `tdd.md`
15. `refactor(supersolt): extract roster entities from page client` — split 1300-line client

## 9. Telemetry

| Event | Trigger | Payload |
|-------|---------|---------|
| `roster.viewed` | Page mount | `{ organisation_id, venue_id, week_start }` |
| `roster.shift_created` | POST shift success | `{ shift_id, source }` |
| `roster.auto_build` | Auto-build success | `{ week_start, shift_count, summary_flags }` |
| `roster.compliance_blocked` | Hard block | `{ rule, shift_id }` |
| `roster.compliance_overridden` | Warn override saved | `{ rule, shift_id }` |
| `roster.published` | Publish success | `{ week_start, employee_count, modified_republish }` |
| `roster.failed` | API 4xx/5xx | `{ operation, code, message }` |

Destination: existing product analytics hook when wired; until then structured server logs.

## 10. Rollout

- **Feature flags:** `ROSTER_AUTO_BUILD_ENABLED` (default off in prod until validated); `ROSTER_HOURLY_OVERLAY_ENABLED` (depends on forecast hourly)
- **Env vars:** reuse Postmark/email vars from invoices module for publish delivery
- **Migration sequencing:** migrate before deploy; backfill `roster_weeks` in maintenance window
- **Backout:** disable auto-build + publish flags; grid CRUD continues on existing columns

## 11. Cross-references

- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Parent: [`../plan.md`](../plan.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)

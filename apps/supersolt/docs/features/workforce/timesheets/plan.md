# Timesheets

> **Product:** `apps/supersolt`
> **Slug:** `workforce/timesheets`
> **Parent:** [`../plan.md`](../plan.md)
> **Route:** `/{organisation}/{venue}/workforce/timesheets`
> **Status:** Planned
> **Owner:** TBD
> **Created:** 2026-05-31
> **Updated:** 2026-05-31

## 1. Summary

Timesheets is where rostered shifts become paid hours. Staff clock in and out on mobile; the platform compares actual hours against rostered hours; managers review variance and approve; approved timesheets feed **Payroll Export** and trigger **Leave** accrual. Done well, this module catches payroll errors before they happen, surfaces operational issues (chronic lateness, missed clock-outs, padded hours), and creates the Fair Work audit trail.

Three product commitments: **(1) payroll accuracy** — capture truth when roster and actual diverge; **(2) variance signal** — persistent gaps indicate scheduling or attendance problems; **(3) compliance audit trail** — immutable history of hours worked, edits, and approvals.

**Personas:** Staff (mobile clock-in/out, own history, disputes); Venue Manager (batch approval, variance review, edit with reason); Owner / Area Manager (escalations, large variances, payroll sign-off).

**Notion:** [Timesheets (Module Overview)](https://www.notion.so/34f64094bde68098a187cddc4c51b467)

**Current code (to remove / replace):**

| Area | Location | Fate |
|------|----------|------|
| Demo UI + seed data | `app/(main)/…/workforce/timesheets/_components/timesheets-page-client.tsx` | Delete; replace with `entities/workforce/timesheets/` |
| Schema skeleton | `timesheets`, `shift_breaks` from `20260601120000_roster_phase1.sql` | **Expand** in dedicated migration (Notion model) |
| Roster publish hook | `roster.service.ts` → `insertTimesheetBaseline` | Extend: set `status=open`, snapshot pay rate |
| Leave accrual | `leave-accrual.service.ts` → `postTimesheetAccrual` | Wire from timesheet approve path (idempotent) |
| API | None | Full route surface (§5) |

## 2. Scope

### In scope (MVP — Notion parity)

- Staff mobile clock-in / clock-out (browser; one-tap; optimistic client timestamp + server sync with retry)
- Geolocation verification on clock-in/out — **optional per org**; warn + flag for manager review (not hard block in MVP)
- Auto-population from published rosters (`insertTimesheetBaseline` on publish → `status=open`)
- Clock data fills `actual_*` fields; no-show visible when entry exists with no clocks
- No-roster clock-in creates entry requiring manager review (`shift_id` nullable)
- Variance flagging: late in, early out, no-show, missed clock-out, overtime (visual green / amber / red / black)
- Break tracking: explicit break start/end events; paid vs unpaid per org rules
- Manager review UI: pay period selector, status filters, bulk approve clean matches, detail with roster vs actual
- Manager edit with mandatory reason + full audit trail; staff notified of edits
- Staff dispute flow: claim + notes → manager resolve (accept / partial / reject)
- Bulk approve standard entries (within tolerance)
- Auto-clock-out: cron when open clock >1 hr past rostered end → clock at rostered end, flag `is_auto_clocked`
- Multi-venue: separate entry per venue; combined daily total for payroll
- Pay period management: weekly / fortnightly (default) / monthly; org-configurable start day
- Status pipeline: **Open → Submitted → Approved → Locked**; **Disputed** side state
- Pay period close: cron rolls Open → Submitted; 24 hr grace for late clocks/corrections (Notion lean)
- Approval triggers Leave accrual via `postTimesheetAccrual` (FT/PT only; idempotent per timesheet)
- Locked after Payroll Export includes row (`locked_in_payroll_export_id`); immutable post-lock
- Colocated org settings: pay period, tolerance, geolocation, anomaly thresholds, break mode (`settings/organisation/timesheets/`)
- Venue lat/long on venue settings for geolocation
- Permission gating per Notion (§Notion specification)
- Empty states (no roster, no timesheets, brand-new employee)
- Telemetry: `timesheets.*` catalog + no-op tracker
- Stable API error codes — see [`flows.md`](flows.md) §2

### In scope (MVP-light — Notion deferable, ship same release)

- Approval threshold by variance amount (e.g. >2 hr per shift → Owner approval) — configurable per org
- Anomaly alerts: chronic lateness, chronic auto-clocks, frequent disputes, significant weekly OT — surfaced to manager
- Break auto-deduction mode (deduct standard unpaid break from shifts >5 hr without explicit break events) vs explicit-only
- Basic overtime: FT >38 hr/week at 1.5× base (standard OT only; not full award interpreter)
- 15-min rounding display: store exact timestamps; display rounded per org config

### Out of scope (Phase 2)

- Full award interpreter for penalty calculations (P2.6)
- Biometric / RFID / hardware T&A integrations
- Job costing, project / cost-centre attribution
- Predictive variance alerts
- Real-time labour cost ticker vs forecast
- Automated dispute resolution
- Multi-org timesheet (separate orgs = separate records in MVP)
- Unlocking locked entries (post-export corrections via Xero + Supersolt audit note only)
- Break compliance hard-block (Hospitality Award break rules — flag only in MVP)
- Native crew app (browser mobile-first is MVP)

### Non-goals

- Replacing Xero payroll lodgement ([parent workforce plan](../plan.md))
- Promoting to `packages/*` before a second app consumer ([ARCHITECTURE.md §5.1](../../../../ARCHITECTURE.md))
- Backfilling dummy `SEED_TIMESHEETS` rows (atomic cutover from real roster publish baselines)

## Notion specification

### User flows (locked)

1. **Standard clock-in (staff, mobile)** — tap Clock in; geolocation warn if enabled; early >15 min → confirm; status Clocked In.
2. **Clock out** — records end; calculates worked hours minus unpaid breaks; late >30 min → confirm.
3. **Break logging** — Start break / End break; paid vs unpaid per org (<30 min paid, ≥30 min unpaid default).
4. **Missed clock-in** — staff Submit clock correction or manager sees missing start; dispute/correction flow.
5. **Auto-clock-out** — cron at rostered end +1 hr; flag auto-clocked; staff verify next session.
6. **Variance at submit** — rostered vs actual side-by-side; tolerance flags (±5 min green default).
7. **Manager bulk approve matched** — filter clean matches; bulk approve → Approved.
8. **Manager reviews variances** — filter >15 min; approve as-is, edit with reason, or dispute.
9. **Staff disputes entry** — claim + notes → Disputed; manager notified.
10. **Manager resolves dispute** — accept / partial / reject; audit + staff notification.
11. **Manager edit with audit** — before/after, user, timestamp, reason; history tab.
12. **Pay period close** — cron Open → Submitted; manager approval window (default 48 hr).
13. **Approval triggers leave accrual** — 8 hr × 7.3% annual + 3.7% personal for FT (via Leave module).
14. **Locked post-payroll** — Payroll Export sets Locked; no edits.
15. **Geolocation optional** — remote clock warn + flag; repeated remote → manager review.
16. **Multi-venue same day** — separate entries per venue; payroll sums daily total.

### Intended functionality

**Staff surface (role switch on same route):** Large Clock In / Clock Out CTA; current shift card; persistent banner while clocked in or on break; recent history; dispute/correction entry.

**Manager surface:** Pay period selector, status pipeline bar with counts, smart filters (clean matches, needs review, disputes, auto-clocked), bulk actions, row drill-down to detail sheet with Schedule / Actual / Variance / History / Dispute sections.

**Auto-population from Roster:** Published shifts create Open entries with rostered snapshot; clocks fill actuals; off-roster work via clock-in without shift → no-roster entry.

**Variance:** `start_variance`, `end_variance`, `hours_variance`; configurable tolerance (default ±5 min green, 5–15 amber, >15 red, no clock black).

**Pay periods:** Org-configurable frequency and boundaries; automatic rollover; grace period before Submitted locks staff edits.

**Anomaly alerts (MVP-light):** Configurable thresholds; manager dashboard badges on timesheet list.

### Data + integrations (Notion)

See §4 for DDL. **Reads:** Roster (published shifts), People (pay rate snapshot, employment type, position), org/venue settings (period, geolocation). **Writes:** timesheets, clock events, disputes, audit, pay periods; **calls** Leave accrual on approve; **stages** payroll lines for Payroll Export consumer.

### Permission gating

| Role | Sees | Edits |
|------|------|-------|
| Staff | Own timesheets | Clock own shifts, dispute own entries, submit corrections |
| Venue Manager | Venue team timesheets | Approve (within threshold), edit with reason, resolve disputes, bulk approve |
| Owner / Area Manager | All org timesheets in scope | Escalated variances, above-threshold approvals, org timesheet settings |

### Other modules this touches

[Roster](../roster/plan.md) (publish → baseline), [People](https://www.notion.so/34f64094bde6808393eee71ac4e611e8) (pay rate), [Leave](../leave/plan.md) (accrual on approve), Payroll Export (approved → locked), Settings → Organisation / Venues, [Agent](https://www.notion.so/34f64094bde68003a437faeae06a6bf5) (reads timesheets; anomaly brief), Notifications (events only until module lands), Insights → Labour (Phase 2 actual vs roster trends), Forecast Engine (MVP.2 labour budget vs actual).

## Open questions

### Engineering (resolved for implementation)

- [x] **Scope vs parent Workforce note** — Timesheets follows full Notion MVP (includes staff clock-in); supersedes parent “Phase 1 manual actuals only” for this sub-module ([`../plan.md`](../plan.md) updated).
- [x] **Route pattern** — Single `/workforce/timesheets` with role-based surfaces (Leave pattern; Notion App URL).
- [x] **Settings** — Colocated org/venue columns + `settings/organisation/timesheets/` (Leave `leave-types` pattern).
- [x] **Extend vs replace `timesheets`** — ALTER/expand existing table; keep `shift_id` unique when present; nullable for no-roster.
- [x] **Break model** — Rostered break minutes on timesheet row; actual breaks via `timesheet_clock_events` (`break_start` / `break_end`) + computed `actual_break_minutes`.
- [x] **Payroll Export contract** — `payroll_timesheet_lines` staging table; Payroll Export triad consumes later.
- [x] **Offline / slow network** — Optimistic client timestamp + retry queue (session/localStorage); no full offline write queue (Availability precedent).

### Product (Notion lean — locked)

- Geolocation: warn + flag MVP (not block).
- Break auto-deduct: both modes configurable; explicit default.
- No-show: auto-flag “No clock data” + manager notification event.
- Manual staff entry: dispute/correction flow only (not direct edit).
- Pay period close: 24 hr grace before Submitted locks free edits.
- Locked correction: Xero adjustment + Supersolt note only.
- Multi-day / overnight shifts: one entry; end on next calendar date allowed.
- Dispute authority: manager resolves; staff escalates to Owner if unhappy.

## Decision log

- *3 May 2026 (Notion)* — Full MVP: clock-in/out, variance, disputes, pay periods, leave accrual, lock on payroll.
- *31 May 2026 (grill-me)* — **Full Notion MVP + MVP-light** in same release; codebase replaces demo UI and expands roster skeleton schema.
- *31 May 2026* — Single route role-based surfaces; colocated org timesheet settings (option A).
- *31 May 2026* — Supersedes parent Workforce “Phase 1 manual actuals / no crew clock-in” for Timesheets only; Roster email+PDF delivery unchanged.

## 3. Architecture placement

| Decision | Choice | ARCHITECTURE.md |
|----------|--------|-----------------|
| Lives in app | `apps/supersolt` only | §3.2, §5.1 |
| Domain services | `server/workforce/timesheet.service.ts`, `timesheet-clock.service.ts`, `timesheet-variance.service.ts`, `timesheet-period.service.ts`, `timesheet-policy.ts`, `timesheet-telemetry.ts` | §7.1 |
| Repo | `server/workforce/timesheet.repo.ts` | §7.1 |
| Leave integration | Approve path → `postTimesheetAccrual` in `leave-accrual.service.ts` | §7.1 |
| Roster integration | Publish → `insertTimesheetBaseline`; read shift for rostered snapshot | §7.1 |
| Client | `entities/workforce/timesheets/`; thin `page.tsx` | §7.1 |
| Settings UI | `settings/organisation/timesheets/` route-colocated | §7.1 |
| Cron | `app/api/cron/timesheet-auto-clock-out/route.ts`, `app/api/cron/pay-period-close/route.ts` | §8.1 |
| API | Route handlers under `app/api/…/workforce/timesheets/*` | §8.1 |
| Auth | `requireRequestAuth` + `assertVenueMember`; crew RLS own rows | §3.2, §8.1 |
| UI primitives | `@workspace/ui` | §6 |
| New package edges | None | §3.2 |

## 4. Data model

### Enums

```sql
CREATE TYPE timesheet_status AS ENUM (
  'open',
  'submitted',
  'approved',
  'disputed',
  'locked'
);

CREATE TYPE timesheet_clock_event_type AS ENUM (
  'clock_in',
  'clock_out',
  'break_start',
  'break_end',
  'auto_clock_out',
  'manual_correction'
);

CREATE TYPE timesheet_dispute_resolution AS ENUM (
  'pending',
  'accepted',
  'partial',
  'rejected'
);

CREATE TYPE pay_period_status AS ENUM (
  'open',
  'closed',
  'exported',
  'locked'
);

CREATE TYPE pay_period_frequency AS ENUM (
  'weekly',
  'fortnightly',
  'monthly'
);

CREATE TYPE timesheet_break_mode AS ENUM (
  'explicit_events',
  'auto_deduct'
);
```

### Expand `timesheets` (from roster skeleton)

```sql
-- Migration alters existing public.timesheets from roster_phase1

ALTER TABLE public.timesheets
  ALTER COLUMN shift_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS position_id uuid REFERENCES public.positions (id),
  ADD COLUMN IF NOT EXISTS pay_period_id uuid, -- FK added after pay_periods created
  ADD COLUMN IF NOT EXISTS status timesheet_status NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS rostered_hours numeric(6,2),
  ADD COLUMN IF NOT EXISTS actual_hours numeric(6,2),
  ADD COLUMN IF NOT EXISTS start_variance_min integer,
  ADD COLUMN IF NOT EXISTS end_variance_min integer,
  ADD COLUMN IF NOT EXISTS hours_variance numeric(6,2),
  ADD COLUMN IF NOT EXISTS pay_rate_cents integer,
  ADD COLUMN IF NOT EXISTS is_auto_clocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_no_roster boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clock_in_lat numeric(9,6),
  ADD COLUMN IF NOT EXISTS clock_in_lng numeric(9,6),
  ADD COLUMN IF NOT EXISTS clock_out_lat numeric(9,6),
  ADD COLUMN IF NOT EXISTS clock_out_lng numeric(9,6),
  ADD COLUMN IF NOT EXISTS geolocation_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes_employee text,
  ADD COLUMN IF NOT EXISTS notes_manager text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_in_payroll_export_id uuid,
  ADD COLUMN IF NOT EXISTS work_date date NOT NULL DEFAULT CURRENT_DATE;

-- Replace text source check with expanded enum-like check
ALTER TABLE public.timesheets DROP CONSTRAINT IF EXISTS timesheets_source_check;
ALTER TABLE public.timesheets
  ADD CONSTRAINT timesheets_source_check
  CHECK (source IN ('roster_publish', 'clock_in', 'manager_edit', 'accept_as_rostered', 'dispute_resolution', 'auto_clock_out'));

CREATE UNIQUE INDEX timesheets_shift_uq ON public.timesheets (shift_id) WHERE shift_id IS NOT NULL;
CREATE INDEX timesheets_venue_period_status_idx ON public.timesheets (venue_id, pay_period_id, status);
CREATE INDEX timesheets_user_work_date_idx ON public.timesheets (user_profile_id, work_date);
```

### `pay_periods`

```sql
CREATE TABLE public.pay_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  frequency pay_period_frequency NOT NULL DEFAULT 'fortnightly',
  status pay_period_status NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  exported_at timestamptz,
  payroll_export_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, start_date, end_date)
);

ALTER TABLE public.timesheets
  ADD CONSTRAINT timesheets_pay_period_fk
  FOREIGN KEY (pay_period_id) REFERENCES public.pay_periods (id);
```

### `timesheet_clock_events`

```sql
CREATE TABLE public.timesheet_clock_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id uuid NOT NULL REFERENCES public.timesheets (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  event_type timesheet_clock_event_type NOT NULL,
  event_at timestamptz NOT NULL,
  device_info jsonb,
  location_lat numeric(9,6),
  location_lng numeric(9,6),
  is_validated_location boolean,
  notes text,
  created_by uuid REFERENCES public.user_profiles (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX timesheet_clock_events_timesheet_idx ON public.timesheet_clock_events (timesheet_id, event_at);
```

### `timesheet_disputes`

```sql
CREATE TABLE public.timesheet_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id uuid NOT NULL REFERENCES public.timesheets (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  disputed_by uuid NOT NULL REFERENCES public.user_profiles (id),
  disputed_at timestamptz NOT NULL DEFAULT now(),
  claimed_starts_at timestamptz,
  claimed_ends_at timestamptz,
  claimed_hours numeric(6,2),
  claim_notes text NOT NULL,
  resolution timesheet_dispute_resolution NOT NULL DEFAULT 'pending',
  resolution_notes text,
  resolved_by uuid REFERENCES public.user_profiles (id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### `timesheet_audit_log`

```sql
CREATE TABLE public.timesheet_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  timesheet_id uuid NOT NULL REFERENCES public.timesheets (id) ON DELETE CASCADE,
  change_type text NOT NULL, -- clock_in | approved | edited | disputed | locked | ...
  before_state jsonb,
  after_state jsonb,
  reason text,
  actor_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### `payroll_timesheet_lines` (Payroll Export consumer)

```sql
CREATE TABLE public.payroll_timesheet_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  timesheet_id uuid NOT NULL REFERENCES public.timesheets (id),
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id),
  pay_period_id uuid NOT NULL REFERENCES public.pay_periods (id),
  hours numeric(6,2) NOT NULL,
  base_rate_cents integer NOT NULL,
  overtime_hours numeric(6,2) NOT NULL DEFAULT 0,
  overtime_rate_cents integer,
  gross_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (timesheet_id)
);
```

### Organisation + venue settings columns

```sql
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS timesheet_pay_period_frequency pay_period_frequency NOT NULL DEFAULT 'fortnightly',
  ADD COLUMN IF NOT EXISTS timesheet_period_start_dow smallint NOT NULL DEFAULT 1, -- 1=Mon
  ADD COLUMN IF NOT EXISTS timesheet_match_tolerance_min integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS timesheet_owner_approval_variance_min integer NOT NULL DEFAULT 120, -- MVP-light 2hr
  ADD COLUMN IF NOT EXISTS timesheet_geolocation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timesheet_break_mode timesheet_break_mode NOT NULL DEFAULT 'explicit_events',
  ADD COLUMN IF NOT EXISTS timesheet_auto_deduct_break_min integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS timesheet_auto_deduct_after_hours numeric(4,2) NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS timesheet_rounding_minutes integer NOT NULL DEFAULT 0, -- 0=exact; 15=MVP-light
  ADD COLUMN IF NOT EXISTS timesheet_approval_window_hours integer NOT NULL DEFAULT 48;

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS location_lat numeric(9,6),
  ADD COLUMN IF NOT EXISTS location_lng numeric(9,6),
  ADD COLUMN IF NOT EXISTS geolocation_radius_m integer NOT NULL DEFAULT 100;
```

### RLS (summary)

| Table | SELECT | INSERT | UPDATE |
|-------|--------|--------|--------|
| `timesheets` | org member; crew own rows only | service on publish; crew clock own; manager create no-roster review | policy by status + role |
| `timesheet_clock_events` | same as parent timesheet | crew own active shift; cron service role | — |
| `timesheet_disputes` | parties + venue operators | crew dispute own; manager initiate | manager resolve |
| `timesheet_audit_log` | org member with timesheet access | authenticated via service | — |
| `pay_periods` | org member | cron / org admin | cron close |
| `payroll_timesheet_lines` | payroll capability | timesheet approve staging | — |

Implement `can_edit_timesheet(row, viewer, role)` in service layer: **Locked** → deny all edits; **Submitted** → manager+ only; **Open** → crew clock + manager edit.

### Migration ownership

- **Path:** `apps/supersolt/supabase/migrations/20260601150000_timesheets_notion_model.sql`
- **Depends on:** `20260601120000_roster_phase1.sql` (existing `timesheets`), `20260601140000_leave_notion_model.sql` (accrual events)
- **Pattern:** App-owned §8.1
- **Backfill:** Assign existing baseline rows `status=open`, compute `work_date` from `rostered_starts_at` venue TZ; seed current `pay_periods` per org via `scripts/seed-pay-periods.ts`
- **Apply:** `user-supabase-supersolt-mvp` MCP `apply_migration`; then `pnpm drizzle:pull`

## 5. API surface

Base venue: `/api/organisations/[organisation]/venues/[venue]/workforce/timesheets`

| Operation | Method | Path | Auth | Notes |
|-----------|--------|------|------|-------|
| List entries | GET | `…/entries?payPeriodId=&status=&filter=` | member | Crew: self; operator: venue team |
| Get entry | GET | `…/entries/[timesheetId]` | member | Includes clock events, dispute, audit |
| Clock in | POST | `…/clock-in` | crew self | Body: optional `shiftId`, lat/lng; creates no-roster if needed |
| Clock out | POST | `…/clock-out` | crew self | Computes hours, variance |
| Break start/end | POST | `…/break-start`, `…/break-end` | crew self | Active clock required |
| Submit correction | POST | `…/entries/[timesheetId]/correction` | crew self | Opens dispute/correction |
| Approve | POST | `…/entries/[timesheetId]/approve` | operator | Triggers accrual + payroll line staging |
| Bulk approve | POST | `…/entries/bulk-approve` | operator | Body: `ids[]`; clean matches only unless `force` |
| Edit | PATCH | `…/entries/[timesheetId]` | operator | Mandatory `reason`; audit |
| Dispute (staff) | POST | `…/entries/[timesheetId]/dispute` | crew self | Sets Disputed |
| Resolve dispute | POST | `…/entries/[timesheetId]/dispute/resolve` | operator | accept / partial / reject |
| Escalate to owner | POST | `…/entries/[timesheetId]/escalate` | operator | Above-variance threshold |
| Pay periods | GET | `…/pay-periods?limit=` | member | Current + historical |
| Anomalies | GET | `…/anomalies` | operator | MVP-light aggregated flags |
| Active clock | GET | `…/active` | crew self | Current open clock for venue |

Org settings: `/api/organisations/[organisation]/timesheet-settings`

| Operation | Method | Path | Auth |
|-----------|--------|------|------|
| Get settings | GET | `…/timesheet-settings` | org member |
| Update settings | PUT | `…/timesheet-settings` | org admin |

Internal (not HTTP):

| Consumer | Function |
|----------|----------|
| Roster publish | `timesheetRepo.insertBaselineFromShift(tx, shift)` |
| Leave | `postTimesheetAccrual(tx, { timesheetId, paidHoursWorked, … })` |
| Payroll Export | Reads `payroll_timesheet_lines` + sets `locked` on export run |
| Cron auto-clock-out | `timesheetClockService.processAutoClockOuts(adminDb)` |
| Cron pay period | `timesheetPeriodService.closeOpenPeriods(adminDb)` |

### Response envelope

Same as Leave/Availability: `{ data, error: { message, status, code } }`.

### Validation

- **Zod:** `entities/workforce/timesheets/schemas.ts`
- **Errors:** `TimesheetServiceError` with `TimesheetErrorCode` — maps to [`flows.md`](flows.md) §2

## 6. UI composition

```
apps/supersolt/
├── app/(main)/[organisation]/[venue]/workforce/timesheets/
│   └── page.tsx
├── app/(main)/[organisation]/[venue]/settings/organisation/timesheets/
│   └── page.tsx
├── app/api/cron/timesheet-auto-clock-out/route.ts
├── app/api/cron/pay-period-close/route.ts
├── app/api/…/workforce/timesheets/
│   ├── entries/route.ts
│   ├── entries/[timesheetId]/route.ts
│   ├── entries/[timesheetId]/approve/route.ts
│   ├── entries/[timesheetId]/dispute/route.ts
│   ├── entries/[timesheetId]/dispute/resolve/route.ts
│   ├── entries/[timesheetId]/correction/route.ts
│   ├── entries/bulk-approve/route.ts
│   ├── clock-in/route.ts
│   ├── clock-out/route.ts
│   ├── break-start/route.ts
│   ├── break-end/route.ts
│   ├── active/route.ts
│   ├── pay-periods/route.ts
│   └── anomalies/route.ts
├── entities/workforce/timesheets/
│   ├── components/
│   │   ├── timesheets-page.tsx              # role switch: staff vs manager
│   │   ├── timesheet-staff-clock-home.tsx
│   │   ├── timesheet-active-shift-banner.tsx
│   │   ├── timesheet-manager-list.tsx
│   │   ├── timesheet-status-pipeline.tsx
│   │   ├── timesheet-detail-sheet.tsx
│   │   ├── timesheet-variance-badge.tsx
│   │   ├── timesheet-dispute-form.tsx
│   │   ├── timesheet-edit-dialog.tsx
│   │   ├── timesheet-bulk-approve-bar.tsx
│   │   ├── timesheet-anomaly-alerts.tsx     # MVP-light
│   │   └── timesheet-settings-form.tsx
│   ├── hooks/
│   │   ├── use-timesheet-entries.ts
│   │   ├── use-active-clock.ts
│   │   ├── use-pay-periods.ts
│   │   └── use-clock-mutation.ts            # optimistic + retry
│   ├── api/endpoints.ts
│   └── schemas.ts
└── server/workforce/
    ├── timesheet.service.ts
    ├── timesheet-clock.service.ts
    ├── timesheet-variance.service.ts
    ├── timesheet-period.service.ts
    ├── timesheet-anomaly.service.ts         # MVP-light
    ├── timesheet-policy.ts
    ├── timesheet.repo.ts
    ├── timesheet-telemetry.ts
    └── timesheet-errors.ts
```

### Codebase changes (explicit)

| File | Change |
|------|--------|
| `timesheets-page-client.tsx` | **Delete** after `entities/workforce/timesheets/timesheets-page.tsx` wired |
| `roster.service.ts` `publishWeek` | Extend baseline insert: `status`, `pay_rate_cents`, `pay_period_id`, `work_date` |
| `leave-accrual.service.ts` | Already has `postTimesheetAccrual`; call from `timesheet.service.approve` |
| `workforce/plan.md` | Link triad; update Phase 1 staff clock note |
| `vercel.json` | Add cron entries (hourly auto-clock-out; daily pay period close) |
| `mapping.md` | Add Timesheets row |

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — Button, Card, Table, Badge, Sheet, Dialog, Select, Toast patterns
- `@/lib/api/route-auth`, `@/server/db/drizzle` — auth + RLS (per `AGENTS.md`)
- `@/server/workforce/roster.service.ts`, `leave-accrual.service.ts` — integration points

### New external deps

- None (geolocation via browser `navigator.geolocation`)

### New package edges

- None

## 8. Implementation order (commits)

1. `docs(supersolt): plan workforce/timesheets feature` — this triad + parent/mapping updates.
2. `feat(supersolt): add timesheets notion migration + types` — DDL, RLS, drizzle pull, seed pay periods script.
3. `test(supersolt): red tests for timesheet policy + variance` — from [`tdd.md`](tdd.md).
4. `feat(supersolt): timesheet repo + period service` — pay period boundaries, baseline from publish.
5. `feat(supersolt): clock-in/out API + optimistic client hooks` — staff path green.
6. `feat(supersolt): manager list + approve + bulk approve` — accrual + payroll line staging.
7. `feat(supersolt): disputes, edits, audit trail` — manager + staff flows.
8. `feat(supersolt): timesheet crons` — auto-clock-out, pay period close.
9. `feat(supersolt): org timesheet settings UI` — settings route + venue lat/long.
10. `feat(supersolt): timesheet anomaly alerts` — MVP-light.
11. `feat(supersolt): replace demo timesheets UI` — delete seed client.
12. `chore(supersolt): timesheets telemetry` — `timesheet-telemetry.ts`.
13. `test(supersolt): timesheets e2e happy path` — clock → approve → accrual.

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| `timesheets.viewed` | Page mount | `{ role, venue_id, pay_period_id }` | no-op tracker |
| `timesheets.clock_in` | Successful clock in | `{ timesheet_id, venue_id, geolocation_flagged }` | no-op tracker |
| `timesheets.clock_out` | Clock out | `{ timesheet_id, hours_worked }` | no-op tracker |
| `timesheets.auto_clock_out` | Cron | `{ timesheet_id }` | no-op tracker |
| `timesheets.approved` | Single approve | `{ timesheet_id, approver_id }` | no-op tracker |
| `timesheets.bulk_approved` | Bulk | `{ count, pay_period_id }` | no-op tracker |
| `timesheets.disputed` | Staff dispute | `{ timesheet_id }` | no-op tracker |
| `timesheets.dispute_resolved` | Manager resolve | `{ timesheet_id, resolution }` | no-op tracker |
| `timesheets.edited` | Manager edit | `{ timesheet_id, reason_length }` | no-op tracker |
| `timesheets.period_closed` | Pay period cron | `{ pay_period_id, org_id }` | no-op tracker |
| `timesheets.locked` | Payroll export | `{ timesheet_id, export_id }` | no-op tracker |
| `timesheets.forbidden` | 403 | `{ code }` | no-op tracker |
| `timesheets.failed` | Error | `{ code, message }` | no-op tracker |
| `leave.accrual_posted` | On approve | `{ timesheet_id }` | (Leave catalog) |

## 10. Rollout

- **Feature flag:** none; nav entry exists (`app-sidebar.tsx`). Optional `TIMESHEET_CRON_ENABLED=true` for crons in non-prod.
- **Env vars:** `CRON_SECRET` (existing pattern for `/api/cron/*`)
- **Migration sequencing:** apply after roster_phase1 + leave_notion_model; migrate before deploy
- **Crons:** `timesheet-auto-clock-out` hourly; `pay-period-close` daily 00:05 org-local (process per TZ batch)
- **Backout:** disable crons; UI falls back to read-only if migration applied; no DDL rollback in prod

## 11. Cross-references

- TDD: [`tdd.md`](tdd.md)
- User flows + error states: [`flows.md`](flows.md)
- Parent: [`../plan.md`](../plan.md)
- Roster (upstream): [`../roster/plan.md`](../roster/plan.md)
- Leave (accrual): [`../leave/plan.md`](../leave/plan.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)

## Compliance audit (program 2026-06-01)

Full Notion triad present; implementation vs plan tracked in §1 and commit list. **Done.**

**Updated:** 2026-06-01

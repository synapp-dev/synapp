# Leave

> **Product:** `apps/supersolt`
> **Slug:** `workforce/leave`
> **Parent:** [`../plan.md`](../plan.md)
> **Route:** `/{organisation}/{venue}/workforce/leave`
> **Status:** Planned
> **Owner:** TBD
> **Created:** 2026-05-31
> **Updated:** 2026-05-31

## 1. Summary

Leave is where AU's complex leave entitlement system is handled: annual leave accruing per hour worked, personal/sick at a different rate, long service leave by state, compassionate leave per occasion, public holiday entitlement, parental leave, unpaid leave, domestic violence leave (10 days paid from 1 August 2023), and community service / jury duty. The module solves balance accuracy, request/approval workflow, Fair Work audit trail, and operational planning (who is off when).

It reads **People** (employment type, start date, venue state for LSL), **Timesheets** (accrual on approval), and **Roster** (shift conflicts); it writes **Availability** (`leave_sync` overrides), **Roster** (hard-block ranges + optional unassign on approve), and **Payroll Export** (paid leave hours + termination payout lines).

**Personas:** Staff (mobile request + own balances); Venue Manager (approve/reject, calendar, roster conflict resolution); Owner / Area Manager (org leave-type config, LSL / long-block approvals, termination payouts).

**Notion:** [Leave (Module Overview)](https://www.notion.so/34f64094bde680f8a37cd54ff7106475)

**Current code (to remove / replace):**

| Area | Location | Fate |
|------|----------|------|
| Demo UI + seed data | `app/(main)/…/workforce/leave/_components/leave-page-client.tsx` | Delete; replace with `entities/workforce/leave/` |
| Roster leave proxy | `roster-compliance.service.ts` treats any `!isAvailable` as `leave_clash` | Replace with explicit approved-leave range lookup |
| Availability FK | `venue_staff_availability_overrides.linked_leave_id` (nullable, no FK) | Add FK to `leave_requests` in Leave migration |
| Schema | No leave tables | Full Notion data model (§4) |

## 2. Scope

### In scope (MVP — Notion parity)

- AU statutory leave types per Fair Work: Annual, Personal/Carer's, Long Service, Public Holiday, Compassionate, Parental, Unpaid, Domestic and Family Violence, Community Service / Jury Duty
- Per-employee leave balances per type (hours + days display)
- Accrual rules per employment type (FT / PT / casual / annualised); **real-time accrual on every approved timesheet**
- Leave request flow: submit → manager approve/reject → downstream effects
- Mobile-friendly staff request UI (≥44px targets, sticky save bar)
- Manager approval UI with calendar context, team coverage warnings, roster shift impact
- Auto-sync to Availability on approval (`leave_sync`, all blocks `unavailable`, reason “On leave”)
- Auto-flag to Roster: approved leave ranges → `leave_clash` hard-block; conflict resolution on approve (unassign / open / keep)
- Auto-feed to Payroll Export: paid leave hours × base rate for pay period; termination payout lines
- Org leave types configurable (defaults = AU statutory minimums; extend only, not below statutory)
- Audit trail: every request, decision, edit, balance adjustment
- Cancel / withdraw: staff withdraw pending; staff cancel approved (with confirm); manager revoke approved (mandatory reason)
- Conflict detection: insufficient balance (with paid+unpaid split option), overlapping team leave (warn), rostered shifts (prompt on approve)
- Leave calendar view (venue scope default; org filter for Owner / Area Manager)
- Long service leave: state-specific reference rules (VIC, NSW, QLD, WA, SA, TAS, ACT, NT); balance from years of service; eligibility from People start date
- Termination payouts: accrued unused annual + LSL pro-rata → Payroll Export final pay lines (triggered from People termination flow)
- Compassionate leave: per-occasion (2 days), does not deplete annual balance
- DFV leave: 10 days/year paid; calendar shows “Leave (private)”; reason visible only to employee, deciding manager, Owner
- Permission gating per Notion (§Notion specification)
- Public holiday leave: **manual capture in MVP** (no auto-creation)
- Negative leave balances: **disabled** in MVP
- Telemetry: `leave.*` catalog + no-op tracker
- Stable API error codes — see [`flows.md`](flows.md) §2

### In scope (MVP-light — Notion deferable, ship in same release)

- Approval threshold by duration (configurable per org; default >5 calendar days → Owner approval)
- Bulk approval queue (multi-select pending → approve selected)
- Half-day leave granularity (`start_time` / `end_time` on request; hours computed from venue-local day)

### Out of scope (Phase 2)

- Public holiday auto-application from Forecast Engine PH calendar
- Casual conversion compliance integration (P2.6)
- Leave loading (117.5% annual leave on some EBAs)
- Parental leave government top-up (Services Australia)
- LSL portability (construction / hospitality portable schemes)
- Calendar export / iCal feed
- Auto-suggestion (“use leave by EOFY”)
- Cumulative annual leave cap (“use it or lose it”)
- Leave loading on termination payout (configurable per org — Phase 2)
- Compassionate leave evidence upload workflow
- Mandatory minimum notice blocking (warn only in MVP)
- PH substitution / in-lieu day workflows (EBA)
- 5-Year Shift Worker bonus leave type (custom type when leave-types UI matures)

### Non-goals

- Replacing Xero as payroll lodgement source ([parent workforce plan](../plan.md))
- Promoting to `packages/*` before a second app consumer ([ARCHITECTURE.md §5.1](../../../../ARCHITECTURE.md))
- Backfilling demo `SEED_LEAVE` rows (atomic cutover from empty real tables)

## Notion specification

### User flows (locked)

1. Staff submits leave request — type + balance shown, date range, optional reason; status Pending.
2. Manager approves — sees balance impact, team overlap, roster shifts; Approve fires downstream sync.
3. Manager rejects — mandatory reason; audit; employee can re-submit.
4. Staff withdraws pending request — Withdrawn; manager passively notified (event only until Notifications module).
5. Staff cancels approved leave — confirm; balance restored; availability overrides removed.
6. Manager revokes approved leave — mandatory reason; sensitive-action confirm; full audit.
7. LSL eligibility check — state rules from venue; balance shown; insufficient balance blocked.
8. Insufficient balance — options: reduce duration, paid+unpaid split (manager approval), change type.
9. Overlapping team leave — warning with coverage %; no auto-block.
10. Roster conflict on approve — prompt: unassign to open queue / keep assigned / partial unassign.
11. Public holiday leave — manual entry MVP; Phase 2 auto from PH calendar.
12. Termination payout — People termination → payout calc → Payroll Export lines.
13. Leave calendar — staff × dates grid; pending faint; type colours; DFV privacy mask.
14. DFV leave — approve per entitlement; shared calendar privacy rules.

### Intended functionality

**Staff surface (same route, crew role):** Title, “Request leave” CTA, balance summary (hours + days), tabs Upcoming / History, request form with validation at submit.

**Manager surface:** Pending inbox, request detail with employee context + calendar + roster impact, Approve / Reject, bulk approve (MVP-light), calendar view.

**Balances & accrual:** FT annual ~7.3% per hour worked; personal ~3.7%; PT pro-rata on hours worked; casuals no accrual (casual loading in lieu). LSL from state rules + years of service. Accrual on `timesheets.approved_at` transition.

**Org leave types config:** `Settings → Organisation → Leave types` — display names, accrual rules, approval role, archive. Defaults seeded on org create. LSL rate from venue state.

**Sync Availability:** On approve → overrides all blocks unavailable, `source=leave_sync`, `linked_leave_id` set. On cancel/reject → delete linked overrides. Display “On leave” (not generic unavailable).

**Sync Roster:** Approved ranges in `leaveApprovedRangesForWeek()`; hard-block new shifts; on approve optionally unassign conflicting published/draft shifts per manager choice.

**Sync Payroll:** Approved paid leave → `payroll_leave_lines` (or equivalent staging table) hours × base rate, no penalties. Unpaid → zero hours.

### Data + integrations (Notion)

See §4 for DDL. **Writes:** requests, balances, accrual events, audit, availability overrides (via service), payroll staging lines. **Reads:** People, Timesheets, Roster shifts, venue state, org settings.

### Permission gating

| Role | Sees | Edits |
|------|------|-------|
| Staff | Own balances, own requests | Submit, withdraw pending, cancel own approved (with confirm) |
| Venue Manager | Team requests + calendar for venue | Approve/reject (within threshold), revoke with reason |
| Owner / Area Manager | All org leave, configure types | Approve LSL / long blocks / above threshold; balance adjustments; type config |

Sensitive: DFV reason notes — employee, deciding manager, Owner only.

### Other modules this touches

People, Availability, Roster, Timesheets, Payroll Export, Settings → Organisation, Settings → Venues (state for LSL), Forecast Engine (PH Phase 2), Agent (draft requests — read-only balances), Notifications (events only MVP), Insights → Labour (Phase 2 reads).

## Open questions

### Engineering (resolved for implementation)

- [x] **Accrual trigger** — `leaveAccrualService.onTimesheetApproved(timesheetId)` called from timesheet approve path (existing `timesheets` table); idempotent per timesheet via `leave_accrual_events.source_ref`.
- [x] **Payroll Export staging** — `payroll_leave_accrual_lines` table in Leave migration; Payroll Export triad consumes later (contract documented).
- [x] **Org leave types UI** — `app/(main)/…/settings/organisation/leave-types/` colocated with Organisation settings (Notion URL); API at org scope not venue scope.
- [x] **Half-day hours** — `computeLeaveHours(startDate, endDate, startTime?, endTime?, venueTz)` using 7.6h full-day default for FT when times omitted.

### Product (Notion lean — locked)

- Half-day: MVP-light, ship same release.
- Approval threshold >5 days → Owner: MVP-light, default configurable on `organisations.leave_owner_approval_min_days`.
- PH auto-creation: Phase 2.
- Negative balances: no.
- DFV privacy: yes — calendar mask + field-level ACL on reason.

## Decision log

- *3 May 2026 (Notion)* — Full MVP scope: types, balances, accrual, workflow, syncs, LSL, DFV privacy, termination payouts, audit.
- *16 May 2026 (Notion)* — 5-Year Shift Worker bonus type dropped from MVP defaults.
- *31 May 2026 (grill-me)* — **Full Notion MVP** — no phased cut; codebase changes to match spec (replace demo UI, wire roster/availability/timesheet hooks).
- *31 May 2026* — `/workforce/leave` single route with role-based surfaces (no separate `/me` — unlike Availability, Notion App URL is one path).

## 3. Architecture placement

| Decision | Choice | ARCHITECTURE.md |
|----------|--------|-----------------|
| Lives in app | `apps/supersolt` only | §3.2, §5.1 |
| Domain services | `server/workforce/leave.service.ts`, `leave-accrual.service.ts`, `leave-sync.service.ts`, `leave-policy.ts`, `leave-telemetry.ts` | §7.1 |
| Repo | `server/workforce/leave.repo.ts` | §7.1 |
| Availability integration | `leave-sync.service.ts` → `availability.repo` upsert/delete overrides | §7.1 |
| Roster integration | `leave.repo.listApprovedRanges` consumed by `roster.service` + `roster-compliance.service` | §7.1 |
| Timesheet hook | `timesheets.service` (or approve route) calls `leaveAccrualService.onTimesheetApproved` | §7.1 |
| Client | `entities/workforce/leave/`; thin `page.tsx` | §7.1 |
| Settings UI | `settings/organisation/leave-types/` route-colocated | §7.1 |
| API | Route handlers under `app/api/…/workforce/leave/*` + `app/api/organisations/[organisation]/leave-types/*` | §8.1 |
| Auth | `requireRequestAuth` + `assertVenueMember` / `assertOrganisationAdmin`; crew RLS own rows | §3.2, §8.1 |
| UI primitives | `@workspace/ui` | §6 |
| New package edges | None | §3.2 |

## 4. Data model

### Enums

```sql
CREATE TYPE leave_request_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'withdrawn',
  'cancelled'
);

CREATE TYPE leave_accrual_basis AS ENUM (
  'hours_worked',
  'years_service',
  'per_occasion',
  'calendar_year',
  'none'
);

CREATE TYPE leave_approval_role AS ENUM (
  'manager',
  'owner'
);

CREATE TYPE leave_accrual_trigger AS ENUM (
  'timesheet_approval',
  'manual_adjustment',
  'leave_taken',
  'accrual_correction',
  'opening_balance',
  'termination_payout'
);
```

### `leave_types` (org-configurable defaults)

```sql
CREATE TABLE public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  code text NOT NULL, -- annual | personal | long_service | ...
  name text NOT NULL,
  is_paid boolean NOT NULL DEFAULT true,
  is_accruable boolean NOT NULL DEFAULT true,
  accrual_rate_pct numeric(6,3), -- e.g. 7.300 for annual FT
  accrual_basis leave_accrual_basis NOT NULL DEFAULT 'hours_worked',
  default_approval_role leave_approval_role NOT NULL DEFAULT 'manager',
  is_per_occasion boolean NOT NULL DEFAULT false, -- compassionate
  is_private boolean NOT NULL DEFAULT false, -- DFV calendar masking
  is_archived boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, code)
);
```

Seed function `seed_default_leave_types(org_id)` runs on org creation (extend onboarding finalize) with AU statutory rows from Notion table.

### `leave_balances`

```sql
CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types (id) ON DELETE CASCADE,
  current_balance_hours numeric(10,2) NOT NULL DEFAULT 0,
  accrued_lifetime_hours numeric(12,2) NOT NULL DEFAULT 0,
  used_lifetime_hours numeric(12,2) NOT NULL DEFAULT 0,
  last_accrual_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, user_profile_id, leave_type_id)
);
```

### `leave_requests`

```sql
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL, -- submitting / approving venue context
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types (id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time, -- MVP-light half-day
  end_time time,
  total_hours numeric(10,2) NOT NULL,
  is_paid boolean NOT NULL,
  paid_hours numeric(10,2) NOT NULL DEFAULT 0,
  unpaid_hours numeric(10,2) NOT NULL DEFAULT 0,
  reason text,
  comments_to_manager text,
  status leave_request_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by_user_id uuid REFERENCES public.user_profiles (id),
  decision_reason text,
  roster_resolution jsonb, -- { mode: 'unassign_all' | 'keep_all' | 'partial', shift_ids: [] }
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leave_requests_venue_org_fk
    FOREIGN KEY (organisation_id, venue_id) REFERENCES public.venues (organisation_id, id),
  CHECK (end_date >= start_date),
  CHECK (paid_hours + unpaid_hours = total_hours)
);
```

### `leave_request_availability_links`

One row per synced override batch (supports multi-venue staff: overrides per home venue or all assigned venues — MVP: all venues where employee is assigned).

```sql
CREATE TABLE public.leave_request_availability_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id uuid NOT NULL REFERENCES public.leave_requests (id) ON DELETE CASCADE,
  availability_override_id uuid NOT NULL REFERENCES public.venue_staff_availability_overrides (id) ON DELETE CASCADE,
  UNIQUE (leave_request_id, availability_override_id)
);
```

### `leave_audit_log`

```sql
CREATE TABLE public.leave_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  leave_request_id uuid REFERENCES public.leave_requests (id) ON DELETE SET NULL,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id),
  change_type text NOT NULL, -- request_created | approved | rejected | ...
  before_state jsonb,
  after_state jsonb,
  actor_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### `lsl_state_rules` (reference data, seeded)

```sql
CREATE TABLE public.lsl_state_rules (
  state text PRIMARY KEY, -- AU state codes
  min_years_service numeric(4,1) NOT NULL,
  pro_rata_years_service numeric(4,1),
  accrual_weeks_per_year numeric(6,3) NOT NULL
);
```

### `leave_accrual_events`

```sql
CREATE TABLE public.leave_accrual_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types (id),
  triggered_by leave_accrual_trigger NOT NULL,
  hours_change numeric(10,2) NOT NULL,
  source_ref text, -- timesheet id | request id | adjustment id
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX leave_accrual_events_timesheet_uq
  ON public.leave_accrual_events (organisation_id, source_ref, triggered_by)
  WHERE triggered_by = 'timesheet_approval' AND source_ref IS NOT NULL;
```

### `payroll_leave_lines` (Payroll Export consumer)

```sql
CREATE TABLE public.payroll_leave_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id),
  leave_request_id uuid REFERENCES public.leave_requests (id),
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types (id),
  hours numeric(10,2) NOT NULL,
  rate_cents integer NOT NULL,
  is_termination_payout boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Organisation settings columns

```sql
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS leave_owner_approval_min_days integer NOT NULL DEFAULT 5;
```

### Availability FK (after `leave_requests` exists)

```sql
ALTER TABLE public.venue_staff_availability_overrides
  ADD CONSTRAINT venue_staff_availability_overrides_linked_leave_fk
  FOREIGN KEY (linked_leave_id) REFERENCES public.leave_requests (id) ON DELETE CASCADE;
```

### RLS (summary)

| Table | SELECT | INSERT | UPDATE |
|-------|--------|--------|--------|
| `leave_types` | org member | org admin | org admin |
| `leave_balances` | own or venue operator | service / admin adjust | service / accrual job |
| `leave_requests` | own or venue operator for team | own (staff) or operator | status transitions via policy |
| `leave_audit_log` | own subject or operator | authenticated insert via service | — |
| `payroll_leave_lines` | org admin / payroll capability | leave service on approve | — |

Implement `can_view_leave_reason(request, viewer)` for DFV privacy in SQL views or service layer.

### Migration ownership

- **Path:** `apps/supersolt/supabase/migrations/20260601140000_leave_notion_model.sql`
- **Depends on:** `20260601130000_availability_notion_model.sql` (overrides table + `linked_leave_id` column)
- **Pattern:** App-owned §8.1
- **Backfill:** Seed `lsl_state_rules`; seed leave types for existing orgs via one-shot `apps/supersolt/scripts/seed-leave-types.ts`
- **Apply:** `user-supabase-supersolt-mvp` MCP `apply_migration`; then `pnpm drizzle:pull`

## 5. API surface

Base venue: `/api/organisations/[organisation]/venues/[venue]/workforce/leave`

| Operation | Method | Path | Auth | Notes |
|-----------|--------|------|------|-------|
| List requests | GET | `…/requests?status=&from=&to=&userProfileId=` | member | Crew: self only; operator: venue team |
| Create request | POST | `…/requests` | crew self / operator on behalf | Validates balance, sets Pending |
| Get request | GET | `…/requests/[requestId]` | member | DFV reason ACL |
| Withdraw | POST | `…/requests/[requestId]/withdraw` | crew self | Pending only |
| Cancel | POST | `…/requests/[requestId]/cancel` | crew self / operator revoke | Approved → Cancelled; restores balance |
| Decision | POST | `…/requests/[requestId]/decision` | operator / owner per threshold | Body: `approved` \| `rejected`, `reason?`, `rosterResolution?` |
| Bulk approve | POST | `…/requests/bulk-approve` | operator | MVP-light; ids[] |
| Balances | GET | `…/balances?userProfileId=` | self or operator | Hours + days |
| Calendar | GET | `…/calendar?from=&to=&scope=venue\|org` | operator; crew sees team mask only | DFV privacy |
| Team coverage | GET | `…/coverage?from=&to=` | operator | Overlap warnings |

Org settings: `/api/organisations/[organisation]/leave-types`

| Operation | Method | Path | Auth |
|-----------|--------|------|------|
| List types | GET | `…/leave-types` | org member |
| Upsert type | PUT | `…/leave-types/[typeId]` | org admin |
| Archive type | DELETE | `…/leave-types/[typeId]` | org admin |
| Adjust balance | POST | `…/leave/balances/adjust` | org admin |

Internal (not HTTP):

| Consumer | Function |
|----------|----------|
| Roster | `leaveRepo.listApprovedLeaveRanges(venueId, weekStart, weekEnd)` |
| Timesheets | `leaveAccrualService.onTimesheetApproved(tx, timesheet)` |
| People termination | `leaveService.computeTerminationPayout(tx, userProfileId)` |
| Availability | `leaveSyncService.applyApprovedLeave(tx, request)` / `removeLeaveSync(tx, requestId)` |

### Response envelope

Same as Availability: `{ data, error: { message, status, code } }`.

### Validation

- **Zod:** `entities/workforce/leave/schemas.ts`
- **Errors:** `LeaveServiceError` with `LeaveErrorCode` — maps to [`flows.md`](flows.md) §2

## 6. UI composition

```
apps/supersolt/
├── app/(main)/[organisation]/[venue]/workforce/leave/
│   └── page.tsx
├── app/(main)/[organisation]/[venue]/settings/organisation/leave-types/
│   └── page.tsx
├── app/api/…/workforce/leave/
│   ├── requests/route.ts
│   ├── requests/[requestId]/route.ts
│   ├── requests/[requestId]/withdraw/route.ts
│   ├── requests/[requestId]/cancel/route.ts
│   ├── requests/[requestId]/decision/route.ts
│   ├── requests/bulk-approve/route.ts
│   ├── balances/route.ts
│   └── calendar/route.ts
├── app/api/organisations/[organisation]/leave-types/
│   └── …
├── entities/workforce/leave/
│   ├── components/
│   │   ├── leave-page.tsx                 # role switch: staff vs manager
│   │   ├── leave-balance-summary.tsx
│   │   ├── leave-request-sheet.tsx
│   │   ├── leave-request-detail.tsx
│   │   ├── leave-pending-inbox.tsx
│   │   ├── leave-calendar-grid.tsx
│   │   ├── leave-roster-conflict-dialog.tsx
│   │   ├── leave-insufficient-balance-dialog.tsx
│   │   └── leave-type-settings-table.tsx
│   ├── hooks/
│   │   ├── use-leave-requests.ts
│   │   ├── use-leave-balances.ts
│   │   └── use-leave-calendar.ts
│   ├── api/endpoints.ts
│   └── schemas.ts
└── server/workforce/
    ├── leave.service.ts
    ├── leave-accrual.service.ts
    ├── leave-sync.service.ts
    ├── leave-policy.ts
    ├── leave.repo.ts
    ├── leave-telemetry.ts
    └── leave-errors.ts
```

### Codebase changes (explicit)

| File | Change |
|------|--------|
| `leave-page-client.tsx` | **Delete** after `entities/workforce/leave/leave-page.tsx` wired |
| `roster-compliance.service.ts` | Add `approvedLeaveRanges: DateRange[]` to context; hard-block only on leave overlap, not generic unavailability |
| `roster.service.ts` | Load approved leave from `leave.repo`; pass to compliance |
| `availability` migration | FK constraint added in Leave migration |
| `onboarding/finalize` | Call `seed_default_leave_types(orgId)` + initialize balances for invited employees |
| `timesheets` approve path | Invoke accrual service (create if missing) |
| `people` termination | Call `computeTerminationPayout` |
| `workforce/plan.md` | Link this triad; mark Leave specced |
| `availability/flows.md` §3.10 | Update “writer deferred” → wired by Leave MVP |

## 7. Dependencies

### Existing

- `@workspace/ui`
- `@/lib/api/route-auth`, `@/server/auth/rbac`
- `@/server/workforce/availability.repo` — override upsert
- `@/server/workforce/roster.service` — shift list for conflicts
- `@/server/workforce/people.service` — employment type, start date, venue assignments
- `timesheets` table + approve flow
- `user_organisations.employment_type` (Availability migration)

### Upstream contracts Leave provides

| Consumer | Contract |
|----------|----------|
| Roster | `listApprovedLeaveRanges(venueId, from, to) → { userProfileId, startDate, endDate }[]` |
| Availability | Overrides with `source=leave_sync` |
| Payroll Export | `payroll_leave_lines` for pay period queries |
| Insights → Labour | Phase 2 read-only aggregates |

### New external deps

None.

### New package edges

None — no `ARCHITECTURE.md` update required.

## 8. Implementation order (commits)

1. `docs(supersolt): plan workforce leave notion model` — this triad + parent link
2. `feat(supersolt): leave notion migration` — DDL, RLS, LSL seed, org column, availability FK
3. `feat(supersolt): seed default leave types on org create` — onboarding hook + backfill script
4. `test(supersolt): red leave unit + integration tests` — per [`tdd.md`](tdd.md)
5. `feat(supersolt): leave repo + policy + accrual service`
6. `feat(supersolt): leave sync service` — availability + payroll lines
7. `feat(supersolt): leave API routes`
8. `feat(supersolt): timesheet accrual hook`
9. `feat(supersolt): roster approved-leave consumer` — replace availability proxy for `leave_clash`
10. `feat(supersolt): leave entities UI` — replace demo client
11. `feat(supersolt): org leave types settings UI`
12. `feat(supersolt): people termination payout hook`
13. `feat(supersolt): leave telemetry + error codes`
14. `test(supersolt): leave e2e`
15. `chore(supersolt): remove demo leave-page-client`

Deploy steps 2–14 in **one release** (atomic with Availability if not yet shipped).

## 9. Telemetry

| Event | Trigger | Payload |
|-------|---------|---------|
| `leave.viewed` | Page mount | `{ venue_id, role_surface: 'staff' \| 'manager' }` |
| `leave.request_submitted` | POST request success | `{ leave_type_code, total_hours, pending: true }` |
| `leave.approved` | Decision approved | `{ request_id, roster_resolution_mode? }` |
| `leave.rejected` | Decision rejected | `{ request_id }` |
| `leave.withdrawn` | Staff withdraw | `{ request_id }` |
| `leave.cancelled` | Cancel approved | `{ request_id, by: 'staff' \| 'manager' }` |
| `leave.insufficient_balance` | Submit blocked/warn | `{ requested_hours, available_hours }` |
| `leave.team_overlap_warning` | Manager review | `{ overlap_count, coverage_pct }` |
| `leave.roster_conflict` | Approve with shifts | `{ shift_count }` |
| `leave.sync_availability` | Override write | `{ request_id, override_count }` |
| `leave.accrual_posted` | Timesheet approved | `{ timesheet_id, hours_change }` |
| `leave.termination_payout` | People termination | `{ user_profile_id, total_hours }` |
| `leave.forbidden` | 403 | `{ operation, code }` |
| `leave.failed` | 4xx/5xx | `{ operation, code }` |

**Destination:** `server/workforce/leave-telemetry.ts` no-op until analytics pipeline.

## 10. Rollout

- **Feature flag:** none — replace demo UI atomically
- **Env vars:** none
- **Migration sequencing:** apply after Availability migration; deploy app + roster consumer same window
- **Backout:** forward-only; do not deploy UI without migration

**Supabase MCP:** `user-supabase-supersolt-mvp` — `apply_migration`; `get_advisors` after DDL.

## 11. Cross-references

- Parent: [`../plan.md`](../plan.md)
- Availability consumer: [`../availability/plan.md`](../availability/plan.md)
- Roster consumer: [`../roster/plan.md`](../roster/plan.md)
- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Architecture: [ARCHITECTURE.md](../../../../ARCHITECTURE.md)

## Compliance audit (program 2026-06-01)

Full Notion triad. **Done.**

**Updated:** 2026-06-01
- Agent notes: [AGENTS.md](../../../AGENTS.md)

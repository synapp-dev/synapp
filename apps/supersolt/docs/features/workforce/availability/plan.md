# Availability

> **Product:** `apps/supersolt`
> **Slug:** `workforce/availability`
> **Parent:** [`../plan.md`](../plan.md)
> **Routes:** `/{organisation}/{venue}/workforce/availability` (team) · `…/availability/me` (staff)
> **Status:** Planned
> **Owner:** TBD
> **Created:** 2026-05-31
> **Updated:** 2026-05-31

## 1. Summary

Availability is where employees tell Supersolt when they can, prefer, or cannot work. It sits between **People** (who) and **Roster** (when shifts are placed). Managers read team capacity; staff submit on mobile; Roster and Agent consume effective availability for compliance hints and auto-build ranking.

This spec **replaces** the interim day-of-week + optional HH:mm model (`venue_staff_weekly_availability`, `venue_staff_week_instance_availability`) with the [Notion Availability](https://www.notion.so/34f64094bde680af8d86f371fdb250b8) data model: **7 days × 4 time blocks**, three statuses (**available / preferred / unavailable**), effective-dated recurring patterns, date overrides, audit log, and substantive-change approvals for permanent employees.

**Personas:** Staff (primary submitter, `/me`); Venue Manager (team grid, approvals, conflict resolution); Owner / Area Manager (wider scope, pattern review).

**Notion:** [Availability (Module Overview)](https://www.notion.so/34f64094bde680af8d86f371fdb250b8)

**Current code (to remove / replace):**

| Area | Location | Fate |
|------|----------|------|
| Manager week grid | `app/(main)/…/workforce/availability/_components/availability-page-client.tsx` | Delete; replace with `entities/workforce/availability/` |
| API | `app/api/…/workforce/availability/route.ts` | Split into resource routes (§5) |
| Service | `server/workforce/availability.service.ts` | Rewrite for Notion model |
| Repo | `server/workforce/workforce.repo.ts` (availability fns) | New repo module or dedicated `availability.repo.ts` |
| Schema | `venue_staff_weekly_availability`, `venue_staff_week_instance_availability` | **Dropped** in atomic migration |
| Roster hints | `roster.service.ts` → `loadAvailabilityHints` | Remap to 4-block effective resolution |

## 2. Scope

### In scope (MVP — Notion parity)

- **Time blocks** — `morning` (06:00–12:00), `afternoon` (12:00–17:00), `evening` (17:00–22:00), `overnight` (22:00–06:00) venue-local interpretation
- **Statuses** — `available`, `preferred`, `unavailable` per block
- **Recurring patterns** — `venue_staff_availability_patterns` with `effective_from` / `effective_until`, approval workflow fields
- **Overrides** — one-off date + block (`venue_staff_availability_overrides`); `source` includes `leave_sync` (writer deferred until Leave MVP)
- **Effective-date logic** — roster and team views query “as of” calendar date
- **Substantive vs casual** — casual → `auto_applied`; FT/PT reductions below contract → `pending` manager approval (requires `employment_type` on org membership)
- **Staff self-service** — `/workforce/availability/me`, 7×4 grid, one-off unavailability, conflict list vs rostered shifts
- **Manager team view** — date range (default 14 days), position/name filters, conflict indicators, drill-down to employee
- **Conflict detection** — availability change vs existing `roster_shifts`; surface codes + resolution CTAs (swap/leave/escalate per Notion; swap Phase 2 stub)
- **Audit trail** — `venue_staff_availability_audit_log` + manager history UI
- **Permission gating** — crew own-row RLS; operators team read + approvals
- **Empty states** — staff “set availability”; manager “available everywhere” default for unset staff
- **Roster consumer update** — `loadAvailabilityHints` / warn-tier `availability` compliance use block resolution
- **Telemetry** — `availability.*` catalog + no-op tracker
- **Stable API error codes** — see [`flows.md`](flows.md) §2

### Out of scope (Phase 2+)

- Hourly granularity (Notion: 4 blocks for MVP)
- Max hours per week soft caps inside availability
- Shift preference ranking / bidding beyond Preferred status
- Availability template sharing for new hires
- Cross-venue per-venue patterns (MVP: same pattern applies at all venues for the employee)
- Predictive availability from history
- Travel time between venues
- Auto-roster publish from availability alone (Roster auto-build remains draft-only)
- Offline write queue (online-only; retry toasts)
- Notifications delivery (events specced; Email/Notifications module wires later)
- Agent submitting availability on behalf of staff (schema/API extensible; UI Phase 2)

### Non-goals

- Replacing Leave module (sync **reads** leave; Leave **writes** `leave_sync` overrides when live)
- Promoting to `packages/*` before a second app consumer ([ARCHITECTURE.md §5.1](../../../../ARCHITECTURE.md))
- Backfilling legacy day/HH:mm rows (atomic cutover; default = available everywhere)

## Notion specification

### User flows (locked)

1. Staff sets recurring availability (first time) — 7×4 grid; default all **available**; save.
2. Staff edits recurring availability — effective date (default next pay cycle); FT/PT substantive → pending approval; casual auto-applies.
3. Staff one-off unavailability — date + block(s); roster conflict flagged.
4. Manager reviews substantive change — approve / reject / consultation note; audit.
5. Roster conflict with existing shift — staff + manager notified; resolution paths.
6. Leave sync — approved leave → `leave_sync` override, not editable here (hook when Leave ships).
7. Manager team view for date range — staff × day × block summary.
8. New hire default — no patterns → treat as available everywhere.
9. FT/PT below contract hours — flag `substantive_hours_below_contract`.
10. Casual change — immediate apply + passive manager awareness event.
11. Future effective date — current rosters unchanged; future dates use new pattern.
12. Audit history — timeline per employee.

### Intended functionality

**Staff `/me`:** Title, “Edit availability”, “Add unavailability”; 7×4 grid with tap cycle Available → Preferred → Unavailable; one-off list; conflict banner; unsaved-changes bar (mobile-first, ≥44px targets).

**Manager `/availability`:** Date range, venue (scoped), position filter, search; team grid; pending approvals queue; conflict badges; link to employee detail/history.

**Effective resolution (`resolveAvailabilityAsOf(venueId, userProfileId, calendarDate)`):**

1. Overrides for that `calendar_date` (leave_sync wins over employee edits for same block)
2. Else patterns where `effective_from <= date` and (`effective_until` is null or `>= date`)
3. Else **implicit default**: all blocks `available` (Notion new-hire rule)

**Substantive threshold (platform default, org override later in Settings → Organisation):**

- FT/PT: reducing count of `available`+`preferred` blocks below contracted weekly hours **or** >25% block reduction vs current effective pattern → `approval_status = pending`
- Casual: always `auto_applied`

### Data + integrations (Notion)

**Writes:** patterns, overrides, audit, approval decisions.

**Reads:** `user_organisations` (+ new `employment_type`), `user_venues` / People list, `roster_shifts` (conflicts), Leave (`linked_leave_id` FK nullable until Leave table exists).

**Read by:** Roster (primary), People summary (Phase 1.1), Agent (read-only drafts), Insights → Labour (Phase 2).

## Open questions

### Engineering

- [ ] **Org substantive threshold** — store on `organisations` vs hard-code constant for MVP (owner: eng, due: sprint 1). *Lean: constant in `availability-policy.ts`; Settings override in People/Org follow-up.*
- [ ] **Contracted weekly hours** — source from People `employment_type` + future `contracted_hours_per_week` field; MVP use FT=38, PT=part-time hours from People when field missing (owner: eng).

## Decision log

- *3 May 2026 (Notion)* — 4 blocks; 3 statuses; casual auto-apply; leave sync; effective dates; audit; mobile-first staff UX.
- *31 May 2026 (grill-me)* — Full Notion redo; no backfill; resource-split API; `/me` route; RLS + service auth; stable error codes; leave-sync schema first; atomic rollout; full test pyramid.

## 3. Architecture placement

| Decision | Choice | ARCHITECTURE.md |
|----------|--------|-----------------|
| Lives in app | `apps/supersolt` only | §3.2, §5.1 |
| Domain services | `server/workforce/availability.service.ts`, `availability-policy.ts`, `availability-resolve.service.ts`, `availability-telemetry.ts` | §7.1 |
| Repo | `server/workforce/availability.repo.ts` | §7.1 |
| Roster integration | Update `roster.service.ts` `loadAvailabilityHints` → block-aware DTO | §7.1 |
| Client | `entities/workforce/availability/`; thin `page.tsx` wrappers | §7.1 |
| API | Route handlers under `app/api/…/workforce/availability/*` | §8.1 |
| Auth | `requireRequestAuth` + `assertVenueMember`; crew RLS own rows; `assertAvailabilityOperator` for team/approvals (mirror `roster-access.ts`) | §3.2, §8.1 |
| UI primitives | `@workspace/ui` | §6 |
| New package edges | None | §3.2 |

## 4. Data model

### Drop (same migration, before create)

```sql
DROP TABLE IF EXISTS public.venue_staff_week_instance_availability;
DROP TABLE IF EXISTS public.venue_staff_weekly_availability;
```

### Enums

```sql
CREATE TYPE availability_time_block AS ENUM (
  'morning',    -- 06:00-12:00 venue local
  'afternoon',  -- 12:00-17:00
  'evening',    -- 17:00-22:00
  'overnight'   -- 22:00-06:00 (spans midnight)
);

CREATE TYPE availability_block_status AS ENUM (
  'available',
  'preferred',
  'unavailable'
);

CREATE TYPE availability_approval_status AS ENUM (
  'auto_applied',
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE availability_override_reason AS ENUM (
  'one_off',
  'leave',
  'other'
);

CREATE TYPE availability_override_source AS ENUM (
  'employee',
  'leave_sync',
  'manager'
);

CREATE TYPE employment_type AS ENUM (
  'full_time',
  'part_time',
  'casual'
);
```

### People prerequisite (same migration)

```sql
ALTER TABLE public.user_organisations
  ADD COLUMN IF NOT EXISTS employment_type employment_type NOT NULL DEFAULT 'casual';

ALTER TABLE public.user_organisations
  ADD COLUMN IF NOT EXISTS contracted_hours_per_week numeric(4,1);
-- NULL → policy defaults: full_time 38, part_time 20 until People captures explicit value
```

### `venue_staff_availability_patterns`

Recurring + effective-dated schedule (Notion “Availability recurring patterns table”).

```sql
CREATE TABLE public.venue_staff_availability_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  time_block availability_time_block NOT NULL,
  status availability_block_status NOT NULL,
  effective_from date NOT NULL,
  effective_until date,
  notes text,
  approval_status availability_approval_status NOT NULL DEFAULT 'auto_applied',
  approved_by_user_id uuid REFERENCES public.user_profiles (id),
  approved_at timestamptz,
  rejection_reason text,
  created_by_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_staff_availability_patterns_venue_org_fk
    FOREIGN KEY (organisation_id, venue_id) REFERENCES public.venues (organisation_id, id) ON DELETE CASCADE
);

CREATE INDEX venue_staff_availability_patterns_lookup_idx
  ON public.venue_staff_availability_patterns (venue_id, user_profile_id, effective_from DESC);

CREATE UNIQUE INDEX venue_staff_availability_patterns_active_uq
  ON public.venue_staff_availability_patterns (
    venue_id, user_profile_id, day_of_week, time_block, effective_from
  );
```

### `venue_staff_availability_overrides`

One-off and leave-sync (Notion “Availability overrides table”).

```sql
CREATE TABLE public.venue_staff_availability_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  calendar_date date NOT NULL,
  time_block availability_time_block NOT NULL,
  status availability_block_status NOT NULL,
  reason_category availability_override_reason NOT NULL DEFAULT 'one_off',
  source availability_override_source NOT NULL DEFAULT 'employee',
  linked_leave_id uuid, -- FK added when leave_requests table exists
  notes text,
  created_by_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_staff_availability_overrides_venue_org_fk
    FOREIGN KEY (organisation_id, venue_id) REFERENCES public.venues (organisation_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX venue_staff_availability_overrides_uq
  ON public.venue_staff_availability_overrides (
    venue_id, user_profile_id, calendar_date, time_block
  );
```

### `venue_staff_availability_audit_log`

```sql
CREATE TABLE public.venue_staff_availability_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  change_type text NOT NULL, -- pattern_upsert | override_upsert | approval_decision | ...
  before_state jsonb,
  after_state jsonb,
  actor_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  approval_status availability_approval_status,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX venue_staff_availability_audit_subject_idx
  ON public.venue_staff_availability_audit_log (venue_id, user_profile_id, created_at DESC);
```

### RLS (defense in depth)

| Policy | Operation | Rule |
|--------|-----------|------|
| `…_select_org_member` | SELECT | Active `user_organisations` member for `organisation_id` |
| `…_patterns_insert_own` | INSERT patterns | `user_profile_id = auth.uid()` **or** operator via `is_venue_operator(venue_id)` |
| `…_patterns_update_own` | UPDATE patterns | Own row while `approval_status IN ('auto_applied','approved')` **or** operator |
| `…_overrides_insert_own` | INSERT overrides | Own + `source = 'employee'`; `leave_sync` inserts **service role / Leave job only** |
| `…_overrides_update_own` | UPDATE overrides | Own employee rows where `source != 'leave_sync'` |
| `…_audit_select` | SELECT audit | Own subject or operator |

Implement `is_venue_operator(venue_id)` SQL helper (owner, admin, manager, supervisor for that venue) — same role set as `OPERATOR_DASHBOARD_ROLE_SLUGS`.

### Migration ownership

- **Path:** `apps/supersolt/supabase/migrations/20260601130000_availability_notion_model.sql`
- **Pattern:** App-owned §8.1
- **Backfill:** None — drop legacy tables; implicit default available everywhere
- **Apply:** `user-supabase-supersolt-mvp` MCP `apply_migration` in commit order; then `pnpm drizzle:pull` (do not hand-edit `drizzle/schema.ts`)

### Generated types

Regenerate `apps/supersolt/drizzle/schema.ts` after migration applies.

## 5. API surface

Base: `/api/organisations/[organisation]/venues/[venue]/workforce/availability`

| Operation | Method | Path | Auth | Notes |
|-----------|--------|------|------|-------|
| List effective patterns | GET | `…/patterns?asOf=YYYY-MM-DD&userProfileId=` | member | Operator any staff; crew only self |
| Upsert pattern row | PUT | `…/patterns` | crew self / operator | Body: dow, block, status, effectiveFrom; may return `pending` |
| List overrides | GET | `…/overrides?from=&to=&userProfileId=` | member | |
| Upsert override | PUT | `…/overrides` | crew self / operator | Rejects `leave_sync` from client |
| Delete override | DELETE | `…/overrides/[overrideId]` | crew self / operator | Block if `leave_sync` |
| Pending substantive changes | GET | `…/changes?status=pending` | operator | Queue for manager |
| Approve / reject | POST | `…/changes/[patternId]/decision` | operator | Body: `approved` \| `rejected`, `reason?` |
| Team grid | GET | `…/team?from=&to=&positionId=&q=` | operator | Resolved blocks per staff/day |
| Staff bundle | GET | `…/me?from=&to=` | crew (self) | Patterns + overrides + conflicts |
| Staff save grid | PUT | `…/me/patterns` | crew | Batch 7×4 with effectiveFrom |
| Audit history | GET | `…/history/[userProfileId]?limit=` | self or operator | |

### Response envelope

```json
{ "data": T, "error": null }
{ "data": null, "error": { "message": "…", "status": 409, "code": "roster_shift_conflict" } }
```

### Validation

- **Zod:** `entities/workforce/availability/schemas.ts` — shared by routes + client forms
- **Errors:** `AvailabilityServiceError` extends pattern of `PeopleServiceError` with `code: AvailabilityErrorCode`

### Roster-facing internal API

`availabilityResolveService.blocksForShift(venueId, userProfileId, shiftStartsAt, shiftEndsAt, venueTz)` → `{ status, blocks[] }` for compliance + hints.

## 6. UI composition

```
apps/supersolt/
├── app/(main)/[organisation]/[venue]/workforce/availability/
│   ├── page.tsx                          # Team view shell
│   └── me/page.tsx                       # Staff self-service
├── app/api/…/workforce/availability/
│   ├── patterns/route.ts
│   ├── overrides/route.ts
│   ├── overrides/[overrideId]/route.ts
│   ├── changes/route.ts
│   ├── changes/[patternId]/decision/route.ts
│   ├── team/route.ts
│   ├── me/route.ts
│   ├── me/patterns/route.ts
│   └── history/[userProfileId]/route.ts
├── entities/workforce/availability/
│   ├── components/
│   │   ├── availability-block-grid.tsx     # 7×4 shared grid
│   │   ├── staff-availability-page.tsx
│   │   ├── team-availability-page.tsx
│   │   ├── one-off-unavailability-sheet.tsx
│   │   ├── pending-changes-panel.tsx
│   │   └── audit-timeline.tsx
│   ├── hooks/
│   │   ├── use-availability-me.ts
│   │   └── use-availability-team.ts
│   ├── api/endpoints.ts
│   └── schemas.ts
└── server/workforce/
    ├── availability.service.ts
    ├── availability-resolve.service.ts
    ├── availability-policy.ts
    ├── availability.repo.ts
    ├── availability-telemetry.ts
    └── availability-errors.ts
```

### Navigation

- **Sidebar:** “Availability” → team route for operators; crew nav adds “My availability” → `/me` (update `getStaffDashboardRedirectPath` or secondary nav item).
- **Deep link:** `?effectiveFrom=YYYY-MM-DD` on staff edit flow.

### Component map

| UI | Source |
|----|--------|
| Grid cells, sheets, toasts | `@workspace/ui` |
| Block colours / labels | `entities/workforce/availability/` (green/blue/grey per Notion) |
| Position filter | Reuse `position-styles` / People list DTO |

## 7. Dependencies

### Existing

- `@workspace/ui` — Button, Card, Sheet, Toggle, Toast, Skeleton
- `@/lib/api/route-auth`, `@/server/auth/rbac`, `@/server/auth/capabilities`
- `@/server/workforce/people.service` — staff list, employment type
- `@/server/workforce/roster.service` — shift overlap for conflicts
- `lib/roster/venue-time.ts` — venue TZ for block boundaries

### New external deps

None.

### New package edges

None.

## 8. Implementation order (commits)

1. `docs(supersolt): plan workforce availability notion model` — this triad + parent link
2. `feat(supersolt): availability notion migration` — DDL, RLS, drop legacy tables, `employment_type`
3. `test(supersolt): red availability unit + integration tests` — per [`tdd.md`](tdd.md)
4. `feat(supersolt): availability resolve + repo + services`
5. `feat(supersolt): availability API routes`
6. `feat(supersolt): roster availability block hints`
7. `feat(supersolt): availability entities UI staff + team`
8. `feat(supersolt): availability error codes + telemetry stub`
9. `test(supersolt): availability e2e`
10. `chore(supersolt): remove legacy availability page + routes`

Deploy steps 2–9 in **one release** (atomic).

## 9. Telemetry

| Event | Trigger | Payload |
|-------|---------|---------|
| `availability.viewed` | Team or `/me` mount | `{ venue_id, surface: 'team' \| 'me' }` |
| `availability.pattern_submitted` | Pattern save success | `{ user_profile_id, effective_from, pending: boolean }` |
| `availability.override_created` | One-off saved | `{ calendar_date, time_block, status }` |
| `availability.substantive_pending` | FT/PT → pending | `{ user_profile_id, blocks_removed_count }` |
| `availability.change_approved` | Manager approves | `{ pattern_id, approver_id }` |
| `availability.change_rejected` | Manager rejects | `{ pattern_id, reason }` |
| `availability.roster_conflict` | Conflict detected | `{ shift_id, calendar_date, time_block }` |
| `availability.leave_sync_applied` | Leave hook (future) | `{ linked_leave_id, from, to }` |
| `availability.forbidden` | 403 | `{ operation, code }` |
| `availability.failed` | 4xx/5xx | `{ operation, code, message }` |

**Destination:** `server/workforce/availability-telemetry.ts` no-op `track()` until analytics pipeline exists.

## 10. Rollout

- **Feature flag:** none — atomic cutover
- **Env vars:** none
- **Migration sequencing:** apply migration → deploy app + roster consumer in same window; brief maintenance acceptable
- **Backout:** forward-only; redeploy previous app **only** if migration not applied; if migration applied, do not drop new tables without data export

**Supabase MCP:** `user-supabase-supersolt-mvp` — `apply_migration` with same SQL as committed file; `get_advisors` after DDL.

## 11. Cross-references

- Parent: [`../plan.md`](../plan.md)
- Roster consumer: [`../roster/plan.md`](../roster/plan.md)
- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Architecture: [ARCHITECTURE.md](../../../../ARCHITECTURE.md)

## Compliance audit (program 2026-06-01)

Full Notion triad. **Done.**

**Updated:** 2026-06-01
- Agent notes: [AGENTS.md](../../../AGENTS.md)

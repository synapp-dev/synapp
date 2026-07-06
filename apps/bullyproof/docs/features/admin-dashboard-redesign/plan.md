# Admin Dashboard Redesign (Program Health)

> **Product:** `apps/bullyproof`
> **Slug:** `admin-dashboard-redesign`
> **Status:** Planned
> **Owner:** Engineering (Sprint 3 — Jun 7–17 2026)
> **Created:** 2026-06-03
> **Notion sprint:** [Admin Dashboard Redesign](https://app.notion.com/p/Admin-Dashboard-Redesign-374f705080ed8073b5ebdae36d2fa54c)

## 1. Summary

Replace the current platform admin `/dashboard` overview (hero, quick actions, four generic metric cards) with Glenn's **program-health dashboard**: summary stats (Total / Active / Ahead / Slightly Behind / Behind), a Term 2 progress widget, filterable sortable school table with drill-down columns, and server-side schedule logic scoped to each school's state calendar.

Serves platform admins monitoring school adoption and lesson cadence through Term 2. This is Sprint 3 of the [Jun 2026 admin portal sprint](../../sprints/admin-portal-sprint-jun-2026.md).

## 2. Scope

### In scope (MVP — Sprint 3)

- Quick-action renames: Manage Schools / Manage Lessons / Manage AP Cert (**shipped** in `overview-section.tsx`)
- Summary stat cards: Total Schools, Active Schools, Ahead, Slightly Behind, Behind
- Term 2 progress widget (state selector, default Qld; current week + % elapsed)
- Filters: Status, State, Sector, Type (default All); Schedule filter on computed status
- Sortable program-health table with columns: School Name, Culture, AP Cert %, Total Students, Total Classes, Lessons Completed (Avg %), Schedule, Last Activity, Action (P2)
- Column drill-downs (links to existing admin/school routes)
- **Active School** definition aligned with existing `resolveSchoolStatus()` + full unlock
- Schedule engine (terms, rules, class → school aggregation) — see [`schedule-engine/plan.md`](schedule-engine/plan.md)
- `GET /api/admin/dashboard/program-health` aggregated API

### Out of scope (deferred)

- **Action column** ⋮ export menu — defer to Sprint 5 Reports unless time remains (P2)
- **Annual term reset** automation — seed + manual admin update for 2026; cron in follow-up (Sprint 3 P1 task)
- Culture Rating **formula fixes** — Sprint 4; dashboard shows best-effort ↑/↓/BM/NA from latest comparative period
- Replacing hero section / live activity feed — keep `HeroSection` above program-health block
- Government / teacher / staff dashboards — unchanged

### Non-goals

- Real-time websocket updates (poll/refetch on focus is sufficient)
- New shared package for schedule logic (single consumer: bullyproof admin)
- Duplicating `/admin/schools` CRUD — table links into existing schools section

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/bullyproof` only | §3.2, §5.1 |
| Domain code location | `server/dashboard/` (services, repos, pure engine), `entities/dashboard/` (UI, hooks, types) | §7.1 |
| Shell vs domain | Route stays `app/(main)/dashboard/page.tsx`; domain in `entities/dashboard/ui/admin/` | §7.1 |
| Auth dependency | Route handler + `getUserIdFromRequest`; feature gate `/admin/schools`; client uses `apiFetch` only | §3.2 |
| New package edges | None | §3.2, §10 |

> No `ARCHITECTURE.md` update required.

### Sub-features

| Sub-slug | Purpose | Triad |
|----------|---------|-------|
| [`schedule-engine`](schedule-engine/plan.md) | Term calendars, lesson cadence rules, Ahead/Behind math | plan / tdd / flows |

Parent UI and API consume the schedule-engine module; implement schedule-engine first (TDD), then program-health aggregation, then UI.

## 4. Data model

### New tables (schedule-engine — detail in child plan)

```sql
-- apps/bullyproof/drizzle/NNNN_school_term_calendars.sql
CREATE TABLE school_term_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code text NOT NULL,          -- QLD, NSW, VIC, SA, WA, TAS, NT, ACT
  calendar_year int NOT NULL,
  term_number smallint NOT NULL,     -- 1–4
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (state_code, calendar_year, term_number)
);
```

No changes to `schools` table — state already via `schools.state_id` → `states`.

### RLS

| Policy | Role | Rule |
|--------|------|------|
| `school_term_calendars_select` | `authenticated` | `true` (reference data; writes admin-only via service role / migration) |
| Inserts/updates | service role / migration only | No school-scoped RLS needed |

Program-health API enforces **authorization in the route handler** (`/admin/schools` feature), not row-level school filtering on the calendar table.

### Migration ownership

- **Path:** `apps/bullyproof/drizzle/` (new SQL migration + `schema.ts` sync)
- **Pattern:** App-owned (§8.1)
- **Backfill:** `apps/bullyproof/scripts/seed-school-term-calendars-2026.mjs` — Qld–ACT Term 1–4 dates for 2026 (source: state education dept published calendars; verify before prod)

### Generated types

Regenerate `apps/bullyproof/drizzle/schema.ts` and `server/db/schema.ts` after migration.

## 5. API surface

| Operation | Surface | Path | Auth | Notes |
|-----------|---------|------|------|-------|
| Program health list + summary | Route Handler GET | `app/api/admin/dashboard/program-health/route.ts` | `/admin/schools` | Query: `state`, `sector`, `status`, `type`, `schedule`, `sort`, `order` |
| Term progress (widget) | Same response or dedicated field | embedded in program-health | same | `termProgress: { stateCode, termNumber, weekOfTerm, percentElapsed }` |

### Response shape (sketch)

```ts
type ProgramHealthSummary = {
  totalSchools: number;
  activeSchools: number;
  ahead: number;
  slightlyBehind: number;
  behind: number;
  notApplicable: number; // non-active schools excluded from schedule counts
};

type ProgramHealthSchoolRow = {
  schoolId: string;
  name: string;
  slug: string | null;
  status: "onboarding" | "ready" | "active" | "certification";
  stateCode: string | null;
  sector: string | null;
  schoolType: string | null;
  cultureIndicator: "up" | "down" | "benchmark" | "na";
  apCertPercent: number | null;
  totalStudents: number | null;
  totalClasses: number;
  lessonsCompletedAvgPercent: number | null;
  scheduleStatus: "ahead" | "slightly_behind" | "behind" | "na";
  lastActivityAt: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
};
```

### Validation

- Input: Zod schema in `server/dashboard/program-health.validators.ts`
- Error mapping: [`flows.md`](flows.md) error table

## 6. UI composition

```
apps/bullyproof/
├── app/(main)/dashboard/page.tsx              # unchanged entry; AdminDashboard
├── app/api/admin/dashboard/program-health/route.ts
├── server/dashboard/
│   ├── program-health.service.ts
│   ├── program-health.repo.ts
│   ├── program-health.validators.ts
│   └── schedule-engine/                       # see schedule-engine/plan.md
├── entities/dashboard/
│   ├── api/program-health.ts                  # client apiFetch wrapper
│   ├── model/useProgramHealthQuery.ts
│   └── ui/admin/
│       ├── admin-dashboard.tsx                # Hero + ProgramHealthSection
│       └── sections/overview/
│           ├── overview-section.tsx           # quick actions (renamed) — keep or slim
│           ├── program-health-section.tsx     # NEW: stats + widget + table
│           ├── program-health-summary-cards.tsx
│           ├── term-progress-widget.tsx
│           └── program-health-table.tsx
```

Reuse filter UX patterns from `entities/dashboard/ui/admin/sections/schools/schools-section.tsx` and table patterns from `schools-data-table.tsx`.

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Card, Table, Select, Badge, Skeleton | `@workspace/ui` | No duplication |
| `SchoolStatusBadge` | `entities/school/ui/` | Status column / filter |
| `SnapshotCard` / hero cards | `entities/dashboard/ui/admin/cards/` | Summary stat styling |

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — layout, table, filters, skeletons
- `@workspace/supabase` — session in route handlers (via existing auth helpers)
- Drizzle + existing `school.service`, `admin-reports.repo`, `permissionTemplatesService`, culture tables

### New external deps

None.

### New package edges

None.

## 8. Implementation order (commits)

1. `docs(bullyproof): plan admin-dashboard-redesign feature` — this triad (**this change**)
2. `feat(bullyproof): rename admin dashboard quick actions` — sidebar labels (**done**)
3. `feat(bullyproof): add school_term_calendars migration + seed` — schedule-engine DDL
4. `test(bullyproof): red tests for schedule-engine` — per [`schedule-engine/tdd.md`](schedule-engine/tdd.md)
5. `feat(bullyproof): implement schedule-engine` — green unit tests
6. `test(bullyproof): red tests for program-health service`
7. `feat(bullyproof): add program-health API route`
8. `feat(bullyproof): wire program-health dashboard UI`
9. `feat(bullyproof): add dashboard column drill-down links`
10. `feat(bullyproof): program-health error and empty states`
11. `docs(bullyproof): mark admin-dashboard-redesign complete`

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| `admin_dashboard.program_health.viewed` | ProgramHealthSection mount | `{ user_id }` | Server log (no analytics SDK today) |
| `admin_dashboard.program_health.filtered` | Filter change | `{ filter_key, value }` | Server log |
| `admin_dashboard.program_health.drilldown` | Column link click | `{ column, school_id }` | Server log |

Product analytics deferred — match existing admin reports pattern (no PostHog in app).

## 10. Rollout

- **Feature flag:** none — replaces admin dashboard in place for users with `system:admin-access`
- **Env vars:** none
- **Migration sequencing:** apply `school_term_calendars` migration **before** deploy that calls schedule engine
- **Backout:** revert UI to old snapshot cards; API unused; calendar table harmless if empty (widget shows "terms not configured")

## 11. Open questions

- [ ] **Slightly behind vs behind thresholds** — owner: Glenn, due: before schedule-engine merge. **Recommended default:** 0 lessons behind = Ahead; exactly 1 lesson-week (or half-period for L5) = Slightly Behind; ≥2 lesson-weeks = Behind. Document in schedule-engine and flag in UI as beta until confirmed.
- [ ] **Drill-down destination specs** for AP Cert % and Class Detail — owner: Glenn, due: Sprint 3 day 7. **Recommended:** AP Cert → `/admin/reports/certification?school={slug}`; Classes → `/admin/schools?school={slug}` drawer Classes tab.
- [ ] **Total Students** source — no column on `classes` today (Sprint 6 adds Student Numbers). **Recommended:** show `—` until Sprint 6; optional sum when field exists.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- User flows: [`flows.md`](flows.md)
- Schedule engine: [`schedule-engine/plan.md`](schedule-engine/plan.md)
- Sprint backlog: [`../../sprints/admin-portal-sprint-jun-2026.md`](../../sprints/admin-portal-sprint-jun-2026.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)

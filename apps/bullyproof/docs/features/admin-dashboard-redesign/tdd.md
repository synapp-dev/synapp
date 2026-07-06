# Admin Dashboard Redesign — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Schedule-engine unit tests are in [`schedule-engine/tdd.md`](schedule-engine/tdd.md) — run those first.

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `isActiveSchool` true only when ready + full unlock | `server/dashboard/active-school.test.ts` | red |
| 2 | unit | schedule-engine cases (see child tdd) | `schedule-engine/*.test.ts` | red |
| 3 | unit | program-health validator rejects invalid filter enums | `server/dashboard/program-health.validators.test.ts` | red |
| 4 | unit | program-health service maps repo rows to API shape | `server/dashboard/program-health.service.test.ts` | red |
| 5 | integration | GET program-health returns 401 without session | `app/api/admin/dashboard/program-health/route.test.ts` | red |
| 6 | integration | GET program-health returns 403 without `/admin/schools` | same | red |
| 7 | integration | GET program-health returns summary + rows for admin | same | red |
| 8 | unit (hook) | `useProgramHealthQuery` loading → data → error | `entities/dashboard/model/useProgramHealthQuery.test.tsx` | red |
| 9 | component | summary cards render counts from query | `program-health-summary-cards.test.tsx` | red |
| 10 | component | table renders empty state when no schools | `program-health-table.test.tsx` | red |
| 11 | component | filter change updates query params | `program-health-section.test.tsx` | red |
| 12 | manual | happy path smoke (see flows §1) | — | red |

After schedule-engine (#2) is green, proceed with #3–7, then UI #8–11.

## 2. Unit tests

### `isActiveSchool`

- **Subject:** `server/dashboard/active-school.ts`
- **Cases:**
  - Full unlock + all counts ≥ 1 → `true`
  - Full unlock + missing class → `false`
  - Ready counts but certification-only unlock → `false`
  - Onboarding counts → `false`

### `program-health.service`

- Mock `program-health.repo` and `scheduleEngine`
- Summary aggregation: 3 ahead + 1 behind → correct totals
- Non-active schools contribute to `totalSchools` but `scheduleStatus: na`
- Culture indicator mapping from latest comparative period mock

### Validators

- Accept `state=QLD`, `schedule=ahead`
- Reject unknown `sort` column
- Default all filters to "all" when omitted

## 3. Integration tests (DB + auth)

Run against local Supabase + seeded fixtures when available; otherwise route-level mocks with `vi.mock` on service (match `recommendation-engine.test.ts` style for unit-heavy app).

### Setup

```ts
// apps/bullyproof/test/fixtures/program-health.ts
export const FIXTURE_SCHOOL_ACTIVE = { id: "...", stateCode: "QLD", ... };
export const FIXTURE_TERM_2026_QLD_T2 = { start: "2026-04-20", end: "2026-06-26" };
```

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| No cookie | anon | 401 |
| Teacher only | authenticated | 403 |
| Platform admin | authenticated + `/admin/schools` | 200 + `{ summary, rows, termProgress }` |
| Filter state=NSW | admin | rows all NSW |

> RLS: program-health reads schools via service role / admin-gated handler — same pattern as `app/api/admin/reports/overview/route.ts`. No new RLS policies on `schools`.

## 4. End-to-end

No Playwright config in bullyproof today. **Manual smoke** in [`flows.md`](flows.md) §1 required before Sprint 3 close.

## 5. Fixtures

- **Location:** `apps/bullyproof/test/fixtures/program-health.ts`
- **Term seed:** rely on `scripts/seed-school-term-calendars-2026.mjs`
- **Deterministic UUIDs** for stable assertions

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| schedule-engine branch coverage | ≥80% | Required before UI work |
| program-health service | key paths covered | summary + row mapping |
| Architecture lint | clean | `pnpm lint:architecture` |

## 7. What NOT to test

- `@workspace/ui` Table sort internals
- Full Drizzle query plans — trust repo integration spot-check

## 8. Refactor checklist

- [ ] Schedule logic only in `server/dashboard/schedule-engine/`
- [ ] Single Zod schema for query params
- [ ] No `@workspace/ui` → Supabase imports
- [ ] `ProgramHealthSection` split if >250 lines

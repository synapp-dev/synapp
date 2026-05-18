# Dashboard (operator home) — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives test-first implementation order.

## 1. Test list (red → green → refactor)

Author each test before its production code where practical. Order matters.

| # | Layer | Behavior under test | File (illustrative) | Status |
|---|-------|---------------------|---------------------|--------|
| 1 | unit | Time-window + venue scope types / mappers reject invalid combinations | `apps/supersolt/server/dashboard/dashboard-scope.schema.test.ts` | red |
| 2 | unit | Prefs PATCH body validation (Zod) rejects unknown enums / malformed dates | `apps/supersolt/server/dashboard/dashboard-preferences.validation.test.ts` | red |
| 3 | integration | **RLS** — owner reads/writes own prefs row; other user in same org **cannot** read | `apps/supersolt/server/dashboard/dashboard-preferences.rls.int.test.ts` | red |
| 4 | integration | **RLS** — digest cache row readable only by owning user | same or sibling `*.int.test.ts` | red |
| 5 | unit (handler) | GET summary returns **200** + JSON shape; optional **fixture** mode returns stable payload | `apps/supersolt/app/api/organisations/[organisation]/dashboard/summary/route.test.ts` | red |
| 6 | unit (handler) | GET/PATCH prefs — **401** without session; **403** without org membership | `.../preferences/route.test.ts` | red |
| 7 | component (RTL) | Tile grid renders **permission-gated** tiles for mock Owner context | `apps/supersolt/entities/dashboard/components/dashboard-tile-grid.test.tsx` | red |
| 8 | component (RTL) | Failed tile shows **inline error + Retry**; other tiles still visible | `apps/supersolt/entities/dashboard/components/dashboard-tile-error.test.tsx` | red |
| 9 | component (RTL) | Time-window selector **optimistic** update; banner on prefs save failure | `apps/supersolt/entities/dashboard/components/time-window-selector.test.tsx` | red |
| 10 | layout / redirect | **Staff** access context → `redirect()` to configured roster path (mock `redirect`) | `apps/supersolt/app/(main)/dashboard/layout.test.tsx` | red |
| 11 | e2e | **Manual smoke** only unless Playwright lands — see [`flows.md`](flows.md) §1 footer | n/a | manual |

After each item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### Pure functions / validators

- **Subject:** dashboard scope + prefs validation modules under `apps/supersolt/server/dashboard/`
- **Cases:** enum boundaries, custom date range requires start/end, venue multi-select vs org rollup rules
- **Runner:** Vitest (`pnpm test` in `apps/supersolt`)
- **Mocks:** none inside pure validators

### Handlers

- **Setup:** mock `createServerClient` / `getUser` / `loadAccessContextForUser` via Vitest module mocks
- **Assertions:** status codes, JSON shape, no secrets in response body

## 3. Integration tests (DB + RLS)

Run against **local Supabase** for `apps/supersolt` when migrations in [`plan.md`](plan.md) §4 exist.

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| Owner reads own prefs | `authenticated` matching `user_id` | row returned |
| Peer in org cannot read prefs | `authenticated` different `user_id` | empty / error per RLS |
| Anon | `anon` | denied |
| Service role job (if used) | `service_role` | can upsert digest rows per policy |

> Migrations and RLS live under **`apps/supersolt/supabase/migrations/`** ([ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md)).

## 4. End-to-end (happy path)

- **Tool:** Playwright **only if** `apps/supersolt/playwright.config.ts` is added; until then **manual smoke** in [`flows.md`](flows.md).
- **Scenario:** Owner lands on `/dashboard`, sees digest + KPI strip, changes time window, drills a tile.

## 5. Fixtures and seed data

- **Location:** `apps/supersolt/entities/dashboard/model/` (fixtures) + optional `apps/supersolt/test/fixtures/dashboard.ts`
- **Determinism:** fixed UUIDs for integration tests
- **Auth:** reuse any existing **test user** helpers in the app; if none, document creation steps in `flows.md` and add helpers in the same PR as first integration test

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| New unit/handler tests | green | Required for merged handlers and validators |
| RLS integration cases in §3 | 100% when DDL merges | Required before relying on prefs/digest in prod |
| E2E | manual until harness | |
| Architecture lint | clean | `pnpm lint:architecture` from monorepo root |

## 7. What NOT to test here

- `@workspace/ui` primitive internals
- Full Square/Xero SDK behaviour — stub at HTTP or repository boundary
- Child **Superbot suggestions** carousel timing — covered in [`../dashboard-superbot-suggestions/tdd.md`](../dashboard-superbot-suggestions/tdd.md)

## 8. Refactor checklist (after green)

- [ ] Validation in one Zod module shared by PATCH handler and any server action-shaped callers
- [ ] No `any`; DB types from generated `Database`
- [ ] No app-to-app imports
- [ ] No `@workspace/ui` → Supabase
- [ ] Large tiles split so files stay reviewable

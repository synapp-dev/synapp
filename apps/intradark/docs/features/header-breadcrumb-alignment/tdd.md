# Header breadcrumb alignment — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order for **pure** logic; middleware is **manual** verification.

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `formatSegment` title-cases kebab segments | `apps/intradark/lib/main-nav-routes.test.ts` (path TBD) | red |
| 2 | unit | Breadcrumb model for `/dashboard` yields star-only current page + expected segment count | same | red |
| 3 | unit | Breadcrumb model for `/news` includes root linkability + “News” crumb with main-nav icon when map matches | same | red |
| 4 | unit | **≤3** path segments: first main-nav crumb includes **label** alongside icon | same | red |
| 5 | unit | **≥4** path segments: first main-nav crumb is **icon-only** (label suppressed); trailing crumbs remain text | same | red |
| 6 | unit | Unknown / dynamic segments (e.g. numeric id) use `formatSegment` only; **no** icon attached | same | red |
| 7 | unit | Reserved or empty pathname edge cases do not throw (e.g. `/`, single segment) | same | red |
| 8 | manual | Middleware redirect matrix from [`flows.md`](flows.md) §5 | _document only_ | pending |

After each unit item turns green, refactor before the next.

## 2. Unit tests

### Pure functions

- **Subject:** `formatSegment`, `buildBreadcrumbEntries` / `buildBreadcrumbModel` (final names in implementation), and **segment-count** helper used for icon-only vs icon+label.
- **Cases:**
  - `/` → model usable by header (no crash; star handling may be header-local).
  - `/dashboard`, `/news`, `/match/123/veto` segment lists and `href` chain correctness.
  - Threshold at **3 vs 4** segments (non-empty split on `/`).
  - First matching **main-nav** segment index when path is `/sandbox/foo` vs `/news`.
- **Runner:** `pnpm test` in `apps/intradark` (Vitest).
- **No mocks** for pure functions.

## 3. Integration tests (DB + RLS)

_n/a — this feature does not touch Postgres or RLS._

## 4. End-to-end (happy path)

- **Tool:** Playwright **not** in MVP for this feature ([`plan.md`](plan.md) scope).
- **Manual:** Follow [`flows.md`](flows.md) §1 and §5 before merge.

## 5. Fixtures and seed data

_n/a_

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| New pure-module branch coverage | Aim ≥80% on new file | Enforce locally before merge |
| Integration cases §3 | n/a | — |
| E2E | Manual checklist only | — |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- `@workspace/ui` Breadcrumb DOM — trust the design system.
- Supabase `getUser` internals — covered by platform; middleware verified manually.

## 8. Refactor checklist (after green)

- [ ] Sidebar and header both import the **same** route map; no duplicated Lucide imports for the same path.
- [ ] No `any` in new helpers.
- [ ] No `apps/<A>` → `apps/<B>` imports.
- [ ] No new `@workspace/ui` → Supabase edge.
- [ ] `AppHeader` stays readable; extract crumb row component if needed.

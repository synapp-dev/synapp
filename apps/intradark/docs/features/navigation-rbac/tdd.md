# Navigation RBAC — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order.

## 1. Test list (red → green → refactor)

Author each test before its production code. Each item is a single behavior. Order matters.

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `mergeRoleSlugs(direct, templateExpanded)` dedupes and preserves deterministic sort | `apps/intradark/entities/rbac/lib/effective-slugs.test.ts` | red |
| 2 | unit | `expandTemplates(rows)` maps `(template_id → role slugs)` correctly | same | red |
| 3 | unit | `getAnonymousNavSlugs()` matches **`NAV_ANONYMOUS_SLUGS`** export used by resolver | `apps/intradark/entities/rbac/lib/nav-anonymous-slugs.test.ts` | red |
| 4 | unit | `getRequiredSlugsForPathname('/scrims/foo')` returns slug(s) for first segment `scrims` | `apps/intradark/entities/rbac/lib/nav-route-map.test.ts` | red |
| 5 | unit | `canAccessRoute(pathname, effectiveSlugs)` matches deny/allow matrix from [`flows.md`](flows.md) | same | red |
| 6 | unit | `shouldRedirectInsteadOfNotFound('/stats')` — policy helper per rollout | `apps/intradark/entities/rbac/lib/assert-route-access.test.ts` | red |
| 7 | integration | Deferred unless harness exists — **omit in MVP** | — | n/a |
| 8 | e2e | Deferred — manual smoke in [`flows.md`](flows.md) if Playwright absent | — | n/a |

After each item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### Pure functions / validators

- **Subject:** effective slug merge + pathname requirements in `entities/rbac/lib/*`
- **Cases:**
  - **Happy path:** member slugs include anonymous ∪ `{nav.scrims, nav.tournaments, nav.dashboard}` when DB fixtures imply template expansion (mocked rows).
  - **Anonymous:** `effectiveSlugs` from constants only; `/dashboard` denied.
  - **Developer:** existing slug `developer` enables Play **interaction** in Nav behavior tests at component boundary (mock profile store).
- **Runner:** Vitest at `apps/intradark`.
- **Mocks:** Drizzle query module boundary only for resolver integration-style unit tests; pure helpers stay mock-free.

### Hooks

- **Not required for MVP** unless a dedicated `useEffectiveNav` hook is introduced — prefer server snapshot on profile store.

## 3. Integration tests (DB + RLS)

**Deferred for MVP** — admin-panel plan already scoped Drizzle+RLS integration tests as optional. When the app gains a repeatable local DB test harness, add:

| Case | Acting role | Expected |
|------|-------------|----------|
| Owner reads own `user_role_templates` | policy-dependent | per RLS choice |
| Non-owner | denied |

Document seeds under `apps/intradark/test/fixtures/navigation-rbac.ts` when integration lands.

## 4. End-to-end (happy path)

- **Tool:** Playwright only if `apps/intradark/playwright.config.ts` exists.
- **Otherwise:** manual smoke steps in [`flows.md`](flows.md) §1.

## 5. Fixtures and seed data

- **Location:** future `apps/intradark/test/fixtures/navigation-rbac.ts`
- **Determinism:** fixed UUIDs for `roles.id` in tests when mocking joins.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on `entities/rbac/lib/*` | ≥80% on new files | CI for changed paths only |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- `@workspace/ui` sidebar internals.
- Supabase Auth token plumbing — assume `getUser()` contract.

## 8. Refactor checklist (after green)

- [ ] Single pathname→slug map consumed by layouts and sidebar builders.
- [ ] Anonymous slug strings identical between **`NAV_ANONYMOUS_SLUGS`** and seeded `roles.slug` rows (assertable via shared export or codegen note).
- [ ] No `any` on role slug arrays — `readonly string[]` or branded type.
- [ ] No app-to-app imports.
- [ ] No `@workspace/ui` → Supabase edge introduced.

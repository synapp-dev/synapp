# {{Feature Title}} — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order.

## 1. Test list (red → green → refactor)

Author each test before its production code. Each item is a single behavior. Order matters: earlier items unblock later ones.

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | {{pure function returns expected shape}} | `apps/{{product}}/{{path}}.test.ts` | red |
| 2 | unit | {{validation rejects invalid input}} | `apps/{{product}}/{{path}}.test.ts` | red |
| 3 | integration | {{server action persists row + RLS allows owner read}} | `apps/{{product}}/{{path}}.int.test.ts` | red |
| 4 | integration | {{RLS denies non-owner read}} | `apps/{{product}}/{{path}}.int.test.ts` | red |
| 5 | unit (hook) | {{`use{{Feature}}` returns loading → data}} | `apps/{{product}}/entities/{{feature}}/hooks/use-{{feature}}.test.tsx` | red |
| 6 | component | {{primary component renders happy path}} | `apps/{{product}}/entities/{{feature}}/components/{{feature}}.test.tsx` | red |
| 7 | component | {{primary component renders each error state from flows.md}} | same | red |
| 8 | e2e | {{happy path end-to-end}} | `apps/{{product}}/e2e/{{slug}}.spec.ts` | red |

After each item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### Pure functions / validators

- **Subject:** `{{function}}` in `apps/{{product}}/{{path}}`
- **Cases:**
  - Happy path: {{input → output}}
  - Boundary: {{empty / max / unicode / DST}}
  - Invalid: {{rejected with which error}}
- **Runner:** {{vitest / jest, configured at the app root}}
- **No mocks** for pure functions. Mock only at module boundaries.

### Hooks

- **Subject:** `use{{Feature}}` in `apps/{{product}}/entities/{{feature}}/hooks/`
- **Setup:** wrap with the app's existing test providers (Supabase mock, query client).
- **Assertions:** initial state, loading, success, error mapped from server action.

## 3. Integration tests (DB + RLS)

Run against the app's local Supabase instance (`supabase start` in `apps/{{product}}`).

### Setup

```ts
// apps/{{product}}/test/setup-integration.ts
{{seed function that inserts deterministic fixtures}}
```

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| Owner reads own row | `authenticated` (uid = owner) | row returned |
| Non-owner reads | `authenticated` (uid != owner) | empty result (RLS) |
| Anon reads | `anon` | RLS denies |
| Owner updates allowed columns | `authenticated` (uid = owner) | success |
| Owner updates protected columns | `authenticated` (uid = owner) | RLS denies |
| Service role bypass | `service_role` | success (used only in jobs) |

> Per [ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md), migrations and RLS live with the owning app. Tests must run against that app's local DB.

## 4. End-to-end (happy path)

- **Tool:** Playwright if `apps/{{product}}/playwright.config.ts` exists; otherwise document a manual smoke script.
- **File:** `apps/{{product}}/e2e/{{slug}}.spec.ts`
- **Scenario:** mirrors the happy path in [`flows.md`](flows.md).

```ts
// Skeleton
test('{{slug}} happy path', async ({ page }) => {
  await page.goto('{{route}}');
  // 1. Arrange: signed-in test user, seeded fixtures.
  // 2. Act: drive the flow exactly as flows.md numbers it.
  // 3. Assert: visible end state + emitted telemetry event.
});
```

If Playwright is not available, list the manual steps in [`flows.md`](flows.md) §1 and reference them here.

## 5. Fixtures and seed data

- **Location:** `apps/{{product}}/test/fixtures/{{slug}}.ts`
- **Reset:** truncate + reseed before each integration test.
- **Determinism:** fixed UUIDs and timestamps so snapshots are stable.
- **Auth:** use existing helper in `@workspace/supabase` for test users; never roll your own.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on new files | {{≥80%}} | Enforce in CI for changed paths only. |
| Integration cases listed in §3 | 100% present | Manually reviewed before merge. |
| E2E happy path | green on CI | Required for the route to be merged. |
| Architecture lint | clean | `pnpm lint:architecture` from repo root. |

## 7. What NOT to test here

- Implementation details of `@workspace/ui` primitives — covered upstream.
- Supabase internals — trust the platform.
- Snapshot tests of large component trees — prefer behavioral assertions.

## 8. Refactor checklist (after green)

- [ ] No duplicated logic between server action and client.
- [ ] Validation lives in one place (Zod schema referenced by both layers).
- [ ] No `any`. Generated DB types flow through.
- [ ] No new app-to-app imports introduced.
- [ ] No new `@workspace/ui` → Supabase edge.
- [ ] Component remains under {{~250}} lines; split if larger.

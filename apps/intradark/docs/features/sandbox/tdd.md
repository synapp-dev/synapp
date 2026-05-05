# Sandbox — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order for the **parent** sandbox shell only. Each child triad ([pug-system](pug-system/tdd.md), [onboarding](onboarding/tdd.md)) owns its own test list.

## 1. Test list (red → green → refactor)

Author each test before its production code. Order matters: earlier items unblock later ones.

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `useSandboxUrlState` round-trips `?scenario` and `?step` through the URL | `apps/intradark/lib/sandbox/use-sandbox-url-state.test.ts` | red |
| 2 | unit | `useSandboxUrlState` snaps an unknown scenario id to the config's default | same | red |
| 3 | unit | `useSandboxUrlState` snaps an out-of-range step index to `0` | same | red |
| 4 | component | `SandboxShell` renders dock + step-jumper for a fake `SandboxConfig` | `apps/intradark/entities/sandbox/shell/sandbox-shell.test.tsx` | red |
| 5 | component | Dock scenario change updates context and URL | same | red |
| 6 | component | Step-jumper next/prev clamps at lower (0) and upper (`steps.length - 1`) bounds | same | red |
| 7 | component | `/admin/sandbox` layout calls `notFound()` when session lacks `sandbox.access` | `apps/intradark/app/(main)/admin/sandbox/layout.test.tsx` | red |
| 8 | component | Sidebar hides Sandbox when user lacks `sandbox.access` | `apps/intradark/components/organisms/app-sidebar.test.tsx` | red |

After each item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### Pure functions / validators

- **Subject:** `useSandboxUrlState` in `apps/intradark/lib/sandbox/use-sandbox-url-state.ts`
- **Cases:**
  - Happy path: known scenario id + valid step index → context state matches URL.
  - Boundary: empty URL → defaults applied.
  - Invalid: unknown scenario id → falls back to `config.defaultScenarioId`; invalid step index → snaps to `0`.
- **Runner:** Vitest (matches existing `apps/intradark/package.json` test script if present; otherwise add).
- **No mocks** for pure logic. Mock `next/navigation` `useRouter` / `useSearchParams` only at the hook boundary.

### Hooks

Covered by §1 #1–#3.

## 3. Integration tests (DB + RLS)

N/A. The sandbox owns no DB.

## 4. End-to-end (happy path)

If `apps/intradark/playwright.config.ts` exists, add a smoke spec at `apps/intradark/e2e/sandbox.spec.ts` covering the parent index. Otherwise document the manual smoke script below — the same script is the source of truth.

### Manual smoke script

1. `pnpm dev` from `apps/intradark`; ensure test user has **`sandbox.access`** in `user_roles` (see [admin-panel](../admin-panel/plan.md)).
2. Visit **`/admin/sandbox`** — expect index page listing both children with descriptions.
3. Click "PUG system" — expect `SandboxShell` renders with dock + step-jumper visible.
4. Remove `sandbox.access` for the user (or use a session without it) — **`/admin/sandbox`** returns **404**; sidebar Sandbox entry hidden.

## 5. Fixtures and seed data

- **Location:** `apps/intradark/entities/sandbox/shell/__fixtures__/test-config.ts`
- **Content:** minimal `SandboxConfig` with two scenarios (`a`, `b`) and three steps so the shell tests do not depend on either child sandbox's content.
- **Determinism:** fixed scenario ids and step labels; no timestamps.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on `entities/sandbox/shell/*` and `lib/sandbox/*` | ≥80% | Enforce in CI for changed paths only. |
| Manual smoke (above) | green | Required before merging the parent feature. |
| Architecture lint | clean | `pnpm lint:architecture` from repo root. |

## 7. What NOT to test here

- Child sandboxes (covered in their own triads).
- `@workspace/ui` primitives — covered upstream.
- The `next/navigation` hooks themselves — trust the framework.

## 8. Refactor checklist (after green)

- [ ] No `any` in shell types (`ScenarioDef`, `StepDef`, `SandboxConfig`).
- [ ] `SandboxShell` stays under ~200 lines; split dock if larger.
- [ ] No new app-to-app imports introduced.
- [ ] No new `@workspace/ui` → `@workspace/supabase` edge.
- [ ] `useSandboxUrlState` returns a stable callback (no setState-on-every-render bugs).

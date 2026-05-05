# PUG system sandbox — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Tests cover step rendering and scenario wiring; the parent [`sandbox/tdd.md`](../tdd.md) covers the shell/dock/URL state.

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `scenarios.ts`: each preset returns expected initial step + per-step state seed | `apps/intradark/entities/sandbox/pug-system/scenarios.test.ts` | red |
| 2 | component | `PugSystemSandbox` renders dock with the 3 scenarios | `apps/intradark/entities/sandbox/pug-system/pug-system-sandbox.test.tsx` | red |
| 3 | component | Step-jumper covers all 7 steps (each step's root testid renders in turn) | same | red |
| 4 | component | `play-hub-step` renders the `faceit-play-mock` party slot grid | `apps/intradark/entities/sandbox/pug-system/steps/play-hub-step.test.tsx` | red |
| 5 | component | `accept-phase-step` (`scenario=all-accept`) renders all 10 accepted | `apps/intradark/entities/sandbox/pug-system/steps/accept-phase-step.test.tsx` | red |
| 6 | component | `accept-phase-step` (`scenario=one-declines`) renders 1 declined + dodge banner | same | red |
| 7 | component | `lobby-step` renders 3-column grid with `MOCK_TEAM_NORTH` / `MOCK_TEAM_SOUTH` | `apps/intradark/entities/sandbox/pug-system/steps/lobby-step.test.tsx` | red |
| 8 | component | `server-step` (`scenario=server-fails`) renders retry/cancel UX + error code | `apps/intradark/entities/sandbox/pug-system/steps/server-step.test.tsx` | red |
| 9 | component | `result-step` renders mock score + "Queue again" CTA | `apps/intradark/entities/sandbox/pug-system/steps/result-step.test.tsx` | red |

After each item turns green, refactor only the touched code before moving on.

## 2. Unit tests

### Pure functions

- **Subject:** `scenarios.ts` (`getScenario(id)`, `applyScenarioToStep(step, scenario)` or equivalent helpers)
- **Cases:**
  - Happy: every preset returns a valid initial step + state seed.
  - Boundary: unknown scenario id throws or returns `null` (decided at implementation; pick one, test it).
- **Runner:** Vitest.
- **No mocks** for pure logic.

### Hooks

The pug-system sandbox uses the parent `useSandboxUrlState` hook; that hook is tested in the parent triad.

## 3. Integration tests (DB + RLS)

N/A. No DB.

## 4. End-to-end (happy path)

Manual smoke script (run before merging the feature):

1. Visit **`/admin/sandbox/pug-system`** — expect dock visible, default scenario `all-accept`, step `play-hub`.
2. Click Next 6 times — URL `?step` increments; UI advances through searching → match-found → accept → lobby → server → result.
3. Open the dock, switch scenario to `one-declines` — URL `?scenario=one-declines`, view resets to step `0`. Step to `accept` — expect 1 red declined + dodge banner.
4. Switch scenario to `server-fails`, step to `server` — expect 7/10 connected, retry + cancel CTAs.
5. Reload at any step — UI restored from URL.
6. Verify Network tab: zero requests to `/api/discord/bot/*`, `/api/cs2/events`, `/api/auth/*`.

If `apps/intradark/playwright.config.ts` exists, automate the above as `apps/intradark/e2e/sandbox-pug-system.spec.ts`.

## 5. Fixtures and seed data

- **Location:** [`apps/intradark/entities/sandbox/pug-system/fixtures.ts`](../../../entities/sandbox/pug-system/fixtures.ts) — re-exports `MOCK_TEAM_NORTH` / `MOCK_TEAM_SOUTH` from [`lib/match-lobby-mock-data.ts`](../../../lib/match-lobby-mock-data.ts) and adds party / queue mock data.
- **Determinism:** all roster ids fixed; no `Math.random` in fixtures.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch on `entities/sandbox/pug-system/*` | ≥80% | Changed paths only. |
| Manual smoke (above) | green | Required before merging. |
| Architecture lint | clean | `pnpm lint:architecture`. |

## 7. What NOT to test here

- The parent shell (covered in [`../tdd.md`](../tdd.md)).
- The display organisms reused from `components/organisms/match-lobby/*` (their behavior pre-dates this feature).
- `MatchLobbyMockProvider` / `MatchVetoMockProvider` internals.

## 8. Refactor checklist (after green)

- [ ] No duplication of `MatchLobbyMockProvider` state shape; import the context type from [`match-lobby-mock-context.tsx`](../../../components/organisms/match-lobby/match-lobby-mock-context.tsx).
- [ ] No new app-to-app imports.
- [ ] `lobby-step.tsx` stays under ~250 lines; split sub-phase chrome if larger.
- [ ] Scenario presets typed; no `string` literal drift between dock and steps.
- [ ] No `useEffect` that fires real network in any step.

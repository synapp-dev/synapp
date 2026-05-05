# Onboarding sandbox — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Tests cover step rendering, scenario wiring, and the 6 eligibility states. The parent [`sandbox/tdd.md`](../tdd.md) covers shell/dock/URL state.

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `fixtures.ts` `profilesForEligibility`: each `EligibilityState` returns expected `CurrentUserProfiles \| null` | `apps/intradark/entities/sandbox/onboarding/fixtures.test.ts` | red |
| 2 | unit | `fixtures.ts` `eligibilityFlags`: banned + cooldown flags match state | same | red |
| 3 | component | `SteamEmailDialog` with `sandbox`: submit does not call fetch / Supabase | `apps/intradark/components/molecules/steam-email-dialog.test.tsx` | red |
| 4 | component | `landing-step` renders sign-in CTA | `apps/intradark/entities/sandbox/onboarding/steps/landing-step.test.tsx` | red |
| 5 | component | `username-email-step` mounts `SteamEmailDialog` with `sandbox` (no real network) | `apps/intradark/entities/sandbox/onboarding/steps/username-email-step.test.tsx` | red |
| 6 | component | `dashboard-step` (`state=steam-only`) renders dialog auto-open | `apps/intradark/entities/sandbox/onboarding/steps/dashboard-step.test.tsx` | red |
| 7 | component | `dashboard-step` (`state=both-linked-not-banned`) renders no dialog + "Ready to queue" badge | same | red |
| 8 | component | `dashboard-step` (`state=banned`) renders red "Account banned" banner | same | red |
| 9 | component | `dashboard-step` (`state=cooldown-active`) renders yellow banner with mm:ss countdown | same | red |
| 10 | component | `discord-link-step` (`scenario=discord-declines-then-relinks`) renders decline + retry path | `apps/intradark/entities/sandbox/onboarding/steps/discord-link-step.test.tsx` | red |
| 11 | component | `OnboardingSandbox` (`scenario=steam-already-linked-conflict`) renders conflict screen between `steam-signin` and `username-email` | `apps/intradark/entities/sandbox/onboarding/onboarding-sandbox.test.tsx` | red |
| 12 | unit (types) | `FakeProfile` type assignable to `getCurrentUserProfiles` return type | compile-time check via shared type import | red |

After each item turns green, refactor only the touched code before moving on.

## 2. Unit tests

### Pure functions

- **Subject:** `fixtures.ts` (`profilesForEligibility`, `eligibilityFlags`).
- **Cases:**
  - Happy: every state / scenario id maps to a fixture.
  - Boundary: unknown id throws or returns `null` (decided at implementation; pick one and test it).
- **Runner:** Vitest.

### Type checks

- **Subject:** Return values of `profilesForEligibility` must be assignable to `Awaited<ReturnType<typeof getCurrentUserProfiles>> | null`.
- **Mechanism:** import the type from [`lib/get-current-user-profiles.ts`](../../../lib/get-current-user-profiles.ts) (type-only import is allowed under §3.2 since types are not runtime Supabase code) and write a `satisfies` clause in `fixtures.ts`. Compile-time enforcement via `pnpm typecheck`.

## 3. Integration tests (DB + RLS)

N/A. No DB.

## 4. End-to-end (happy path)

Manual smoke script:

1. Visit **`/admin/sandbox/onboarding`** — expect dock visible, default scenario `happy-onboarding`, step `landing`.
2. Click Next 5 times — UI advances through `steam-signin` → `username-email` → `dashboard` → `discord-link` → `eligible`.
3. At `dashboard` step, switch dock state through all 6 eligibility values — dashboard re-renders correctly each time.
4. Switch scenario to `discord-declines-then-relinks` and step to `discord-link` — expect decline + retry sub-flow.
5. Switch scenario to `steam-already-linked-conflict` and step from `steam-signin` to `username-email` — expect conflict screen interposed.
6. Reload at any step — UI restored from URL.
7. Verify Network tab: zero requests to `/api/auth/steam/*`, `/api/auth/discord/*`, `/api/me`.

If `apps/intradark/playwright.config.ts` exists, automate as `apps/intradark/e2e/sandbox-onboarding.spec.ts`.

## 5. Fixtures and seed data

- **Location:** [`apps/intradark/entities/sandbox/onboarding/fixtures.ts`](../../../entities/sandbox/onboarding/fixtures.ts).
- **Content:** one `FakeProfile` per eligibility state (6 fixtures), plus party / Steam-id constants reused across scenarios.
- **Determinism:** fixed UUIDs, fixed timestamps, fixed cooldown duration (e.g. 4m 30s).

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch on `entities/sandbox/onboarding/*` | ≥80% | Changed paths only. |
| Compile (typecheck) | clean | `FakeProfile` satisfies real return type. |
| Manual smoke (above) | green | Required before merge. |
| Architecture lint | clean | `pnpm lint:architecture`. |

## 7. What NOT to test here

- The parent shell ([`../tdd.md`](../tdd.md)).
- `DiscordLinkDialog` internals — already covered by its existing usage on the dashboard.
- Real OAuth flows — out of scope.

## 8. Refactor checklist (after green)

- [ ] `SteamEmailDialog` default (non-sandbox) behavior unchanged (covered by tdd #3 when tests exist).
- [ ] `FakeProfile` shape matches `getCurrentUserProfiles` return type exactly.
- [ ] No `any` in eligibility-state types.
- [ ] No new app-to-app imports.
- [ ] `dashboard-step.tsx` stays under ~250 lines; split eligibility-state banners into a sub-component if larger.
- [ ] No `useEffect` that fires real network in any step.

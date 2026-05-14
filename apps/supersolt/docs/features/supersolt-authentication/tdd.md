# Supersolt authentication — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order.

## 1. Test list (red → green → refactor)

Author each test before its production code where practical. Each item is a single behavior. Order matters: earlier items unblock later ones.

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `safeRelativeNextPath` rejects open redirects (`//`, `https:`, backslash, whitespace) and accepts safe relative paths | `apps/supersolt/server/square/safe-next-path.test.ts` | red |
| 2 | unit | `safeRelativeNextPath` returns `null` for empty / null `next` | same | red |
| 3 | unit | (Optional) Extracted pure helper for “post-auth default path” from `needsSetup` — if extracted from middleware for testability | `apps/supersolt/lib/auth/post-auth-path.test.ts` or colocated | red |
| 4 | integration | `GET /auth/callback` with missing `code` redirects to `/auth` with `error=auth_callback_missing_code` | `apps/supersolt/app/(auth)/auth/callback/route.test.ts` | red |
| 5 | integration | `GET /auth/callback` with invalid `code` redirects with `auth_callback_exchange_failed` (mock `exchangeCodeForSession` failure) | same | red |
| 6 | component | `AuthForm` maps known `searchParams.error` keys to curated alert copy (smoke-level: render + query) | `apps/supersolt/components/organisms/auth-form.test.tsx` | red |
| 7 | component | Forgot-password control calls `resetPasswordForEmail` with expected `redirectTo` (mock Supabase client) | same or split test file | red |
| 8 | e2e | **Manual only** — see [`flows.md`](flows.md) §6; Playwright not in `apps/supersolt` yet | `flows.md` §6 | n/a |

After each item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### Pure functions / validators

- **Subject:** `safeRelativeNextPath` in `apps/supersolt/server/square/safe-next-path.ts`
- **Cases:**
  - Happy path: `/dashboard`, `/setup`, `/{org}/{venue}/insights/sales` → returned unchanged when safe
  - Rejected: `//evil.com`, `https://x`, `\`, whitespace, empty
- **Runner:** Vitest (`pnpm test` in `apps/supersolt`)
- **No mocks** for pure functions.

### Hooks

- **n/a** for MVP — no new data-fetch hook; `AuthForm` uses local state + Supabase client.

## 3. Integration tests (DB + RLS)

**Default:** No new DB-heavy integration tests for this triad — **`user_profiles`** RLS is pre-existing; auth flows are dominated by **Supabase Auth** and **Route Handler** behaviour.

Optional later: local Supabase + service-role seed for `/api/me` after sign-in (separate from this triad’s minimum bar).

### Cases (reference only if expanded)

| Case | Acting role | Expected |
|------|-------------|----------|
| Owner reads own `user_profiles` row | authenticated (`uid = id`) | row returned |
| Anon reads | anon | RLS denies |

> Per [ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md), migrations and RLS live with **`apps/supersolt`**.

## 4. End-to-end (happy path)

- **Tool:** **Manual smoke** — `apps/supersolt` does not ship Playwright in `package.json` today.
- **File:** Document steps in [`flows.md`](flows.md) §6.
- **Scenario:** mirrors sign-in, confirmation (if enabled), forgot password, recovery, set password, and final redirect.

```ts
// Future skeleton when Playwright exists:
// test('supersolt-authentication happy path', async ({ page }) => {
//   await page.goto('/auth');
//   …
// });
```

## 5. Fixtures and seed data

- **Default:** None required for unit + handler tests (mocks).
- **Determinism:** fixed URLs and query params in callback tests.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit branch coverage on **new** auth helper files | ≥80% where helpers are introduced | Enforce for changed paths in review |
| Callback route tests | §1 items 4–5 present before merge | Mock Supabase exchange |
| E2E automated | n/a | Manual smoke required before release |
| Architecture lint | clean | `pnpm lint:architecture` from repo root ([ARCHITECTURE.md §4.2](../../../../../ARCHITECTURE.md)) |

## 7. What NOT to test here

- `@workspace/ui` primitive internals.
- Supabase server-side token issuance internals.
- Full middleware in Node without Next request harness — prefer **pure extracted helpers** for redirect/`next` logic if middleware stays complex.

## 8. Refactor checklist (after green)

- [ ] No duplicated `next`-sanitisation outside `safeRelativeNextPath`.
- [ ] No service-role or admin client imported from `auth-form` or update-password client bundles.
- [ ] No new app-to-app imports ([ARCHITECTURE.md §3.1](../../../../../ARCHITECTURE.md)).
- [ ] No `@workspace/ui` → Supabase dependency introduced ([ARCHITECTURE.md §3.2](../../../../../ARCHITECTURE.md)).
- [ ] `AuthForm` split if it grows beyond a reasonable size; keep recovery UI cohesive.

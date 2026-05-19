# Add existing user to school — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order.

## 1. Test list (red → green → refactor)

> **Note:** `apps/bullyproof` has no test files today. Introduce Vitest at the app root (or reuse monorepo pattern if added elsewhere) as part of item #1. Until then, §4 manual smoke satisfies MVP gate.

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `normalizeLookupEmail` trims and lowercases | `server/user/resolve-auth-user-by-email.test.ts` | red |
| 2 | unit | `resolveAuthUserByEmail` returns profile id when `user_profile` has row | same | red |
| 3 | integration | `resolveAuthUserByEmail` finds user beyond first `listUsers` page (mock paginated admin) | same | red |
| 4 | integration | `resolveAuthUserByEmail` maps `createUser` `email_exists` to existing user id | same | red |
| 5 | integration | `GET /api/users/lookup` — platform admin, unknown email → `{ exists: false }` | `app/api/users/lookup/route.test.ts` | red |
| 6 | integration | `GET /api/users/lookup` — platform admin, known email → names prefilled | same | red |
| 7 | integration | `GET /api/users/lookup` — school admin + `schoolId` → includes `schoolRoleKeys` | same | red |
| 8 | integration | `GET /api/users/lookup` — school admin wrong school → 403 | same | red |
| 9 | integration | `GET /api/users/lookup` — unauthenticated → 401 | same | red |
| 10 | integration | `POST /api/users/new` — existing auth user not on first list page → 201 + role assigned | `app/api/users/new/route.test.ts` | red |
| 11 | integration | `POST /api/users/new` — user already has role at school → 201 idempotent | same | red |
| 12 | manual | `AddManualUserDialog` email-first steps per [`flows.md`](flows.md) §1 | QA checklist below | red |

No Playwright E2E in MVP.

After each item turns green, refactor only the code touched by that item before moving to the next.

## 2. Unit tests

### `resolveAuthUserByEmail`

- **Subject:** `server/user/resolve-auth-user-by-email.ts`
- **Cases:**
  - Happy: email in `user_profile` → `{ userId }` without calling `createUser`
  - Pagination: user only on page 2+ of `listUsers` → found
  - `email_exists`: `createUser` throws → fallback returns same `userId` as lookup
  - Not found: no profile, no auth user → `null` (caller creates)
- **Runner:** Vitest
- **Mocks:** Supabase admin client at module boundary only

### `userLookupSchema` (Zod)

- Valid email + optional uuid `schoolId`
- Rejects missing email, invalid email format

## 3. Integration tests (route handlers)

Run against local Supabase + seeded fixtures when available; otherwise mock `createServerAdminClient` and Drizzle with test doubles (minimum: handler unit tests with mocked deps).

### Setup

```ts
// apps/bullyproof/test/fixtures/school-add-user-existing.ts
export const FIXTURE = {
  platformAdminId: "00000000-0000-4000-8000-000000000001",
  schoolAdminId: "00000000-0000-4000-8000-000000000002",
  schoolId: "00000000-0000-4000-8000-000000000010",
  existingUserEmail: "existing@example.com",
  existingUserId: "00000000-0000-4000-8000-000000000020",
  newUserEmail: "new@example.com",
};
```

### Cases

| Case | Acting role | Expected |
|------|-------------|----------|
| Lookup unknown email | platform admin | `{ exists: false }` |
| Lookup known email | platform admin | `{ exists: true, firstName, lastName }` |
| Lookup with school roles | school admin at school | `schoolRoleKeys` matches `user_roles` |
| Lookup without permission | school admin other school | 403 |
| Create assigns role for existing auth user | platform admin | 201, `userId`, role row exists |
| Create idempotent role | platform admin | 201, no duplicate `user_roles` row |

> Per [ARCHITECTURE.md §8.1](../../../../../ARCHITECTURE.md), no cross-product DB.

## 4. End-to-end (happy path)

Playwright is **not** in scope for MVP. Manual smoke (required before merge):

1. Sign in as platform admin → Schools → Brandon (or any) → Users → Add User.
2. Enter email of user **not** on school → step 2 blank names → fill names + roles → submit → user appears in table.
3. Enter email of user **already in auth** but not on school (reproduces prior `email_exists` bug) → step 2 prefilled names disabled → submit → user added with roles.
4. Enter email of user **already on school** → step 2 prefilled names + current roles → submit → success toast, no error.
5. Change email on step 1 after lookup → step 2 cleared.
6. Repeat (3) as school admin on school Settings → Users.

Document results in PR test plan.

## 5. Fixtures and seed data

- **Location:** `apps/bullyproof/test/fixtures/school-add-user-existing.ts`
- **Reset:** per integration test file `beforeEach`
- **Determinism:** fixed UUIDs
- **Auth:** use service role / test session helpers when local Supabase test harness exists; otherwise mock `getUserIdFromRequest`

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit + integration items #1–11 | 100% present | Required before merge |
| Manual smoke §4 | Pass | Required before merge |
| E2E | n/a | Deferred |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- `@workspace/ui` primitives
- Supabase GoTrue internals beyond mocked admin client
- Full CSV import UI (server idempotency covered by #10–11 pattern on bulk route if tested)

## 8. Refactor checklist (after green)

- [ ] Single `resolveAuthUserByEmail` used by all `POST /api/users/new*` handlers
- [ ] Lookup Zod schema shared between route and tests
- [ ] No `any` on auth error handling (`email_exists` typed guard)
- [ ] No app-to-app imports
- [ ] `useUserEmailLookup` does not import `@workspace/supabase`
- [ ] Dialogs ≤ ~300 lines or split step components if needed

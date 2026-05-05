# Admin panel + RBAC — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md).

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `hasRoleSlug(slugs, required)` returns true iff `required` is in `slugs` | `apps/intradark/entities/admin/lib/role-slugs.test.ts` | red |
| 2 | unit | `hasRoleSlug` empty slugs / empty required edge cases | same | red |
| 3 | unit | `canonicalAdminSandboxPath` (or helper) maps legacy `/sandbox/...` → `/admin/sandbox/...` | `apps/intradark/entities/admin/lib/admin-sandbox-paths.test.ts` | red |
| 4 | unit | stable **log codes** exported as constants (e.g. `RBAC_ROLE_QUERY_FAILED`) for gate catch paths | `apps/intradark/entities/admin/lib/rbac-log-codes.test.ts` | red |
| 5 | integration | Drizzle + RLS: user with `user_roles` row reads allowed; without — empty | deferred — add when `apps/intradark` has DB test harness | n/a |
| 6 | e2e | Signed-in user with `sandbox.access` opens `/admin/sandbox` | deferred until Playwright is standard for intradark | n/a |

After each green item, refactor only touched code before the next.

## 2. Unit tests

### Pure helpers

- **Subject:** role slug set membership, path canonicalization.
- **Runner:** **Vitest** — `pnpm --filter intradark test` (see [`vitest.config.mts`](../../../vitest.config.mts)).
- **No mocks** for pure functions.

### Gate helper (server)

- **Subject:** async helper that loads slugs for `auth.users.id` — mock **Drizzle** or DB only if testing in isolation; prefer thin DB-less wrapper tests for query **shape** and **notFound** invocation in a follow-up refactor once patterns exist.

## 3. Integration tests (DB + RLS)

Deferred per [`plan.md`](plan.md) §2. When enabled, use local Supabase + seed `roles` / `user_roles` fixtures; never hit production from CI.

## 4. End-to-end

Manual smoke in [`flows.md`](flows.md) §1 until `apps/intradark/e2e/` exists.

## 5. Fixtures

- **Location (future):** `apps/intradark/test/fixtures/rbac.ts` — fixed UUIDs for `roles.id` / `user_roles` rows.

## 6. Coverage gates

| Gate | Threshold |
|------|-----------|
| New unit files under `entities/admin/lib/` | ≥80% statements on changed paths (aspirational until CI wired) |
| `pnpm lint:architecture` | clean from repo root |

## 7. What NOT to test

- `@workspace/ui` primitives.
- Supabase platform internals.

## 8. Refactor checklist

- [ ] Single gate used by `admin` and `admin/sandbox` layouts.
- [ ] No `any`; types from Drizzle / generated DB types.
- [ ] No `@workspace/ui` → Supabase imports.
- [ ] No app-to-app imports.

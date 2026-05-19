# Roles refresh after school removal — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). Drives the test-first implementation order.

## 1. Test list (red → green → refactor)

| # | Layer | Behavior under test | File | Status |
|---|-------|---------------------|------|--------|
| 1 | unit | `parseUserWithRoles` maps array `schoolRoles` + `platformRoles` | `entities/users/lib/parse-user-with-roles.test.ts` | red |
| 2 | unit | `parseUserWithRoles` parses JSON string roles from view | same | red |
| 3 | unit | `parseUserWithRoles` handles empty / missing roles | same | red |
| 4 | unit | `removeSchoolRolesFromUser` drops only matching `schoolId` | `entities/users/lib/remove-school-from-user.test.ts` | red |
| 5 | manual | Remove via footer → Roles tab has no school block | [`flows.md`](flows.md) §1 | red |
| 6 | manual | Remove via uncheck Staff + Save → same outcome | [`flows.md`](flows.md) §1 alt | red |
| 7 | manual | Admin → Users regression after edit roles | [`flows.md`](flows.md) §3.10 | red |

Integration DB tests: **n/a** (existing `user-roles` API unchanged).

Component / Playwright E2E: **deferred**.

After each unit item turns green, refactor only touched code before the next.

## 2. Unit tests

### `parseUserWithRoles`

- **Subject:** `entities/users/lib/parse-user-with-roles.ts`
- **Cases:**
  - Happy: raw profile with array `schoolRoles` → `UserWithRolesAndSchools` shape matches `admin/users/page.tsx` / `settings-users-card` behavior.
  - `platformRoles` as JSON string → string[].
  - `schoolRoles` as JSON string → parsed array with `schoolId`, `schoolName`, `roleKey`, `roleName`.
  - Missing / null roles → empty arrays; required id/email preserved.
- **Runner:** Vitest (`apps/bullyproof` `pnpm test`)
- **No mocks** for pure parse logic.

### `removeSchoolRolesFromUser` (optimistic helper)

- **Subject:** `entities/users/lib/remove-school-from-user.ts`
- **Cases:**
  - User with roles at schools A and B; remove A → only B remains.
  - User with multiple roles at same school → all rows for that `schoolId` removed.
  - Unknown `schoolId` → unchanged copy (or same reference policy documented in impl).
- **No mocks.**

### Hooks (optional)

- **Subject:** `useRefreshUserDetail` if extracted
- **Setup:** mock `meApi.get.userById` with vitest
- **Assertions:** returns parsed user; surfaces error for toast path
- **Priority:** defer unless refresh logic is non-trivial

## 3. Integration tests (DB + RLS)

**n/a** — no schema or RLS changes. Manual verification against local API:

- Remove all roles at a school for a test user → `GET /users/:id` returns empty `schoolRoles` for that school.

## 4. End-to-end (happy path)

Playwright not configured. Manual smoke in [`flows.md`](flows.md) §1 and §5.

## 5. Fixtures and seed data

- Use existing dev user with multiple school roles (e.g. Annette Wellington / Brandon State School from bug report).
- No new fixture files required.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit tests §1–4 | green | Required before merge |
| Manual flows §5–7 | checked in PR description | Required |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |
| Integration | n/a | |

## 7. What NOT to test here

- `@workspace/ui` AlertDialog layout beyond snapshot-free className presence.
- Supabase Auth internals.
- Full `UserDetailDrawer` component tree.

## 8. Refactor checklist (after green)

- [ ] Single `parseUserWithRoles`; no duplicate in `settings-users-card.tsx`.
- [ ] All `onUserUpdate` callbacks that drive `UserDetailDrawer` refresh `selectedUser` by id.
- [ ] Edit-mode removal paths share one code path (`applyEditSchoolRolesChanges` staff branch).
- [ ] No new app-to-app imports.
- [ ] No `@workspace/ui` → Supabase edge.

# Team pages — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). MVP emphasizes **Vitest** on **pure helpers and validation**; DB integration and Playwright are **deferred** (same posture as [forums](../forums/tdd.md)).

## 1. Test list (red → green → refactor)

Author each **unit** test before or alongside its production helper. Order matters.

| # | Layer | Behavior under test | File (proposed) | Status |
|---|-------|---------------------|-----------------|--------|
| 1 | unit | **`TEAM_RESERVED_SLUGS`** — `new`, `home`, `upcoming`, `admin` rejected by validator | `apps/intradark/entities/teams/lib/reserved-slugs.test.ts` | red |
| 2 | unit | **`validateTeamSlug`** — happy slug, empty, invalid chars, too long | `apps/intradark/entities/teams/lib/schemas.test.ts` | red |
| 3 | unit | **`createTeamSchema`** — requires `name`; optional nickname/description/avatar; max lengths | same | red |
| 4 | unit | **`updateTeamSchema`** — partial updates; slug change validated | same | red |
| 5 | unit | **`isTeamLeader`** — true when `leader_steamid64` matches; false otherwise | `apps/intradark/entities/teams/lib/leader.test.ts` | red |
| 6 | unit | **`resolveTeamSlug` redirect helper** — when stored slug differs from URL segment, returns canonical path | `apps/intradark/entities/teams/lib/resolve-team-slug.test.ts` | red |
| 7 | unit | **`mapTeamActionError`** — domain codes → stable `TeamActionErrorCode` + user-safe message | `apps/intradark/entities/teams/lib/action-errors.test.ts` | red |
| 8 | unit | **`allocateUniqueUrlSlug` integration** with mocked `isTeamSlugTaken` — collision `-2` suffix | `apps/intradark/entities/teams/lib/allocate-team-slug.test.ts` | red |
| 9 | integration | Create transaction inserts team + leader membership | `apps/intradark/entities/teams/teams.int.test.ts` | deferred |
| 10 | e2e | Playwright smoke: create → home → admin save | `apps/intradark/e2e/team-pages.spec.ts` | deferred |

After each **unit** item turns green, refactor before moving on.

## 2. Unit tests

### Pure functions / validators

- **Subjects:** reserved slugs, Zod schemas, leader helper, slug redirect helper, action error mapping, slug allocation wrapper.
- **Cases:**
  - Happy path: valid create payload; leader match; canonical slug unchanged.
  - Boundary: max name length; slug at `MAX_URL_SLUG_LEN`; unicode in name → slugify strips safely.
  - Invalid: reserved slug `admin`; empty name; invalid avatar URL if URL schema enabled.
- **Runner:** **Vitest** — `pnpm --filter intradark test`.
- **No mocks** for pure functions. Mock only `isTeamSlugTaken` for allocation test (#8).

### Server actions

- Prefer testing **extracted guards** and **Zod parse** outcomes; full Drizzle integration deferred (#9).
- If action tests are added with mocked `db`, assert **`TeamActionResult` shape** only — keep thin.

## 3. Integration tests (DB + RLS)

**Deferred** until `apps/intradark` documents a repeatable local DB harness.

When added:

| Case | Acting role | Expected |
|------|-------------|----------|
| Anon `SELECT` team | `anon` | row returned (public read) |
| Anon `INSERT` team | `anon` | denied (no write policy) |
| Service role create | `service_role` / Drizzle `db` | team + `player_teams` leader row |
| Leader update via action | authenticated + mocked session | success through app gate |

> RLS write policies are **not** added in MVP; integration focuses on **public read** + **service-role write path** used by actions.

## 4. End-to-end (happy path)

**Deferred.** Manual smoke in [`flows.md`](flows.md) §1.4 until Playwright harness exists.

## 5. Fixtures and seed data

- **Location:** `apps/intradark/test/fixtures/teams.ts` (when integration lands).
- **Deterministic UUIDs** for `teams.id`, fixed `slug`, known `leader_steamid64` linked to test user fixture.
- **Reset:** truncate `player_teams`, `teams` in test DB between runs.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit tests #1–8 | 100% present before merge | Required for MVP |
| Integration #9 | deferred | Track in follow-up |
| E2E #10 | manual smoke | [`flows.md`](flows.md) §1.4 |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- `@workspace/ui` primitives.
- Supabase platform internals.
- Full RSC page snapshots — prefer helper/action unit tests.

## 8. Refactor checklist (after green)

- [ ] Validation in one Zod module referenced by actions + forms.
- [ ] Slug logic reuses `entities/content/lib/slug.ts` — no duplicate slugify.
- [ ] No `@workspace/ui` → Supabase imports.
- [ ] No app-to-app imports.
- [ ] Generated DB types flow through `entities/teams/types.ts`.

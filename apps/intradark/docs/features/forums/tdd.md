# Forums — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). MVP emphasizes **Vitest** on **pure helpers and validation**; DB + RLS integration and Playwright match the **deferred** posture documented for [utility-lineups](../utility-lineups/tdd.md) until a harness exists.

## 1. Test list (red → green → refactor)

Author each **unit** test before or alongside its production helper. Order matters.

| # | Layer | Behavior under test | File (proposed) | Status |
|---|-------|---------------------|-----------------|--------|
| 1 | unit | **`buildReplyTree`** — flat replies sorted by `created_at`, nested under `parent_reply_id`, stable sibling order | `apps/intradark/entities/forums/lib/build-reply-tree.test.ts` | red |
| 2 | unit | **`buildReplyTree`** — orphan guard: row whose `parent_reply_id` points to missing parent is treated as **top-level** or surfaces explicit error per implementation contract | same | red |
| 3 | unit | **`assertReplyDepth`** (or inline in action) — rejects create when depth **>** `FORUM_MAX_REPLY_DEPTH` | `apps/intradark/entities/forums/lib/reply-depth.test.ts` | red |
| 4 | unit | **Thread create schema** — requires title length bounds, category slug exists, tag slugs max count | `apps/intradark/entities/forums/lib/schemas.test.ts` | red |
| 5 | unit | **Reply create schema** — body bounds; `parent_reply_id` optional UUID | same | red |
| 6 | unit | **`slugifyThreadTitle` / thread slug uniqueness helper** — collision suffix or error mapping | `apps/intradark/entities/forums/lib/thread-slug.test.ts` | red |
| 7 | unit | **Action result mapping** — domain failures map to stable **`ForumActionErrorCode`** (strings) with user-safe `message` | `apps/intradark/entities/forums/lib/action-errors.test.ts` | red |
| 8 | integration | **RLS:** anon can `SELECT` non-deleted threads/replies; cannot `INSERT` | `apps/intradark/entities/forums/forums.int.test.ts` | deferred |
| 9 | integration | **RLS:** user A cannot `UPDATE` user B’s thread | same | deferred |
| 10 | e2e | Playwright not required at MVP — **manual smoke** in [`flows.md`](flows.md) §1 | `apps/intradark/e2e/forums.spec.ts` | deferred |

After each **unit** item turns green, refactor before moving on.

## 2. Unit tests

### Pure functions / validators

- **Subject:** `buildReplyTree`, reply depth guard, Zod schemas, slug helpers, error code enum.
- **Cases:**
  - Happy path: shallow thread (only top-level replies); deep thread (hits cap − 1 ok, cap rejected).
  - Boundary: empty reply list → empty tree; single root reply.
  - Invalid: oversize body/title; unknown category slug in schema fixture; duplicate slug handling returns expected **code**.
- **Runner:** **Vitest** — `pnpm --filter intradark test` (see `apps/intradark/package.json`).
- **No mocks** for pure functions.

### Server actions

- Prefer testing **extracted pure guards** and **Zod parse** outcomes; full Drizzle integration lands in §3 when harness exists.
- If testing actions directly with mocked `db`, keep mocks minimal and assert **result shape** + side effect calls (`revalidatePath` optional assert).

## 3. Integration tests (DB + RLS)

**Deferred** until `apps/intradark` documents a repeatable pattern (local Postgres / `supabase start`, migrate, seed auth). When added:

### Setup

- Apply **`apps/intradark/drizzle/*.sql`** in order to disposable `DATABASE_URL`.
- Seed: **seeded categories** from migration + one **user** fixture + threads/replies for two users.

### Cases (sketch)

| Case | Acting role | Expected |
|------|-------------|----------|
| Anon reads published thread | anon | thread + replies visible |
| Anon cannot insert thread | anon | RLS deny |
| Owner updates own reply | authenticated A | success |
| Stranger updates B’s reply | authenticated A | deny |

## 4. End-to-end (happy path)

- **Tool:** Playwright **not** required for MVP merge — **manual smoke** in [`flows.md`](flows.md) §1.
- **Future file:** `apps/intradark/e2e/forums.spec.ts` when Playwright lands for intradark.

## 5. Fixtures and seed data

- **Location (when integration exists):** `apps/intradark/test/fixtures/forums.ts`
- **Determinism:** fixed UUIDs for categories (if not relying solely on migration seed), threads, replies.
- **Auth:** use project-standard test user provisioning; never commit **service_role** keys.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit tests §1 rows **1–7** | all green before merge | MVP bar |
| Integration §3 | deferred | Enable when harness lands |
| E2E | manual per [`flows.md`](flows.md) | Until Playwright added |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- **`@workspace/ui`** internals — upstream.
- Pixel-perfect indentation of reply tree — smoke in browser; unit tests assert **structure** (depth, order), not CSS.

## 8. Refactor checklist (after green)

- [ ] Validation in **one** Zod module consumed by actions only (client uses inferred types or duplicate thin client schema only if unavoidable).
- [ ] No `any` on public action results.
- [ ] No new app-to-app imports.
- [ ] No `@workspace/ui` → Supabase edge.
- [ ] Reply tree builder stays **pure** — easy to test without React.

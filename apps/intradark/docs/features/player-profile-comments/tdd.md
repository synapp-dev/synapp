# Player profile comments — TDD plan

> Companion to [`plan.md`](plan.md) and [`flows.md`](flows.md). MVP emphasizes **Vitest** on **pure helpers and validation**; DB + RLS integration and Playwright match the **deferred** posture used for [forums](../forums/tdd.md).

## 1. Test list (red → green → refactor)

Author each **unit** test before or alongside its production helper. Order matters.

| # | Layer | Behavior under test | File (proposed) | Status |
|---|-------|---------------------|-----------------|--------|
| 1 | unit | **`buildCommentTree`** — flat rows → nested tree; top-level newest-first; replies oldest-first under parent | `apps/intradark/entities/players/lib/profile-comments/build-comment-tree.test.ts` | red |
| 2 | unit | **`buildCommentTree`** — orphan `parent_comment_id` → top-level or explicit error per contract | same | red |
| 3 | unit | **`exceedsMaxCommentDepth`** — depth ≤ `PLAYER_PROFILE_MAX_COMMENT_DEPTH` (3) ok; deeper rejected | `apps/intradark/entities/players/lib/profile-comments/reply-depth.test.ts` | red |
| 4 | unit | **Create comment schema** — body required, max 1000, optional `trust_signal`, valid parent UUID | `apps/intradark/entities/players/lib/profile-comments/schemas.test.ts` | red |
| 5 | unit | **Update / report schemas** — ownership fields not client-supplied; report reason bounds | same | red |
| 6 | unit | **`resolveProfileCommentEligibility`** — Steam linked → canWrite; no Steam → blocked; owner → canWrite but `canVote false` | `apps/intradark/entities/players/lib/profile-comments/eligibility.test.ts` | red |
| 7 | unit | **`assertTrustVoteAllowed`** — rejects when voter's linked `steam_profile_id === subject_steamid64` | same | red |
| 8 | unit | **`checkCommentRateLimit`** — 10th comment in 24h ok, 11th rejects with `RATE_LIMIT_COMMENTS` | `apps/intradark/entities/players/lib/profile-comments/rate-limits.test.ts` | red |
| 9 | unit | **`checkTrustVoteRateLimit`** — second change within 24h rejects with `RATE_LIMIT_TRUST_VOTE` | same | red |
| 10 | unit | **Action error mapping** — domain failures → stable codes + user-safe messages | `apps/intradark/entities/players/lib/profile-comments/action-errors.test.ts` | red |
| 11 | integration | **RLS:** anon can read non-deleted comments and trust counts; cannot insert | `apps/intradark/entities/players/profile-comments.int.test.ts` | deferred |
| 12 | integration | **RLS:** user A cannot update/delete user B's comment | same | deferred |
| 13 | e2e | Playwright not required at MVP — **manual smoke** in [`flows.md`](flows.md) §1.4 | `apps/intradark/e2e/player-profile-comments.spec.ts` | deferred |

After each **unit** item turns green, refactor before moving on.

## 2. Unit tests

### Pure functions / validators

- **Subject:** `buildCommentTree`, depth guard, Zod schemas, eligibility, rate-limit helpers, error codes.
- **Cases:**
  - Happy path: single top-level comment; parent + two replies at depth 2 and 3.
  - Boundary: empty list; max-depth reply attach; body length 1000 ok, 1001 rejected.
  - Invalid: wrong parent thread/subject; self-vote; unlinked Steam profile; depth 4 rejected.
- **Runner:** **Vitest** — `pnpm --filter intradark test`.
- **No mocks** for pure functions.

### Server actions

- Prefer testing **extracted guards** and **Zod parse** outcomes; full Drizzle integration in §3 when harness exists.
- If mocking `db` for actions, assert **result shape** only (`ok`, `code`, `message`).

### Hooks (optional MVP)

- If `useProfileCommentsPage` client hook added for load-more, test loading → data → error with React Query test utils — **optional** until hook exists.

## 3. Integration tests (DB + RLS)

**Deferred** until `apps/intradark` documents a repeatable local DB harness (same as forums).

### Setup (sketch)

- Apply **`apps/intradark/drizzle/*.sql`** in order.
- Seed: two Steam-linked users A/B, one profile subject `steamid64`, sample comments + one trust vote.

### Cases (sketch)

| Case | Acting role | Expected |
|------|-------------|----------|
| Anon reads comments on profile | anon | visible non-deleted rows |
| Anon reads trust counts | anon | `{ legit, suspicious }` returned |
| Anon cannot insert comment | anon | RLS deny |
| User A creates comment on B's profile | authenticated A | success |
| User A updates own comment | authenticated A | success |
| User A updates B's comment | authenticated A | deny / `FORBIDDEN` |
| User A reports B's comment once | authenticated A | success; duplicate report idempotent |
| Profile owner self-vote via action | authenticated owner | `SELF_VOTE_NOT_ALLOWED` |
| Trust vote upsert | authenticated A | one row per `(voter, subject)`; count aggregates correct |

## 4. End-to-end (happy path)

- **Tool:** **Manual smoke** per [`flows.md`](flows.md) §1.4 for MVP merge.
- **Future:** `apps/intradark/e2e/player-profile-comments.spec.ts` when Playwright lands.

```ts
// Future skeleton
test("player profile comments happy path", async ({ page }) => {
  await page.goto("/players/@jourdain");
  // signed-in Steam-linked user posts comment with legit tag
  // header shows legit count +1
  // nested reply at depth 1 visible
});
```

## 5. Fixtures and seed data

- **Location (when integration exists):** `apps/intradark/test/fixtures/player-profile-comments.ts`
- **Determinism:** fixed UUIDs for comments; fixed `steamid64` strings matching `players` row.
- **Auth:** project-standard test users with/without `steam_profile_id`.

## 6. Coverage gates

| Gate | Threshold | Notes |
|------|-----------|-------|
| Unit tests §1 rows **1–10** | all green before merge | MVP bar |
| Integration §3 | deferred | Enable when harness lands |
| E2e | manual per [`flows.md`](flows.md) | Until Playwright added |
| Architecture lint | clean | `pnpm lint:architecture` from repo root |

## 7. What NOT to test here

- `@workspace/ui` primitives or emoji-picker internals.
- Supabase platform behavior beyond app RLS policies.
- Full `PlayerHeader` animation choreography — smoke in browser only.
- Veritas score computation — out of scope ([`veritas-algorithm.md`](../../veritas-algorithm.md)).

## 8. Refactor checklist (after green)

- [ ] Validation in one Zod module referenced by actions and client forms.
- [ ] Reply depth logic not duplicated between forums and players — **may** extract shared helper only if identical; otherwise keep player-specific constant (depth 3 vs 15).
- [ ] No Supabase imports in client comment components.
- [ ] `profile-comments-card.tsx` under **250 lines** — split composer/thread if larger.
- [ ] Dummy `comments-card.tsx` removed or re-export shim documented.

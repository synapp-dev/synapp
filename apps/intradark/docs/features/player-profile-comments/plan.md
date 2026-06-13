# Player profile comments

> **Product:** `apps/intradark`
> **Slug:** `player-profile-comments`
> **Status:** Planned
> **Owner:** intradark maintainers
> **Created:** 2026-06-11

## 1. Summary

**Player profile comments** replace the dummy [`CommentsCard`](../../../components/organisms/comments-card.tsx) on `/players/@username` and `/players/<steamid64>` with a real, persisted social layer. **Steam-linked** intradark members can post **threaded comments** (max depth **3**) with an **emoji picker** and an optional **legit / suspicious** signal about the profile subject. Trust signals use a **hybrid model**: each comment may store a tag for thread context, while **`player_profile_trust_votes`** holds **one updatable vote per voter per profile** for **deduplicated header counts** (`✓ N legit · ⚠ N suspicious`) in [`PlayerHeader`](../../../entities/players/components/player-header.tsx). Anonymous and signed-in users **read** comments; writes go through **server actions + Drizzle** (forums pattern). Community votes are **peer signals**, distinct from the algorithmic **Veritas** score ([`veritas-algorithm.md`](../../veritas-algorithm.md)); wiring votes into Veritas **axis D (karma)** is **Phase 2**.

## 2. Scope

### In scope (MVP)

- **Schema + RLS:** `player_profile_comments`, `player_profile_trust_votes`, `player_profile_comment_reports`; indexes for list/sort, reply-tree lookups, trust aggregates; **soft delete** (`deleted_at`) on comments (forums-style).
- **Public read:** comment tree + trust aggregate counts on any player profile that exists in `public.players` (ensure row via existing `ensurePlayer` on first comment if needed).
- **Authenticated write (Steam-linked only):** create top-level comment or nested reply; optional `trust_signal` on create/update; edit/delete **own** comments; **report** any comment (store in DB, no mod UI).
- **Trust votes:** one row per `(voter_user_id, subject_steamid64)`; upsert on comment when user attaches/changes legit/suspicious; **no self-vote** when viewer owns the profile; header chips reflect **unique voters**, not raw comment counts.
- **Rate limits (server):** ~**10 comments / user / profile / 24h**; ~**1 trust-vote change / user / profile / 24h**.
- **Pagination:** newest-first top-level comments (~**20** per page), cursor load-more; replies under each parent **oldest-first**.
- **Content:** plaintext + Unicode emoji; emoji **picker** inserts into textarea; max body **1000** chars; no markdown, no auto-linked URLs, no `@mentions`.
- **UI:** migrate domain UI to `entities/players/components/`; trust chips in header **stats row**; comments card with `id="profile-comments"`; click chips scroll to comments.
- **Server actions** in `entities/players/actions/profile-comments-actions.ts` (or `entities/players/profile-comments/actions.ts` if the slice grows); queries in `entities/players/lib/profile-comments/`.
- **Validation:** Zod in `entities/players/lib/profile-comments/schemas.ts`; actions return `{ ok: true, data } | { ok: false, code, message }`.
- **Telemetry:** `track()` after successful comment create, trust vote upsert, report (non-PII), per §9.
- **Vitest** on pure helpers (tree build, depth guard, schemas, eligibility, rate-limit helpers) — see [`tdd.md`](tdd.md).
- **Rollout:** ship to **all profiles** immediately once merged (no feature flag).

### Out of scope (deferred)

- **Mod tools** (delete any comment, mod queue UI) — reports stored for later; staff use DB/console until RBAC mod role ships.
- **Veritas karma weighting** — score-weighted aggregation, Sybil resistance, and `player_trust_events` migration per [`veritas-algorithm.md`](../../veritas-algorithm.md) Phase 2.
- **Comment like/dislike** — remove dummy thumbs up/down from old `CommentsCard`; not replaced in MVP.
- **REST / mobile API** — server actions only until a second client exists.
- **Notifications** (new comment on your profile, reply alerts).
- **@mentions**, markdown, URL auto-linking.
- **Comment permalinks** (`?comment=` scroll/highlight).
- **Playwright + CI RLS integration** — deferred until harness exists (forums posture).

### Non-goals

- **Not** a general forum — profile-scoped threads only, keyed by `subject_steamid64`.
- **Not** anti-cheat adjudication — community signals are indicative, not verdicts.
- **Not** a second atomic library under `apps/intradark/components/` — domain UI in **`entities/players/`** (§7.1).
- **Not** importing Supabase into client components — session resolution stays server-side (§3.2).
- **Not** app-to-app imports (§3.1).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/intradark` only | §3.2, §5.1 |
| Domain code location | `apps/intradark/entities/players/` (`lib/profile-comments/`, `components/profile-*`, actions colocated) | §7.1 |
| Shell vs domain | Existing route `app/(main)/players/[id]/page.tsx`; comments UI in `entities/players/` | §7.1 |
| Retire dummy | Delete or re-export shim from `components/organisms/comments-card.tsx` → `entities/players/components/profile-comments-card.tsx` | §7.1, §7.2 |
| Auth dependency | `getSessionUserId()` + `getCurrentUserProfiles()` for Steam-link gate; Drizzle via `@/server/db/drizzle`; no Supabase client in comment client components | §3.2 |
| New package edges | **None** | §10 |

> Compliance gate: [architecture.md](../../../../../.cursor/skills/build-feature/checklists/architecture.md) — all **yes** / **n/a**. **No `ARCHITECTURE.md` edit** required.

### Veritas cross-reference

- Header **trust chips** are labeled as **community** signals (peer votes), separate from [`VeritasSummary`](../../../entities/players/components/veritas-summary.tsx) rings.
- Phase 2 may read `player_profile_trust_votes` (or migrate rows into `player_trust_events`) when implementing Veritas **axis D** — document in [`veritas-algorithm.md`](../../veritas-algorithm.md) at that time, not in this migration.

## 4. Data model

### Live project snapshot (before comments DDL)

**`public` tables (Supabase MCP `list_tables`, 2026-06-11):** includes `players`, `steam_profiles`, `user_profiles`, `forum_*`, etc. — all **RLS enabled**. **No profile comment tables yet.**

**Applied migrations (remote, ordered):** through `teams_brand_colors` (`0027_teams_brand_colors.sql` in `apps/intradark/drizzle/`). Next app-owned file: **`0028_player_profile_comments.sql`** (confirm journal in `drizzle/meta/_journal.json` at implementation).

### Tables / columns (conceptual)

```sql
-- Enum-like trust signal (use text + CHECK in migration)
-- 'legit' | 'suspicious'

-- player_profile_comments — threaded comments on a player profile
-- id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
-- subject_steamid64     BIGINT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE
-- parent_comment_id     UUID REFERENCES public.player_profile_comments(id) ON DELETE CASCADE (nullable = top-level)
-- body                  TEXT NOT NULL  -- max 1000 enforced in Zod
-- author_user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
-- trust_signal          TEXT NULL CHECK (trust_signal IN ('legit', 'suspicious'))  -- snapshot on this comment for display
-- created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- deleted_at            TIMESTAMPTZ NULL
-- CHECK: parent_comment_id IS NULL OR same subject_steamid64 as parent row (enforce via trigger or app + FK discipline)

-- player_profile_trust_votes — one active signal per voter per subject (header aggregates)
-- subject_steamid64     BIGINT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE
-- voter_user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
-- signal                TEXT NOT NULL CHECK (signal IN ('legit', 'suspicious'))
-- source_comment_id     UUID REFERENCES public.player_profile_comments(id) ON DELETE SET NULL  -- last comment that set/changed vote
-- created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- UNIQUE (subject_steamid64, voter_user_id)

-- player_profile_comment_reports — MVP store-only, no mod UI
-- id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
-- comment_id              UUID NOT NULL REFERENCES public.player_profile_comments(id) ON DELETE CASCADE
-- reporter_user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
-- reason                TEXT NULL  -- optional free text or enum at implementation
-- created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- UNIQUE (comment_id, reporter_user_id)  -- one report per user per comment
```

**Author display:** join `author_user_id` → `user_profiles.user_id` for `@username`, avatar (Steam), member badge.

**Aggregates:** `SELECT signal, COUNT(*) FROM player_profile_trust_votes WHERE subject_steamid64 = $1 GROUP BY signal` — cached in RSC per request or materialized in query helper; revalidate on vote upsert.

### RLS (sketch)

| Policy area | Audience | Rule (conceptual) |
|-------------|----------|-------------------|
| `player_profile_comments` | `anon` + authenticated | `SELECT` where `deleted_at IS NULL`. |
| `player_profile_comments` INSERT | authenticated | `author_user_id = auth.uid()` + eligibility enforced in action (Steam linked). |
| `player_profile_comments` UPDATE | authenticated | **Own row only** (`author_user_id = auth.uid()`), soft-delete via setting `deleted_at`. |
| `player_profile_trust_votes` | `anon` + authenticated | `SELECT` all (counts are public). |
| `player_profile_trust_votes` INSERT/UPDATE | authenticated | `voter_user_id = auth.uid()`; action rejects self-vote on own profile. |
| `player_profile_comment_reports` | authenticated | `INSERT` with `reporter_user_id = auth.uid()`; `SELECT` **deny** for normal users (staff/service role only later). |

Prefer **server actions + Drizzle** for writes; RLS still defends direct Supabase client access.

### Migration ownership

- **Path:** `apps/intradark/drizzle/0028_player_profile_comments.sql` (+ `drizzle/schema.ts`, `relations.ts` if used).
- **Pattern:** App-owned default (§8.1).
- **Remote apply:** Implementation session uses Supabase MCP **`apply_migration`** with the same SQL body and migration **name** as the committed file; keep remote ordering aligned with the journal.
- **Advisors:** After DDL, run **`get_advisors`** on the intradark project.
- **Backfill:** none (greenfield tables).
- **Types:** run **`generate_typescript_types`** when refreshing client types per repo convention.

## 5. API surface

| Operation | Surface | Name | Auth | Notes |
|-----------|---------|------|------|-------|
| List comments (page) | RSC query + optional server action for load-more | `listPlayerProfileComments` | public read | Cursor on `(created_at, id)` for top-level; batch-load replies per page |
| Trust aggregates | RSC query | `getPlayerProfileTrustCounts` | public read | `{ legit, suspicious }` from `player_profile_trust_votes` |
| Create comment / reply | Server Action | `createPlayerProfileCommentAction` | Steam-linked | Validates depth, rate limit, body; optional trust upsert in same transaction |
| Update own comment | Server Action | `updatePlayerProfileCommentAction` | Steam-linked owner | Body + optional trust signal change (respect vote rate limit) |
| Delete own comment | Server Action | `deletePlayerProfileCommentAction` | Steam-linked owner | Soft delete; does **not** remove voter's trust row (vote stands until changed) |
| Report comment | Server Action | `reportPlayerProfileCommentAction` | Steam-linked | Idempotent per `(comment, reporter)` |
| Viewer eligibility | Server helper | `resolveProfileCommentEligibility` | — | `{ canWrite, canVote, reason }` for UI gating |

### Validation

- **Schemas:** `entities/players/lib/profile-comments/schemas.ts` — body length, UUID parents, `trust_signal` enum optional, `subject_steamid64` as string/bigint per existing player conventions.
- **Constants:** `PLAYER_PROFILE_MAX_COMMENT_DEPTH = 3`, `PLAYER_PROFILE_MAX_BODY_LENGTH = 1000`, rate-limit constants in `constants.ts`.
- **Error codes:** `UNAUTHORIZED`, `STEAM_NOT_LINKED`, `FORBIDDEN`, `VALIDATION`, `PARENT_INVALID`, `DEPTH_EXCEEDED`, `SELF_VOTE_NOT_ALLOWED`, `RATE_LIMIT_COMMENTS`, `RATE_LIMIT_TRUST_VOTE`, `COMMENT_NOT_FOUND`, `SERVER_ERROR` — each maps to a row in [`flows.md`](flows.md).

## 6. UI composition

```
apps/intradark/
├── app/(main)/players/[id]/
│   └── page.tsx                          # Pass steamid64, trust counts, initial comments, viewer eligibility
├── entities/players/
│   ├── actions/profile-comments-actions.ts
│   ├── lib/profile-comments/
│   │   ├── schemas.ts
│   │   ├── constants.ts
│   │   ├── build-comment-tree.ts
│   │   ├── reply-depth.ts
│   │   ├── queries.ts
│   │   ├── eligibility.ts
│   │   └── rate-limits.ts
│   └── components/
│       ├── player-header.tsx             # + ProfileTrustChips in stats row
│       ├── player-profile.tsx            # wire ProfileCommentsCard, pass props
│       ├── profile-trust-chips.tsx
│       ├── profile-comments-card.tsx     # replaces dummy CommentsCard
│       ├── profile-comment-composer.tsx
│       ├── profile-comment-thread.tsx
│       └── profile-comment-item.tsx
└── components/organisms/
    └── comments-card.tsx                 # remove or thin re-export during migration (§7.2)
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Card, Button, Textarea, Avatar, Badge, Separator | `@workspace/ui` | Reuse |
| Emoji picker | new dep e.g. `emoji-picker-react` | Client-only dynamic import; no Supabase |
| Trust chips | `entities/players/components/profile-trust-chips.tsx` | Clicks scroll to `#profile-comments` |
| Sign-in / link Steam CTAs | existing auth patterns | When `canWrite === false` |

### Theming

- Tokens from `@workspace/ui` (§6).
- Legit chip: green-adjacent semantic token; suspicious: amber/red — use existing intradark semantic vars where possible.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — Card, Button, Textarea, Avatar, Badge, Separator, toast patterns
- `@/server/db/drizzle` — queries and actions (same as forums)
- `@vercel/analytics/server` — `track()` on successful mutations

### New external deps

- **`emoji-picker-react`** (or equivalent lightweight picker) — client-only emoji insert; justify in PR if bundle size reviewed.

### New package edges

- **None**

## 8. Implementation order (commits)

1. `docs(intradark): plan player-profile-comments feature` — this triad (can land first).
2. `feat(intradark): add player profile comments migration + schema` — DDL, RLS, Drizzle schema, types.
3. `test(intradark): add profile comment pure helper tests` — red tests from [`tdd.md`](tdd.md).
4. `feat(intradark): implement profile comment server actions` — create/update/delete/report + trust upsert + rate limits.
5. `feat(intradark): add profile comments queries and eligibility helpers` — green unit tests.
6. `feat(intradark): wire profile trust chips in player header` — aggregates from DB.
7. `feat(intradark): replace dummy comments card with profile comments UI` — composer, tree, pagination, emoji picker.
8. `feat(intradark): profile comment error states and reports` — flows coverage.
9. `chore(intradark): telemetry for profile comments` — analytics events.
10. `refactor(intradark): remove dummy comments-card organism` — re-export shim if needed short-term.

## 9. Telemetry

| Event | Trigger | Payload (non-PII) | Destination |
|-------|---------|-------------------|-------------|
| `player_profile_comment_created` | Successful create | `{ subject_steamid64, has_trust_signal, is_reply }` | Vercel Analytics |
| `player_profile_trust_vote_updated` | Trust upsert | `{ subject_steamid64, signal }` | Vercel Analytics |
| `player_profile_comment_reported` | Report stored | `{ comment_id }` | Vercel Analytics |

No comment body, no reporter/voter user ids in analytics payloads.

## 10. Rollout

- **Feature flag:** **none** — enabled for all profiles on deploy.
- **Env vars:** none required beyond existing Supabase/auth.
- **Migration sequencing:** apply **`0028_player_profile_comments.sql`** via MCP **`apply_migration`** before or with deploy that reads new tables; expand-only DDL (no breaking changes).
- **Backout:** revert app deploy; tables can remain empty. Forward-only data; soft-deleted comments remain hidden. Dropping tables is a separate governed migration if ever needed.

## 11. Open questions

- [ ] Exact emoji picker package vs minimal custom popover — owner: implementer, decide at UI commit.
- [ ] Report `reason` enum vs optional free text — owner: implementer, default optional text with length cap.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- User flows + error states: [`flows.md`](flows.md)
- Player profiles (host route): [`../players-directory-profiles/plan.md`](../players-directory-profiles/plan.md)
- Forums (reply-tree precedent): [`../forums/plan.md`](../forums/plan.md)
- Veritas (future karma): [`../../veritas-algorithm.md`](../../veritas-algorithm.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)

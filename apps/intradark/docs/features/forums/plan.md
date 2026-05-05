# Forums (CS2 community)

> **Product:** `apps/intradark`
> **Slug:** `forums`
> **Status:** Planned
> **Owner:** intradark maintainers
> **Created:** 2026-05-04

## 1. Summary

**Forums** bring a Counter-Strike–centric community layer into Intradark: **categories** (including LFT and feature requests), **optional tags** for cross-cutting topics, **threads** with rich-ish body text, and **Reddit-style nested replies** (`parent_reply_id` tree, indented in UI). **Anonymous users can read** published threads and replies; **writes require sign-in**. MVP is **self-service only** (edit/delete own content); **moderation via `user_roles`** and **non-web clients** (mobile app, Steam bot) are explicitly planned as follow-ups with an additional HTTP/RPC surface. Data and RLS stay **app-owned** under `apps/intradark/drizzle/` per [ARCHITECTURE.md](../../../../../ARCHITECTURE.md) §8.1; remote DDL is applied with Supabase MCP **`apply_migration`** in the **same order** as committed SQL, and **`generate_typescript_types`** may be run after schema changes when regenerating client types.

## 2. Scope

### In scope (MVP)

- **Schema + RLS:** `forum_categories` (seeded), `forum_tags`, `forum_thread_tags` (junction), `forum_threads`, `forum_replies`; indexes for list/sort and reply-tree lookups; **soft delete** (`deleted_at`) or equivalent so trees stay coherent when authors remove content (exact column strategy at implementation).
- **Public read:** category index, thread list by category, thread detail with nested replies (exclude deleted rows in public queries).
- **Authenticated write:** create thread (category + title + body + optional tags), create reply (optional parent for nesting), edit/delete **own** thread and **own** reply within policy (e.g. time window optional — decide at implementation).
- **Server actions + Drizzle** in `entities/forums/` for mutations; **Server Components + Drizzle** for reads (same lane as [news](../news/plan.md)).
- **UI:** `entities/forums/components/*` + thin `app/(main)/forums/*` routes; primitives from `@workspace/ui` (**§7.1**).
- **Validation:** Zod in `entities/forums/lib/`; server actions return **`{ ok: true } | { ok: false, code, message }`** with stable `code` values (see [`flows.md`](flows.md)).
- **Reply depth cap** enforced server-side to avoid pathological trees and UI blowups.
- **Telemetry:** `track()` after successful thread/reply create (non-PII payload only) per §9.
- **Vitest** for pure helpers and validation (see [`tdd.md`](tdd.md)); integration/E2E deferred same posture as [utility-lineups](../utility-lineups/tdd.md).

### Out of scope (deferred)

- **Mod tools** (delete any, lock, pin) gated on **`user_roles`** — document follow-up; tables may reserve columns (`locked_at`) only if needed without UI in MVP.
- **Reply permalinks** (`?reply=`) scroll/highlight — thread-level URLs only in MVP.
- **HTTP API** for mobile / Steam bot — add stable routes or RPC when those clients ship; do not block MVP on package extraction (**§5.1**).
- **Votes, reactions, bookmarks** — later.
- **Full-text search, notifications, RSS** — later.
- **Rich embeds** beyond conservative markdown/plaintext policy — align with abuse/spam posture at implementation.
- **Playwright + CI RLS integration** — deferred until harness exists ([`tdd.md`](tdd.md)).

### Non-goals

- **Not** a second atomic library under `apps/intradark/components/` — domain UI lives in **`entities/forums/`** (**§7.1**).
- **Not** importing Supabase clients into forum **client** components — session resolution stays server-side (**§3.2** / checklist F).
- **Not** app-to-app imports (**§3.1**).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/intradark` only | §3.2, §5.1 |
| Domain code location | `apps/intradark/entities/forums/` | §7.1 |
| Shell vs domain | Thin routes `app/(main)/forums/*`; domain in `entities/forums/` | §7.1 |
| Auth dependency | Server-only session (`getSessionUserId()` pattern today via `@/utils/supabase/server`); **align** with `@workspace/supabase` when the app standardizes — same note as [news](../news/plan.md) | §3.2 |
| New package edges | **None** | §10 |

> Compliance gate: [architecture.md](../../../../../.cursor/skills/build-feature/checklists/architecture.md) — all **yes** / **n/a** for this plan. **No `ARCHITECTURE.md` edit** required for forums-only work.

## 4. Data model

### Live project snapshot (before forums DDL)

**`public` tables (Supabase MCP `list_tables`, compact):** `steam_profiles`, `user_profiles`, `roles`, `user_roles`, `news_articles`, `utility_maps`, `utility_map_spots`, `utility_lineups` — all **RLS enabled**. **No forum tables yet.**

**Applied migrations (remote, ordered):** `add_discord_user_id_to_user_profiles` (×2), `roles_user_roles_rbac`, `user_roles_profile_fk`, `developer_role`, `news_articles`, `utility_maps_lineups`. Next app-owned file should follow **`apps/intradark/drizzle/`** journal ordering (e.g. after `0005_utility_maps_lineups.sql` — exact next filename from `drizzle/meta/_journal.json` at implementation).

### Tables / columns (conceptual)

Naming is indicative; final names live in `apps/intradark/drizzle/schema.ts` + migration.

```sql
-- forum_categories — seeded in initial forums migration
-- id, slug (unique), label, description (nullable), sort_order, created_at

-- forum_tags — curated or user-proposed at implementation; MVP: curated rows + junction
-- id, slug (unique), label, created_at

-- forum_thread_tags — (thread_id, tag_id) UNIQUE

-- forum_threads
-- id, category_id → forum_categories, slug (scoped unique with category_id),
-- title, body (text or markdown policy), author_user_id (auth.users id, same spirit as news_articles.author_user_id),
-- created_at, updated_at, deleted_at (nullable), optional: locked_at (nullable, unused in MVP UI if omitted)

-- forum_replies
-- id, thread_id → forum_threads, parent_reply_id → forum_replies (nullable = top-level comment),
-- body, author_user_id, created_at, updated_at, deleted_at (nullable)
-- CHECK: parent_reply_id IS NULL OR EXISTS (same thread_id on parent row)
```

**Author identity:** `author_user_id` stores **Supabase Auth user id** from `getSessionUserId()`; join **`user_profiles.user_id`** for display name/avatar in queries.

**Interconnectivity (follow-up):** Optional `metadata jsonb` on `forum_threads` for structured deep links (player, match, news slug) can land in phase 2 to avoid blocking MVP DDL review.

### RLS (sketch)

| Policy area | Audience | Rule (conceptual) |
|-------------|----------|-------------------|
| `forum_categories` | `anon` + authenticated | `SELECT` all active rows (no secrets on category). |
| `forum_tags` | `anon` + authenticated | `SELECT` published tag catalog. |
| `forum_threads` | `anon` + authenticated | `SELECT` where `deleted_at` IS NULL (and not locked for non-mods — if `locked_at` exists later). |
| `forum_replies` | `anon` + authenticated | `SELECT` where `deleted_at` IS NULL and parent thread visible. |
| `forum_threads` INSERT | authenticated | `author_user_id = auth.uid()`. |
| `forum_replies` INSERT | authenticated | `author_user_id = auth.uid()` + parent/thread integrity. |
| `forum_threads` UPDATE/DELETE | authenticated | **Own row only** in MVP (`author_user_id = auth.uid()`), soft-delete semantics as chosen. |
| `forum_replies` UPDATE/DELETE | authenticated | **Own row only** in MVP. |
| Junction `forum_thread_tags` | authenticated | Writes limited to **thread author** on create/update paths (or disallow direct client writes entirely if only server/service role writes — **prefer** server actions + Drizzle with service connection; RLS still defends anon Supabase clients). |

Tighten predicates in SQL when implementing; mirror patterns used on `news_articles` / `user_profiles` in existing migrations.

### Migration ownership

- **Path:** `apps/intradark/drizzle/*.sql` (next sequential migration) + corresponding `drizzle/schema.ts` (and `relations.ts` if used).
- **Pattern:** **App-owned** default (**§8.1**). Not packaged module template (**§8.2** / **§8.3**).
- **Seeding:** `INSERT` initial **`forum_categories`** (and optional starter **`forum_tags`**) in the **same migration** that creates tables — suggested slugs: `general`, `looking-for-team`, `feature-requests`, `competitive`, `off-topic` (adjust copy at implementation).
- **Remote apply:** Implementation session uses Supabase MCP **`apply_migration`** with the same SQL body and migration **name** as the committed file; keep remote ordering aligned with the journal.
- **Advisors:** After substantive DDL, run **`get_advisors`** on the intradark project for security/perf notes.
- **Backfill:** none for greenfield tables.

### Generated types

After migrations apply to the linked Supabase project, run **`generate_typescript_types`** when refreshing **`apps/intradark`** Supabase/Drizzle types per repo convention (`pnpm gen-types` / `pull-and-fix-schema` as used elsewhere).

## 5. API surface

| Operation | Surface | Path / name | Auth | Notes |
|-----------|---------|-------------|------|-------|
| List categories | RSC query / loader | `app/(main)/forums/page.tsx` | Public | Drizzle read |
| List threads by category | RSC | `app/(main)/forums/[categorySlug]/page.tsx` | Public | Pagination cursor/limit at implementation |
| Thread detail + replies | RSC | `app/(main)/forums/[categorySlug]/[threadSlug]/page.tsx` | Public | Fetch replies; build tree in server or pure helper |
| Create thread | Server Action | `createForumThreadAction` in `entities/forums/actions.ts` | Required | Zod; tags; slug uniqueness; `revalidatePath` |
| Create reply | Server Action | `createForumReplyAction` | Required | Validate `parent_reply_id` belongs to same thread; depth limit |
| Edit/delete own thread | Server Action | `updateForumThreadAction` / `softDeleteForumThreadAction` | Required | Ownership |
| Edit/delete own reply | Server Action | `updateForumReplyAction` / `softDeleteForumReplyAction` | Required | Ownership |

### Future API (document only)

- **`/api/forums/v1/...`** or **tRPC** layer for **mobile** and **Steam bot**, reusing Zod contracts from `entities/forums/lib/` — add when a second transport exists; keep server actions as the web MVP.

### Validation

- **Input schemas:** `entities/forums/lib/schemas.ts` (thread create, reply create, update payloads).
- **Error mapping:** every `ok: false` maps to a row in [`flows.md`](flows.md) §2; `code` is stable for tests and telemetry bucketing.

## 6. UI composition

```
apps/intradark/
├── app/(main)/forums/
│   ├── page.tsx                      # Categories hub
│   ├── [categorySlug]/page.tsx      # Thread list
│   ├── [categorySlug]/[threadSlug]/page.tsx  # Thread + nested replies
│   └── loading.tsx                   # optional per segment
├── entities/forums/
│   ├── actions.ts                    # "use server"
│   ├── components/                   # ForumCategoryGrid, ThreadList, ThreadDetail, ReplyTree, composers…
│   ├── lib/                          # schemas, buildReplyTree, slug helpers, error codes
│   └── hooks/                        # only if needed for client islands
└── components/                       # shell only — no new forum atoms here
```

### Component map

| Piece | Source | Notes |
|-------|--------|-------|
| Layout, buttons, inputs, cards, dialogs | `@workspace/ui` | No duplication in `components/atoms` |
| Reply tree indentation, “Reply” affordances | `entities/forums/components/` | Reddit-like UX; accessibility (focus order, skip link) |

### Theming

- Tokens from `@workspace/ui` (**§6**). Product overrides remain in `app/globals.css` after workspace import if needed.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — layout primitives for lists, forms, thread chrome.
- `@supabase/ssr` (via `@/utils/supabase/server`) — **server-only** session read for actions.
- `drizzle-orm`, `postgres`, `zod`, `@vercel/analytics` — same stack as news.

### New external deps

- **None** unless markdown renderer chooses a new package — justify in implementation if added.

### New package edges

- **None.**

## 8. Implementation order (commits)

Granular conventional commits per [commit-organizer](../../../../../.cursor/skills/commit-organizer/SKILL.md).

1. `docs(intradark): plan forums feature` — this triad (if not already landed).
2. `feat(intradark): add forums drizzle schema + migration` — tables, indexes, RLS, **category seed**; journal updated.
3. `chore(intradark): apply forums migration remote` — only when operator runs MCP `apply_migration` in implementation session.
4. `feat(intradark): forums server actions` — create thread/reply, edit/delete own; Zod + result codes.
5. `test(intradark): forums unit tests` — tree builder, depth, validation (`tdd.md`).
6. `feat(intradark): forums UI` — entities + routes; empty states; nested replies.
7. `feat(intradark): forums telemetry` — `track()` on successful creates.
8. `chore(intradark): regenerate supabase types` — if schema types refreshed in repo workflow.

## 9. Telemetry

| Event | Trigger | Payload (non-PII) | Destination |
|-------|---------|-------------------|---------------|
| `forum_thread_created` | `createForumThreadAction` success | `{ category_slug, thread_id, tag_count }` | Vercel Analytics `track()` |
| `forum_reply_created` | `createForumReplyAction` success | `{ thread_id, depth_bucket, has_parent }` | same |

**Deferred:** high-volume `forum_thread_view` until product needs it.

## 10. Rollout

- **Feature flag:** **none** for MVP unless product asks — empty thread lists are acceptable with seeded categories.
- **Env vars:** no new required vars beyond existing `DATABASE_URL` / Supabase publishable keys; document in `env.example` only if new optional toggles appear.
- **Migration sequencing:** ship **SQL migration** before or with first UI that depends on tables; **never** partial deploy that assumes columns missing.
- **Backout:** If migration **not** yet in production, remove migration file + revert journal. If **already applied**, **forward-only** follow-up migrations (adjust seeds, add columns); avoid `DROP TABLE` once user content exists.

## 11. Open questions

- [ ] Exact **markdown vs plaintext** policy and sanitization library — owner: intradark maintainers, due: implementation kickoff.
- [ ] **Edit window** for threads/replies (unlimited vs N minutes) — owner: intradark maintainers, due: implementation kickoff.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
- Related: [news](../news/plan.md) (patterns), [admin-panel](../admin-panel/plan.md) (RBAC for future mods)

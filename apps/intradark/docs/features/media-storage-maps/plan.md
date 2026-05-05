# Media storage, canonical maps, and utility admin

> **Product:** `apps/intradark`
> **Slug:** `media-storage-maps`
> **Status:** Planned
> **Owner:** intradark maintainers
> **Created:** 2026-05-04

## 1. Summary

Introduce **one primary Supabase Storage bucket** for Intradark images (players, maps, news, utility assets, etc.) with a **documented object key layout**, **Storage RLS** aligned to **`developer`** (and public read rules where appropriate), and **server-only** helpers plus **Route Handlers** for **signed uploads**. In **`public`**, add **`map_pools`** (active duty / reserve / community) and a canonical **`maps`** table (game-agnostic core, **one `pool_id` per map**) so every module references **`maps.id`**. **Migrate** existing **`utility_maps`** rows into **`maps`**, repoint **`utility_map_spots`** and **`utility_lineups`**, then **drop `utility_maps`**. Ship a **`/admin/utility`** admin UI ( **`developer`**-only** beyond the existing admin shell gate) to edit map fields and related utility configuration. **MVP does not** require rewiring news body assets or every consumer URL in the same release; those stay follow-ups once the bucket contract is stable.

**Live DB snapshot (Supabase intradark MCP, 2026-05-04):** `public` has `steam_profiles`, `user_profiles`, `roles`, `user_roles`, `news_articles`, `utility_maps` (0 rows), `utility_map_spots`, `utility_lineups`. `storage.buckets` has **0** rows. Remote migration history includes `utility_maps_lineups`, `news_articles`, RBAC migrations, and `forums_mcp_smoke` — **implementation** must keep **`apps/intradark/drizzle/*.sql`** and remote **`apply_migration`** ordering aligned (**[ARCHITECTURE.md](../../../../../ARCHITECTURE.md) §8.1**). After schema changes, **`generate_typescript_types`** may be run when regenerating Supabase client types is part of the workflow.

## 2. Scope

### In scope (MVP)

- **Storage:** Create **`storage.buckets`** row (stable **`id` / `name`**, e.g. `intradark-media`), set **`public`** / limits / **`allowed_mime_types`** as needed; **`storage.objects`** policies for **anon/authenticated read** on public prefixes and **`developer`**-gated **insert/update/delete** on controlled prefixes (exact policy text in migration).
- **Key layout:** Document and enforce via helpers (prefix constants + validation), e.g. `maps/{mapSlug}/radar.{ext}`, `maps/{mapSlug}/badge.{ext}`, `players/{profileId}/avatar.{ext}`, `news/{articleId}/{filename}`, `utility/lineups/{lineupId}/{filename}` — adjust names only if product prefers, but **stay prefix-per-domain**.
- **SQL migrations (app-owned):** `map_pools` + seed rows (`active_duty`, `reserve`, `community`); **`maps`** with **`pool_id`**, **`game`** (default **`cs2`**), **`slug`**, **`display_name`**, **`radar_image_url`** (still `text`, can be HTTPS or public object URL), **`is_active`**, **`sort_order`**, timestamps; **backfill** from **`utility_maps`** preserving **`id`** so child FKs can be repointed without orphaning rows; **`ALTER`** **`utility_map_spots`** / **`utility_lineups`** FKs to **`maps`**, **`DROP`** **`utility_maps`**; **RLS** on **`maps`** / **`map_pools`** mirroring public read for active maps and **`developer`** mutators (same **`user_roles` + `roles` + `user_profiles`** join pattern as **[`0004_news_articles.sql`](../../../drizzle/0004_news_articles.sql)** but **`r.slug = 'developer'`** only for writes unless product expands).
- **Drizzle:** Update **`apps/intradark/server/db/schema.ts`** (replace **`utilityMaps`** with **`maps`**, add **`mapPools`**), new migration file after **`0006_forums.sql`** (e.g. **`0007_media_maps_storage.sql`** — name in journal must match apply order).
- **Server API:** Route handlers under **`app/api/...`** for **signed upload URL** minting (and any map mutation if not using direct server Drizzle from Server Actions — pick one consistent pattern; handlers preferred for uploads).
- **Helpers:** `apps/intradark/lib/media/` (or `entities/utility-lineups/lib/` only for utility-specific — prefer **`lib/media/`** for bucket + path + public URL building) — **no** `@workspace/ui` import of Supabase.
- **Admin UI:** `app/(main)/admin/utility/page.tsx` (+ small client islands as needed), domain pieces under **`entities/utility-lineups/`** or **`entities/admin/`** reusing **`@workspace/ui`**; gate with **`hasRoleSlug(..., ROLE_DEVELOPER)`** (see **`entities/admin/lib/rbac-constants.ts`**).
- **Telemetry:** `@vercel/analytics/server` **`track`** for **`utility_admin_*`** events from server code only (**[§9](#9-telemetry)**).
- **Consumer updates in MVP:** **`entities/utility-lineups`** queries and types must target **`maps`** instead of **`utility_maps`**; other modules (news, profiles) **may** still store external URLs until a later feature.

### Out of scope (deferred)

- **Rewriting** all article/media fields to storage keys; **Playwright** admin E2E until an auth harness exists.
- **Second Supabase bucket** per env (e.g. separate `intradark-media-staging`) unless ops requests — document single bucket **id** constant.
- **Compare-and-set** concurrency, **M2M** map–pool membership, **workshop** metadata columns beyond a short optional list — add when needed.

### Non-goals

- **No** `apps/*` → `apps/*` imports; **no** new **`packages/*`** for types/helpers (**[ARCHITECTURE.md](../../../../../ARCHITECTURE.md) §5.1**).
- **No** `@workspace/ui` → **`@workspace/supabase`** (**§3.2**).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | Section |
|----------|--------|---------|
| Lives in app vs package | `apps/intradark` only | §3.2, §5.1 |
| Domain code location | `entities/utility-lineups/`, `entities/admin/`, `lib/media/`, route handlers in `app/api/` | §7.1 |
| Shell vs domain | Admin route under `app/(main)/admin/`; primitives from `@workspace/ui` | §7.1 |
| Auth dependency | `@workspace/supabase` / session helpers **server-only**; Storage policies duplicate **developer** intent | §3.2 |
| New package edges | **None** | §3.2, §10 |

### Architecture compliance gate

Source: [`.cursor/skills/build-feature/checklists/architecture.md`](../../../../../.cursor/skills/build-feature/checklists/architecture.md).

| ID | Item | Outcome |
|----|------|---------|
| A | Import graph / no `@workspace/ui` → Supabase | **yes** (target) |
| B | Domain under `entities/`; shell-only `components/` | **yes** |
| C | No premature package extraction | **yes** |
| D | Tokens from `@workspace/ui` | **yes** |
| E | Migrations + RLS in `apps/intradark/` | **yes** |
| F | Server-only secrets; no UI → Supabase | **yes** |
| G | §10 trigger | **n/a** |
| H | `pnpm lint:architecture` | **yes** (target) |

## 4. Data model

### Tables / columns (conceptual DDL)

Final names live in **`server/db/schema.ts`** + new **`drizzle/0007_*.sql`**.

```sql
-- public.map_pools
-- id uuid pk, slug varchar unique (active_duty | reserve | community),
-- display_name varchar, sort_order int default 0, created_at, updated_at
-- SEED three rows in same migration.

-- public.maps  (canonical; replaces utility_maps)
-- id uuid pk  -- backfill: same ids as utility_maps rows when migrating
-- game varchar default 'cs2' not null  -- future non-CS2 maps without renaming table
-- slug varchar unique not null
-- display_name varchar not null
-- pool_id uuid not null references map_pools(id)
-- radar_image_url text not null  -- URL or https://.../storage/v1/object/public/... 
-- is_active boolean default true not null
-- sort_order int default 0 not null
-- created_at, updated_at timestamptz

-- FK migration:
-- utility_map_spots.map_id -> maps.id (drop old fkey, add new)
-- utility_lineups.map_id -> maps.id
-- DROP TABLE utility_maps;

-- storage.buckets: INSERT id = 'intradark-media' (or chosen id), public read TBD
-- storage.objects: policies scoped to bucket_id = 'intradark-media' and (name LIKE 'maps/%' OR ...)
```

### RLS (sketch)

| Policy | Table | Role | Rule |
|--------|-------|------|------|
| `map_pools_select_public` | `map_pools` | `anon`, `authenticated` | `true` (reference data) |
| `maps_select_public` | `maps` | `anon`, `authenticated` | `is_active = true` |
| `maps_write_developer` | `maps` | `authenticated` | `EXISTS (user_roles ⨝ roles ⨝ user_profiles WHERE user_id = auth.uid() AND roles.slug = 'developer')` for INSERT/UPDATE/DELETE |
| `utility_map_spots` / `utility_lineups` | existing | — | **Update** subqueries that referenced **`utility_maps`** to reference **`maps`** where policies use `EXISTS (SELECT 1 FROM ... m WHERE m.id = map_id AND m.is_active)` |

### Migration ownership

- **Path:** `apps/intradark/drizzle/` — new file after **`0006_forums.sql`**, **`meta/_journal.json`** updated.
- **Pattern:** App-owned (**§8.1**).
- **Remote apply:** Same SQL body via Supabase MCP **`apply_migration`** (`name` + `query`) **in the same order** as committed drizzle files.
- **Backfill:** For **`utility_maps`** with data: assign **`pool_id`** to default pool (e.g. **`active_duty`**) in **`INSERT INTO maps ... SELECT`**. Empty table: still run structural migration.
- **Backout:** Forward-fix preferred; reversing FK drops is painful — keep migration **pair** or new forward migration documented; Storage bucket emptying via dashboard if rollback.

### Generated types

Regenerate app Supabase/Drizzle types after DDL per team convention.

## 5. API surface

| Operation | Surface | Path (example) | Auth | Notes |
|-----------|---------|------------------|------|-------|
| Mint signed upload URL | Route Handler | `app/api/media/upload-url/route.ts` | Session + **`developer`** | Validate content-type, size, allowed prefix; return short-lived signed URL; **`track('utility_admin_storage_sign', {...})`** |
| List / read maps for admin | Server Component + Drizzle or handler | admin page | **`developer`** | Same role gate as mutations |
| Update map row | Route Handler **or** Server Action | e.g. `app/api/admin/maps/[id]/route.ts` | **`developer`** | Zod body; **`updated_at`** touch; LWW (**[`flows.md`](flows.md)**) |

### Validation

- **Zod** schemas colocated with handlers or `entities/utility-lineups/lib/schemas.ts`.
- Map every server failure to a row in **[`flows.md`](flows.md)** §2.

## 6. UI composition

```
apps/intradark/
├── app/(main)/admin/
│   └── utility/
│       └── page.tsx          # developer-only; lists maps, edit form
├── app/api/media/...
├── entities/utility-lineups/ # queries, admin forms wrapping @workspace/ui
├── entities/admin/           # reuse getSessionUserId, role helpers
└── lib/media/                # bucket id, path builders, getPublicUrl helpers
```

### Component map

| Piece | Source | Notes |
|-------|--------|-------|
| Inputs, buttons, tables, dialogs | `@workspace/ui` | No duplication in `components/atoms` |
| Utility admin layout | `entities/utility-lineups/components/` or `entities/admin/` | Product copy + wiring |

### Theming

Per **ARCHITECTURE.md §6** — workspace tokens only.

## 7. Dependencies

### Existing

- `@workspace/ui` — form primitives, data table if used.
- `@workspace/supabase` — server client for session + optional admin server reads.
- `@vercel/analytics/server` — **`track`**.

### New external deps

- **None** unless upload flow needs a small util (prefer native **`fetch`** + Supabase server client).

### New package edges

- **None.**

## 8. Implementation order (commits)

Granular conventional commits per [commit-organizer](../../../../../.cursor/skills/commit-organizer/SKILL.md).

1. `docs(intradark): plan media-storage-maps feature` — this triad (if not already landed).
2. `feat(intradark): add map_pools maps migration and storage bucket` — DDL + RLS + Storage policies + Drizzle schema.
3. `refactor(intradark): point utility-lineups to maps` — query + type renames.
4. `feat(intradark): lib/media path helpers and upload-url route` — signed URL + validation.
5. `feat(intradark): admin utility maps UI` — `/admin/utility` + developer gate.
6. `test(intradark): vitest for media paths and handlers` — per **`tdd.md`**.
7. `chore(intradark): utility_admin telemetry` — `track` allowlist.

## 9. Telemetry

| Event | Trigger | Payload (no PII) | Destination |
|-------|---------|------------------|---------------|
| `utility_admin_map_upsert` | Successful map save | `{ map_slug, pool_slug, ok: true }` | Vercel Analytics |
| `utility_admin_map_upsert` | Validation failure | `{ ok: false, code: 'validation' }` | same |
| `utility_admin_storage_sign` | Signed URL minted | `{ prefix: 'maps' \| 'players' \| ..., ok }` | same |

## 10. Rollout

- **Feature flag:** **None** for schema once merged; bucket **`id`** is a **compile-time constant** (and optional **`NEXT_PUBLIC_*`** only if the client must build public URLs without server help — prefer server-assembled URLs to minimize env surface).
- **Env vars:** Document existing Supabase URL/keys in **`env.example`**; add **`NEXT_PUBLIC_SUPABASE_URL`** if not already used for public object URLs.
- **Migration sequencing:** Deploy **after** migration applies (or expand-contract if zero-downtime needed — with 0 rows today, single-step is fine).
- **Backout:** Document forward migration; Storage cleanup manual.
- **Advisors:** Run **`get_advisors`** after substantive DDL (**build-feature** intradark MCP guidance).

## 11. Open questions

- [ ] Final bucket **`id`** string (`intradark-media` vs product branding) — owner: intradark, due: implementation kickoff.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Superseded map identity in: [`../utility-lineups/plan.md`](../utility-lineups/plan.md) (update that doc’s data model section when **`maps`** lands, or add a one-line deprecation note there in the same PR).
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)

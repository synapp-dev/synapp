# Utility lineups (CS2 grenade browser)

> **Product:** `apps/intradark`
> **Slug:** `utility-lineups`
> **Status:** Planned
> **Owner:** intradark maintainers
> **Created:** 2026-05-04

## 1. Summary

**Utility lineups** gives Intradark a **csnades.gg-style** experience: pick an **active** map, view its **radar**, filter by **grenade type** and **side**, see **clustered markers** at **landing** spots (count = lineups per land spot), and open a **detail overlay** with **lineup screenshot**, **embedded how-to video** (YouTube with optional in/out timestamps), and **throw instructions**. All **geometry** for pins comes from a shared **`map_spots`** catalog per map (future **callouts** reuse the same rows); **new** positions are modeled as **new spot rows**, not freeform coordinates on the lineup. **MVP** is **read-only** for visitors; **author** and **verification** fields exist for **phase 2** community submission and moderation. Data lives in **Postgres** with **RLS** for public read of **published** content; **Drizzle** in **Server Components** loads lists and map views; **filters** use **`searchParams`** so URLs are shareable.

**Live DB note (Supabase intradark, 2026-05-04):** `public` contains `steam_profiles`, `user_profiles`, `roles`, `user_roles`, `news_articles` only — this feature introduces **new** tables via the next app-owned migration after `0004_news_articles.sql`.

## 2. Scope

### In scope (MVP)

- **Routes:** **`/utility`** (map picker / list) and **`/utility/[mapSlug]`** (radar + sidebar filters + markers + detail overlay).
- **Drizzle schema + SQL migration** under **`apps/intradark/drizzle/`** mirroring **`apps/intradark/server/db/schema.ts`**; **RLS** allowing **`anon` + `authenticated`** to **`SELECT`** **published** lineups, **active** maps, and spots for those maps.
- **Entities:** `apps/intradark/entities/utility-lineups/` for compositions (map shell, radar layer, marker clusters, filter controls, detail sheet/dialog); **`@workspace/ui`** primitives; **`components/`** remains shell-only (**ARCHITECTURE.md §7.1**).
- **Server data access only** for reads: **Server Components + Drizzle** (no browser Supabase client in this module for MVP reads).
- **`searchParams`** for `type`, `side` (exact names finalized in implementation); **invalid values coerced** to safe defaults (**[`flows.md`](flows.md)**).
- **Errors:** unknown **`mapSlug`** → **`notFound()`**; DB failures → **`error.tsx`** + retry; **zero lineups** for valid filters → **inline empty state**.
- **Vitest** for **pure helpers** (param normalization, enum coercion, grouping lineups by **`land_spot_id`** for marker counts) per **[`tdd.md`](tdd.md)**.
- **Telemetry:** existing **Vercel Web Analytics**; optional **`track()`** for **`utility_map_view`** and **`utility_lineup_open`** with small payloads (**§9**).

### Out of scope (deferred)

- **Community submit UI**, **moderation queue**, **favourites**, **“recommended”**, **callout labels drawn on radar** (beyond using spot names in UI), **SimpleRadar / radar variants**, **fullscreen** and **zoom** polish.
- **Public `/api/*` JSON** for this feature (not required if RSC + `searchParams` suffice).
- **Playwright E2E** and **live RLS integration tests in CI** — same **deferred** posture as **[`../news/tdd.md`](../news/tdd.md)** until a harness exists.

### Non-goals

- **Not** importing **`@supabase/*`** or **`@workspace/supabase`** from **`entities/utility-lineups`** **client** components (**ARCHITECTURE.md §3.2**, checklist F).
- **Not** a second atomic library under **`components/`** (**§7.1**).
- **Not** extracting runtime types or DDL to **`packages/*`** until a **second product** consumes them (**§5.1**).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md). All decisions below must hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/intradark` only | §3.2, §5.1 |
| Domain code location | `apps/intradark/entities/utility-lineups/` | §7.1 |
| Shell vs domain | Thin routes under `app/(main)/utility/`; shell in `components/` unchanged | §7.1 |
| Auth dependency | **Public reads:** Drizzle/server DB path aligned with app conventions; **no** client Supabase in entity UI. Long-term session helpers stay **`@workspace/supabase`** on **server only** when auth is needed (future submit). | §3.2 |
| New package edges | **None** | §3.2, §10 |

### Architecture compliance gate

Source: [`.cursor/skills/build-feature/checklists/architecture.md`](../../../../../.cursor/skills/build-feature/checklists/architecture.md).

| ID | Item | Outcome |
|----|------|---------|
| A | No app↔app imports; packages↮apps; `@workspace/ui`↮Supabase; no new cycles | **yes** |
| B | Primitives from `@workspace/ui`; domain under `entities/`; `components/` shell-only | **yes** |
| C | No premature package extraction | **yes** |
| D | Tokens from `@workspace/ui`; product overrides only via existing globals pattern | **yes** |
| E | Migrations + RLS in `apps/intradark/`; no shared cross-product DB | **yes** |
| F | Server-only DB access for reads; no new `@workspace/ui` → Supabase coupling | **yes** |
| G | No **§10** trigger (no new edges / packages / migration-default change) | **n/a** |
| H | `pnpm lint:architecture` clean after implementation | **yes** (target) |

## 4. Data model

### Tables / columns (conceptual)

Naming is indicative; final names and exact checks live in **`server/db/schema.ts`** + migration **`0005_*`** (next after `0004_news_articles.sql`).

```sql
-- public.utility_maps
-- id (uuid, pk), slug (unique, used in /utility/[mapSlug]), display_name,
-- radar_image_url (text, https or storage public URL),
-- is_active (boolean, default true), sort_order (int, default 0),
-- created_at, updated_at

-- public.utility_map_spots  -- shared catalog: callouts / throw / land pins
-- id (uuid, pk), map_id (uuid fk -> utility_maps.id on delete cascade),
-- slug (text/varchar, stable key per map e.g. 'ticket'),
-- label (text, human display),
-- radar_x (double precision, 0..1), radar_y (double precision, 0..1),
-- created_at, updated_at
-- UNIQUE (map_id, slug)

-- public.utility_lineups
-- id (uuid, pk), map_id (uuid fk -> utility_maps),
-- throw_spot_id (uuid fk -> utility_map_spots),
-- land_spot_id (uuid fk -> utility_map_spots),
-- grenade_type: 'smoke' | 'molotov' | 'flashbang' | 'he'  (CHECK or PG enum — pick one; Drizzle must match),
-- side: 't' | 'ct' | 'both',
-- movement: 'stationary' | 'running' | 'walking' | 'crouched' | 'crouched_walking',
-- technique: 'left_click' | 'right_click' | 'left_and_right_click' | 'jump_left_click' | 'jump_right_click' | 'jump_left_and_right_click',
-- margin: 'low' | 'medium' | 'high',
-- youtube_url (text), video_start_ms (int, default 0), video_end_ms (int, nullable),
-- lineup_image_url (text, nullable)  -- static screenshot for overlay,
-- description (text), setpos_text (text, nullable),
-- author_profile_id (uuid, nullable fk -> user_profiles.id),
-- status: 'published' | 'draft' (CHECK; MVP seeds only published; future moderation uses draft/pending),
-- pro_verified (boolean, default false), intradark_verified (boolean, default false),
-- created_at, updated_at
-- Indexes: (map_id), (map_id, grenade_type), (map_id, side), (land_spot_id) for clustering queries
```

**FK-only geometry rule:** **No** `radar_x` on **`utility_lineups`**. If a position is missing from **`utility_map_spots`**, **insert** a new spot row, then reference it.

### RLS (sketch)

| Policy area | Audience | Rule |
|-------------|----------|------|
| `utility_maps` read | `anon`, `authenticated` | `SELECT` where **`is_active = true`** |
| `utility_map_spots` read | `anon`, `authenticated` | `SELECT` rows whose **`map_id`** references an **active** map |
| `utility_lineups` read | `anon`, `authenticated` | `SELECT` where **`status = 'published'`** |
| Writes | — | **MVP:** no **`INSERT`/`UPDATE`/`DELETE`** for anon/auth via RLS (lineups edited via **service role** / SQL migrations / future staff actions). When community submit ships, add **`INSERT`** for authenticated + **`status='pending'`** and staff policies. |

After substantive DDL on the intradark Supabase project, run **`get_advisors`** (security/performance) and resolve any **must-fix** items before relying on the policies in production.

### Migration ownership

- **Path:** `apps/intradark/drizzle/0005_utility_maps_lineups.sql` (name finalized in implementation; **next** numeric prefix after `0004_news_articles.sql`).
- **Pattern:** **App-owned** default (**ARCHITECTURE.md §8.1**). Not a packaged module template (**§8.3** case 5 does not apply — persistent schema exists).
- **Remote apply:** Implementation applies DDL through Supabase **`apply_migration`** (`name` + `query`) on the **intradark** project **in the same order** as committed SQL under **`apps/intradark/drizzle/`**. Optionally run **`generate_typescript_types`** if the team regenerates Supabase client types after schema changes.
- **Backfill:** Optional **seed** migration or ops playbook SQL for dev/staging (maps + a few spots + sample lineups); production can start **empty** with honest UI.

### Generated types

Update **`apps/intradark/server/db/schema.ts`** (Drizzle source of truth in this app) in the same change as the migration. If the project also checks in Supabase-generated types, regenerate per local workflow after **`apply_migration`**.

## 5. API surface

| Operation | Surface | Path / name | Auth | Notes |
|-----------|---------|-------------|------|-------|
| List active maps | **Server Component** + Drizzle | `/utility` `page.tsx` | none | Order by `sort_order`, name |
| Load map + spots + filtered lineups | **Server Component** + Drizzle | `/utility/[mapSlug]/page.tsx` | none | Parse + **coerce** `searchParams`; `notFound()` if map missing/inactive |
| Cluster markers | **pure function** (unit-tested) | imported by `page` or child server component | none | Group by `land_spot_id`, join spot coords |
| Open lineup detail | **client island** | e.g. `utility-lineup-detail.tsx` | none | Props from server or minimal client state; **no** secret keys |

**Mutations (deferred):** future **Server Actions** for staff/community will validate with **Zod**, re-check **roles** server-side, and map failures to **[`flows.md`](flows.md)**.

### Validation

- **Input:** Zod (or equivalent) for **`searchParams`** normalization in a colocated module under **`entities/utility-lineups/lib/`**.
- **Output:** Every server failure mode maps to a row in **[`flows.md`](flows.md)** §2.

## 6. UI composition

```
apps/intradark/
├── app/(main)/utility/
│   ├── page.tsx                 # Map list — Server Component
│   ├── [mapSlug]/
│   │   ├── page.tsx             # Radar + filters — Server Component (+ optional client islands)
│   │   ├── loading.tsx
│   │   └── error.tsx            # Retry for transient/server errors
│   ├── loading.tsx              # optional
│   └── error.tsx                # optional segment boundary
├── entities/utility-lineups/
│   ├── components/              # Radar shell, sidebar filters, markers, detail overlay
│   ├── lib/                     # normalizeUtilitySearchParams, clusterLineupsByLandSpot, enums
│   └── types.ts                 # public props / DTOs if needed
├── server/db/schema.ts          # Drizzle tables (mirror migration)
└── components/                  # Shell only — do NOT add atomic UI here
```

### Component map

| UI need | Source | Notes |
|---------|--------|-------|
| Buttons, toggles, sheet/dialog, scroll | `@workspace/ui` | Compose; do not fork primitives |
| Radar image + absolutely positioned markers | `entities/utility-lineups/components/` | **Responsive** container; markers use **percent** positions from spot **0–1** coords |
| YouTube embed | `entities/...` wrapper | Use **privacy-enhanced** embed URL builder; **restrict** to `youtube.com` / `youtu.be` host allowlist |

### Theming

- Tokens from **`@workspace/ui`** (**§6**). Product-specific tweaks only through existing **`globals.css`** import order if needed.

## 7. Dependencies

### Existing packages used

- **`@workspace/ui`** — layout, buttons, toggles, sheet/dialog, typography.
- **`drizzle-orm`** — already used by the app for reads/writes server-side.

### New external deps

- **None required** for MVP if embed + images use URLs only. Optional **`zod`** if not already a dependency (prefer existing validation stack in the app).

### New package edges

- **None** (**§10** not triggered).

## 8. Implementation order (commits)

Granular conventional commits per [commit-organizer](../../../../.cursor/skills/commit-organizer/SKILL.md). Each commit should leave the tree green.

1. `docs(intradark): plan utility-lineups feature` — this triad (if not landed first).
2. `feat(intradark): add utility maps/spots/lineups migration` — DDL + RLS + indexes; **`apply_migration`** on intradark Supabase; **`get_advisors`** follow-up.
3. `feat(intradark): drizzle schema utility lineups` — `server/db/schema.ts` updates.
4. `test(intradark): utility lineups search param + clustering helpers` — Vitest from [`tdd.md`](tdd.md).
5. `feat(intradark): utility map list and map page shell` — routes + `entities/utility-lineups` radar/sidebar/markers (read path).
6. `feat(intradark): utility lineup detail overlay` — screenshot + iframe + metadata copy.
7. `feat(intradark): utility loading and error boundaries` — align with [`flows.md`](flows.md).
8. `chore(intradark): telemetry hooks for utility lineups` — optional `track()` calls.
9. `docs(intradark): mark utility-lineups MVP complete` — flip **Status** in this file when shipped.

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| *(page views)* | route navigations | automatic | Vercel Web Analytics (existing `<Analytics />`) |
| `utility_map_view` | `/utility/[mapSlug]` success render | `{ map_slug }` | optional `track()` |
| `utility_lineup_open` | user opens detail for one lineup | `{ map_slug, lineup_id, grenade_type?, side? }` | optional `track()` |

## 10. Rollout

- **Feature flag:** **none** — routes go live when code merges; empty DB shows **honest empty states**.
- **Env vars:** **none** required for MVP if media are absolute HTTPS URLs. If radar/screenshots move to **Supabase Storage**, document **`NEXT_PUBLIC_SUPABASE_URL`** (already present) and bucket **public** policy in a follow-up commit.
- **Migration sequencing:** merge **SQL** + Drizzle first; **`apply_migration`** to intradark Supabase **before** or **with** deploy that expects the tables (same order as **`apps/intradark/drizzle/`**).
- **Backout:** revert app deploy; DB rollback only via **paired down migration** if the team maintains reversals — otherwise **manual** table drop in non-prod and **forward-fix** in prod (document in runbook).

## 11. Open questions

- [ ] **Screenshot hosting:** all **HTTPS hotlinks** vs **Supabase Storage** bucket — owner: intradark maintainers, due: first content import.
- [ ] **YouTube Shorts** vs standard watch URLs — normalize in one helper; owner: implementer, due: implementation PR.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
- Prior art (tone): [`../news/plan.md`](../news/plan.md)

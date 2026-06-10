# Players directory & profiles

> **Product:** `apps/intradark`
> **Slug:** `players-directory-profiles`
> **Status:** Planned
> **Owner:** intradark
> **Created:** 2026-06-08

## 1. Summary

Every CS2 player gets a rich intradark profile at `/players/<identifier>` aggregating their public stats from **Steam** (Web API), **Faceit** (Data API), **Leetify** (public JSON API), and their **in-game badges/medals/ranks** pulled from the **CS2 Game Coordinator** via a long-lived Steam bot worker. A visitor can look a player up by Steam profile URL, SteamID64, Faceit nickname, or intradark `@username`. On visit, the page renders the **archived** copy from our database first, then triggers per-source fetches that refresh and **live-update** each panel as data arrives. All fetched data is stored append-only (historical archive) keyed by SteamID64; rows for players who are not (yet) intradark members simply have a `NULL` account mapping and wait to be claimed automatically when that SteamID links an intradark account.

## 2. Scope

### In scope (MVP)

- Identifier resolver + canonical redirect (`@username` for linked members, `steamid64` otherwise).
- Per-source fetch + append-only archive for Steam, Faceit, Leetify.
- CS2 badge/medal/rank ingestion via a new Game Coordinator bot worker (`apps/intradark/cs2-gc-bot/`).
- DB-first render with per-panel live update (React Query for HTTP sources, Supabase Realtime for GC).
- Staleness TTLs (Steam 24h, Faceit 6h, Leetify 6h, GC 24h) + rate-limited manual "Refresh".
- `/players` directory index: resolver search bar + list of claimed/recently-fetched players.
- Automatic account mapping by `steamid64` ↔ `user_profiles.steam_profile_id` (incl. backfill on Steam link).

### Out of scope (deferred)

- **CSStats (csstats.gg)** — no official API; HTML scraping behind Cloudflare is too fragile for MVP. The existing `CSStatsProfile` type and hook are left dormant until a reliable source exists.
- **Member privacy / opt-out** — all profiles are public in MVP (the external data is already public). A `user_profiles.preferences` toggle can be added later.
- **Deep match-history analytics** (per-round, heatmaps, demo parsing) — Phase 2+ per [docs/roadmap.md](../../../docs/roadmap.md).
- **GSI live in-match overlay** — `/api/cs2/events` stays a hardened ingest stub; the GC bot (not GSI) is the badge source.

### Non-goals

- This feature is not a real-time scoreboard or anti-cheat system.
- It does not become a shared cross-product service; data stays in the intradark Supabase project (`ARCHITECTURE.md` §8.1).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md). All decisions below must hold.

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/intradark` only (no real second consumer) | §3.2, §5.1 |
| Domain code location | `apps/intradark/entities/players/` (extend existing) + route-colocated page UI | §7.1 |
| Shell vs domain | Profile/panel composition in `entities/players/`; no new atomic UI in `components/` | §7.1 |
| Auth dependency | Route handlers + bot worker use `@workspace/supabase` / service role via `utils/supabase/*`; client UI never imports Supabase directly | §3.2 |
| New package edges | **None** | §3.2, §10 |
| Data ownership | App-owned migrations in `apps/intradark/drizzle/`, applied to the intradark Supabase project | §8.1 |

> "New package edges" is empty, so **[ARCHITECTURE.md](../../../../../ARCHITECTURE.md) is NOT modified** by this feature.

### Long-lived worker placement

The GC bot is a Node process **outside** Next.js, mirroring the existing [`apps/intradark/discord-bot/`](../../../discord-bot/index.ts) pattern (`index.ts` + `http-server.ts`, started via a new `pnpm cs2-gc-bot` script, env from `.env.local`). It is product infrastructure for `apps/intradark` only and imports no other app (§3.1).

## 4. Data model

Keyed by `steamid64` (BIGINT) throughout, matching the existing [`steam_profiles`](../../../supabase/migrations/20241201000000_create_steam_profiles.sql) PK. New snapshot tables are **append-only** (history retained); "current" = newest `fetched_at` per `(steamid64, source)`.

### Tables / columns

```sql
-- players registry: one row per known steamid64; nullable mapping to an intradark account.
CREATE TABLE IF NOT EXISTS public.players (
    steamid64        BIGINT PRIMARY KEY,
    user_profile_id  UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    -- resolver aliases captured at fetch time for search + canonicalization
    steam_vanity     VARCHAR(255),
    faceit_player_id UUID,
    faceit_nickname  VARCHAR(255),
    first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_fetched_at  TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_players_user_profile_id ON public.players(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_players_faceit_nickname ON public.players(LOWER(faceit_nickname));
CREATE INDEX IF NOT EXISTS idx_players_steam_vanity ON public.players(LOWER(steam_vanity));

-- Faceit snapshot (append-only)
CREATE TABLE IF NOT EXISTS public.player_faceit_snapshots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    steamid64   BIGINT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE,
    fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- parsed convenience columns
    faceit_elo  INTEGER,
    skill_level INTEGER,
    region      VARCHAR(16),
    nickname    VARCHAR(255),
    -- full raw response for forward-compat
    raw         JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_faceit_snap_latest ON public.player_faceit_snapshots(steamid64, fetched_at DESC);

-- Leetify snapshot (append-only)
CREATE TABLE IF NOT EXISTS public.player_leetify_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    steamid64       BIGINT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    leetify_rating  NUMERIC,
    aim             NUMERIC,
    positioning     NUMERIC,
    utility         NUMERIC,
    games_played    INTEGER,
    raw             JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leetify_snap_latest ON public.player_leetify_snapshots(steamid64, fetched_at DESC);

-- CS2 Game Coordinator snapshot (append-only): medals, coins, ranks, commendations, level
CREATE TABLE IF NOT EXISTS public.player_cs2_gc_snapshots (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    steamid64        BIGINT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE,
    fetched_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    player_level     INTEGER,         -- private rank
    cmd_friendly     INTEGER,
    cmd_teaching     INTEGER,
    cmd_leader       INTEGER,
    vac_banned       BOOLEAN,
    medals           JSONB,           -- PlayerMedalsInfo (display_items_defidx coins, etc.)
    rankings         JSONB,           -- array of PlayerRankingInfo (mm/wingman/dangerzone)
    raw              JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gc_snap_latest ON public.player_cs2_gc_snapshots(steamid64, fetched_at DESC);

-- GC fetch job queue (Next API enqueues; bot worker drains)
CREATE TABLE IF NOT EXISTS public.player_cs2_gc_jobs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    steamid64    BIGINT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'queued',  -- queued | running | done | error
    error        TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at   TIMESTAMPTZ,
    finished_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_gc_jobs_status ON public.player_cs2_gc_jobs(status, requested_at);
```

`steam_profiles` is reused as the Steam source-of-truth and already supports upsert by `steamid64`. If Steam history is desired later, add a parallel `player_steam_snapshots` table; MVP keeps `steam_profiles` current-only plus `players.last_fetched_at` for staleness.

### RLS

All read-public (external stats are public), writes via service role only — mirrors the existing `steam_profiles` policies.

| Policy | Role | Rule |
|--------|------|------|
| `players_public_read` | `anon`, `authenticated` | `USING (true)` |
| `players_service_write` | `service_role` | `INSERT/UPDATE/DELETE` (service role bypasses RLS; explicit policy documents intent) |
| `*_snapshots_public_read` | `anon`, `authenticated` | `USING (true)` on each snapshot table |
| `*_snapshots_service_write` | `service_role` | writes restricted to service role |
| `gc_jobs_no_public` | `anon`, `authenticated` | no select/insert; managed by service role only |

Realtime: enable replication on `player_cs2_gc_snapshots` so the client can subscribe to new rows (public-read RLS gates the subscription).

### Migration ownership

- **Path:** `apps/intradark/drizzle/0017_players_directory_profiles.sql` (app-owned, §8.1).
- **Pattern:** App-owned migrations; applied to the intradark Supabase project via the `user-supabase-intradark` MCP `apply_migration` (one migration `name` + `query`) in the **same order** as the committed SQL. Split into chunked migrations if a single statement set trips MCP limits (follow the `forums_ddl_chunk_*` precedent in [list_migrations]).
- **Backfill:** one-shot script `apps/intradark/scripts/backfill-players-from-user-profiles.ts` inserts a `players` row (with `user_profile_id`) for every existing `user_profiles.steam_profile_id`.

### Generated types

Regenerate `apps/intradark/types/supabase.ts` (`pnpm gen-types`) after the migration applies; optionally `generate_typescript_types` via MCP. Replace the hand-written shapes in [entities/players/lib/types.ts](../../../entities/players/lib/types.ts) with generated row types where practical.

## 5. API surface

| Operation | Surface | Path / name | Auth | Notes |
|-----------|---------|-------------|------|-------|
| Resolve identifier → canonical | Route Handler | `app/api/players/resolve/route.ts` (or in page server component) | public | order: `@`→username; 17-digit→steamid64; else steam vanity → faceit nickname; returns `{ steamid64, canonicalPath }` |
| Steam vanity → id64 | Route Handler | `app/api/steam/vanity-to-id64/route.ts` | public | `ISteamUser/ResolveVanityURL` with `STEAM_API_KEY`; the existing hook already calls this path |
| Steam profile (DB-first) | Route Handler | `app/api/steam/profile/[id]/route.ts` | public | reuse `utils/steam/profile.ts`; upsert `steam_profiles`; respects 24h TTL via `players.last_fetched_at` |
| Faceit profile (DB-first) | Route Handler | `app/api/faceit/profile/[id]/route.ts` | public | Faceit Data API (`FACEIT_API_KEY`); resolve by steamid64 → player; append `player_faceit_snapshots`; 6h TTL |
| Leetify profile (DB-first) | Route Handler | `app/api/leetify/profile/[id]/route.ts` | public | public Leetify JSON; append `player_leetify_snapshots`; 6h TTL; graceful-degrade if shape changes |
| GC badges enqueue | Route Handler | `app/api/cs2/profile/[id]/route.ts` | public | returns latest `player_cs2_gc_snapshots` row; if stale (24h) or missing, insert `player_cs2_gc_jobs` row + POST bot HTTP control |
| Manual refresh | Route Handler | `app/api/players/[id]/refresh/route.ts` | public, rate-limited | forces re-fetch of all sources; throttle (e.g. 1/5min per IP+steamid) |
| GC badge ingest | Bot worker | `cs2-gc-bot/http-server.ts` `POST /profile` | Bearer `CS2_GC_BOT_HTTP_SECRET` | drains jobs, calls `requestPlayersProfile`, writes snapshot via service role; mirrors [discord-bot/http-server.ts](../../../discord-bot/http-server.ts) (unauthenticated `/health`, 127.0.0.1 bind) |
| GSI ingest (harden) | Route Handler | `app/api/cs2/events/route.ts` | Bearer | replace `dev-secret` with env secret; keep as future live-state ingest, not a badge source |

### Validation

- Input schema: Zod in `entities/players/lib/resolve.ts` (identifier classification) and per-route request validation.
- Error mapping: every thrown/short-circuit path maps to a row in [`flows.md`](flows.md) error table (resolver miss → 404; source down → degraded panel; Faceit 401 → config error; GC bot offline → pending/queued state).

## 6. UI composition

```
apps/intradark/
├── app/(main)/players/
│   ├── page.tsx                      # directory index: search bar + claimed/recent list (replaces stub)
│   ├── [id]/
│   │   ├── page.tsx                  # server: resolve → canonical redirect → render archive
│   │   └── loading.tsx               # skeletons matching panel layout
├── entities/players/
│   ├── components/
│   │   ├── player-profile.tsx        # composition shell (header + panels)
│   │   ├── panels/steam-panel.tsx
│   │   ├── panels/faceit-panel.tsx
│   │   ├── panels/leetify-panel.tsx
│   │   ├── panels/badges-panel.tsx   # GC medals/coins/ranks + Realtime live update
│   │   ├── player-search.tsx         # directory + resolver entry
│   │   └── refresh-button.tsx        # rate-limited manual refresh
│   ├── hooks/
│   │   ├── queries.ts                # existing per-source RQ hooks (point at the new routes)
│   │   └── use-gc-badges.ts          # enqueue + Supabase Realtime subscription
│   ├── lib/
│   │   ├── resolve.ts                # identifier classification + canonicalization
│   │   ├── staleness.ts              # TTL pure functions
│   │   ├── parse-*.ts               # raw→parsed mappers per source
│   │   └── types.ts                  # (existing) align with generated DB types
│   └── model/player-store.ts         # (existing) Zustand cache
└── cs2-gc-bot/                        # NEW long-lived worker (mirrors discord-bot/)
    ├── index.ts                       # steam-user login (steam-totp), gamesPlayed([730]), connect GC
    ├── gc-client.ts                   # requestPlayersProfile wrapper + queue drain
    └── http-server.ts                 # Bearer-guarded control API + /health
```

The existing [`components/organisms/player-profile-mock.tsx`](../../../components/organisms/player-profile-mock.tsx) is replaced by the real `entities/players/components/player-profile.tsx`; keep a thin re-export shim during migration (§7.2) so the `[id]/page.tsx` import stays stable.

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| `Card`, `Tabs`, `Avatar`, `Badge`, `Skeleton`, `Button`, `Input` | `@workspace/ui` | reuse, do not duplicate |
| `PlayerProfile`, source panels, `BadgesPanel` | `apps/intradark/entities/players/components/` | domain composition on top of `@workspace/ui` |

### Theming

- Tokens from `@workspace/ui` (§6). No product override stylesheet needed for this feature.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — Card, Tabs, Avatar, Badge, Skeleton, Button, Input.
- `@workspace/supabase` / `utils/supabase/*` — admin (service-role) client for archive writes; server client for reads. Never imported by `@workspace/ui`.
- `@tanstack/react-query`, `zustand` — already wired in `entities/players`.

### New external deps

- `node-globaloffensive` (or maintained fork `node-cs2`) — GC `requestPlayersProfile`.
- `steam-user` — headless Steam client for the bot worker.
- `steam-totp` — generate Steam Guard codes from `shared_secret`.

> Installed in `apps/intradark` only; used exclusively by `cs2-gc-bot/` (never imported into Next.js client/server bundles).

### Env vars (add to `apps/intradark/env.example`)

- `FACEIT_API_KEY` — Faceit Data API (server-side).
- `STEAM_BOT_USERNAME`, `STEAM_BOT_PASSWORD`, `STEAM_BOT_SHARED_SECRET` — GC bot account (account must OWN CS2).
- `CS2_GC_BOT_HTTP_SECRET` — shared Bearer secret between Next API and the bot HTTP control.
- `CS2_GC_BOT_HTTP_URL` (default `http://127.0.0.1:3848`), optional `CS2_GC_BOT_HTTP_PORT`.
- `CS2_EVENTS_SECRET` — replaces the hardcoded `dev-secret` in `app/api/cs2/events/route.ts`.

### New package edges

- **None.** No `ARCHITECTURE.md` update required (§10).

## 8. Implementation order (commits)

Granular conventional commits per [commit-organizer](../../../../../.cursor/skills/commit-organizer/SKILL.md). Each commit leaves the tree green.

1. `docs(intradark): plan players-directory-profiles feature` — this triad.
2. `feat(intradark): add players + snapshot migrations` — `0017_players_directory_profiles.sql`, RLS, Realtime, regen types; backfill script.
3. `test(intradark): red tests for player resolver + staleness` — from [`tdd.md`](tdd.md) §1.
4. `feat(intradark): player identifier resolver + canonical redirect` — `lib/resolve.ts`, `app/api/players/resolve`, page redirect.
5. `feat(intradark): steam + faceit + leetify DB-first routes` — per-source route handlers + archive upsert/append.
6. `feat(intradark): wire per-source profile panels` — RQ hooks → panels, skeletons, error/degraded states.
7. `feat(intradark): cs2-gc-bot worker + badges pipeline` — worker, HTTP control, jobs queue, `cs2/profile` route, `use-gc-badges` + Realtime.
8. `feat(intradark): players directory index search` — replace stub with search + claimed/recent list.
9. `feat(intradark): manual refresh + auto account mapping` — rate-limited refresh; backfill mapping in steam callback.
10. `chore(intradark): harden cs2/events secret + env.example` — secrets, docs.
11. `docs(intradark): mark players-directory-profiles complete` — flip status.

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| `players.profile.viewed` | Profile mount | `{ steamid64, linked, cache_hit }` | Vercel Analytics |
| `players.source.fetched` | Per-source route resolves | `{ steamid64, source, cache_hit, ms }` | Vercel Analytics / logs |
| `players.gc.enqueued` | GC job created | `{ steamid64 }` | logs |
| `players.gc.updated` | Realtime snapshot received | `{ steamid64, latency_ms }` | logs |
| `players.refresh.clicked` | Manual refresh | `{ steamid64, throttled }` | Vercel Analytics |
| `players.resolve.failed` | Resolver miss | `{ input, reason }` | logs |
| `players.source.failed` | Source error/degraded | `{ steamid64, source, code }` | logs |

## 10. Rollout

- **Feature flag:** none required; the route is additive (directory stub → real). Optionally gate the directory index behind a nav capability later.
- **Env vars:** see §7; the GC bot is optional at first — if `CS2_GC_BOT_HTTP_*` is unset, the badges panel renders a "not available" state and HTTP sources still work.
- **Migration sequencing:** migrate before deploy (expand-only DDL; no destructive changes). Run backfill after migration.
- **Backout:** drop the new tables / revert the route additions; `steam_profiles`/`user_profiles` are untouched structurally, so backout is forward-safe and reversible.

### Steam GC bot-account setup checklist

1. Create a dedicated Steam account (not your personal account).
2. **Purchase/own CS2** on that account (GC connection requires the game in the library).
3. Enable the Steam **Mobile Authenticator** (Steam Guard) on the account.
4. Extract the `shared_secret` (e.g. via Steam Desktop Authenticator export or SDA) → `STEAM_BOT_SHARED_SECRET`.
5. Set `STEAM_BOT_USERNAME` / `STEAM_BOT_PASSWORD`.
6. Optional but recommended: keep the account in a separate Steam family/region; expect Valve rate limits — the jobs queue serializes `requestPlayersProfile` calls.
7. Start the worker: `pnpm cs2-gc-bot`; verify `GET http://127.0.0.1:3848/health` returns `{ ok: true, ready: true }` and `connectedToGC` is logged.

## 11. Open questions

- [ ] Confirm the GC `requestPlayersProfile` reliably returns data for non-friend, offline SteamIDs in the current CS2 build (docs say friend+in-game; community tooling suggests broader access). Owner: intradark, due: before commit 7. Mitigation already planned: queue + graceful "pending/unavailable" badge state.
- [ ] Confirm the current public Leetify endpoint shape (parser is defensive + raw JSONB retained either way). Owner: intradark, due: before commit 5.

## 12. Cross-references

- TDD: [`tdd.md`](tdd.md)
- User flows + error states: [`flows.md`](flows.md)
- Architecture source of truth: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)
- Roadmap entry: [docs/roadmap.md](../../../docs/roadmap.md) (slug `players-directory-profiles`)
- **Child — Leetify ratings fix + season history:** [`../leetify-snapshot-ratings/plan.md`](../leetify-snapshot-ratings/plan.md) — corrects `player_leetify_snapshots.leetify_rating`, adds Premier/season JSONB derived from `raw.games[]`, extends the existing Leetify profile route and player profile UI.

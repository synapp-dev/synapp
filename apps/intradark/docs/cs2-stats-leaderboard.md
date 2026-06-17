# CS2 Deathmatch Stats & Leaderboard — Design

Status: **built** — web side live (steps 1–3); C# plugin scaffolded (step 4)
Owner: TBD
Last updated: 2026-06-18

## Status

- ✅ **Step 1 — DB:** `dm_kill_events` + `dm_player_stats` view (security_invoker,
  RLS public-read, service-role writes) applied to the remote DB
  (`ujunmzeennmbbolmskdd`) and in the repo
  (`drizzle/0030_dm_deathmatch_stats.sql` + supabase mirror + `schema.ts`).
- ✅ **Step 2 — Ingest:** `app/api/cs2/deathmatch/events/route.ts` (bearer
  `CS2_DM_EVENTS_SECRET`, zod batch validation, idempotent upsert). Verified.
- ✅ **Step 3 — Page:** `/leaderboards/deathmatch` + `entities/deathmatch/` +
  sidebar link (Competitive group, under Tournaments). Verified in browser.
- 🟡 **Step 4 — Plugin:** `cs2-deathmatch-stats/` C# CounterStrikeSharp plugin
  scaffolded (SQLite buffer + 15-min flush + batched POST). Not yet compiled/
  tested — builds on the CS2 server. See its README.

To ship: set a real `CS2_DM_EVENTS_SECRET` in `.env.local` + Vercel; build &
install the plugin per `cs2-deathmatch-stats/README.md`.

## Goal

Run our own **deathmatch** stat tracking on Intradark game servers and surface a
**deathmatch leaderboard on the main site**. Capture as much per-event data as
possible, buffer it durably on the game server, and flush it to Intradark in
batches (~every 15 min) so the API is never spammed.

We keep the fun gameplay plugins (CS2-Deathmatch: respawns, `!guns`/`!ak47`
loadout menus, Quake announcer voiceovers for double/triple/godlike) **untouched**.
This feature only *adds* a listener; it never changes how the game feels.

## Hard separation from MatchZy / PUG (explicit requirement)

Deathmatch stats are a **completely separate vertical** from MatchZy/PUG match
stats. They never share tables, routes, secrets, plugins, or leaderboards.

| | Deathmatch (this doc) | MatchZy / PUG (separate, future) |
|---|---|---|
| Tables | `dm_*` | (its own, e.g. `match_*`) |
| API route | `/api/cs2/deathmatch/*` | `/api/cs2/events` (existing GSI/MatchZy sink) |
| Auth secret | `CS2_DM_EVENTS_SECRET` | `CS2_EVENTS_SECRET` |
| Plugin | `cs2-deathmatch-stats/` | (separate / MatchZy itself) |
| Entity | `entities/deathmatch/` | `entities/match-lobby/` etc. |
| Leaderboard | DM leaderboard page | competitive standings (separate) |

**Why this is correct, not just tidy:** a deathmatch kill (free-for-all, instant
respawn, picked loadout via `!guns`) is not comparable to a competitive-round kill.
Pooling them produces a meaningless leaderboard. Keeping them isolated means each
can evolve its own schema, scoring, and retention without entangling the other. The
existing [`/api/cs2/events`](../app/api/cs2/events/route.ts) GSI endpoint is left
**reserved** for the MatchZy/live-state side — deathmatch gets its own route.

## Key insight

CounterStrikeSharp (CSS) lets **multiple plugins run on the same server at once**,
each independently subscribing to the same game events. CS2-Deathmatch hearing
`EventPlayerDeath` to play "Double Kill!" does not stop our plugin from also
hearing `EventPlayerDeath` to tally a kill. So we run a thin, standalone
**stats-emitter plugin alongside** CS2-Deathmatch rather than forking it.

```
CS2 deathmatch server (CounterStrikeSharp)
 ├─ CS2-Deathmatch.dll       ← keep as-is: respawns, !guns, Quake voiceovers
 └─ IntradarkDmStats.dll     ← NEW: listen → buffer to local SQLite → batch POST
                                     │
                                     ▼  (~15 min / on map end)
   POST /api/cs2/deathmatch/events   (Bearer CS2_DM_EVENTS_SECRET, batch payload)
                                     │
                                     ▼
   Postgres (Drizzle): dm_kill_events (raw)  →  dm_player_stats (view)
                                     │
                                     ▼
   /(main) deathmatch leaderboard page  ← ranks players, links to profiles
```

### Why standalone instead of forking CS2-Deathmatch

| | Standalone (chosen) | Fork CS2-Deathmatch |
|---|---|---|
| Update CS2-Deathmatch | Drop-in, no merge | Manual merge forever |
| Stats logic | Own file, full control | Tangled with mod |
| Streak/multi-kill data | Re-derive from raw deaths | Mirror mod's internal state |

We can compute kills, deaths, K/D, headshot %, assists, per-weapon breakdowns, and
even kill streaks **from raw `player_death` events**. We do not need the DM mod's
internal announcer state. Only fork later if we specifically want to track "number
of godlikes" as the mod itself defines them.

## Data approach: log raw, aggregate later

Storage is cheap; un-captured events are gone forever. The plugin captures the
**full event** (not a pre-aggregated stat), and stores the entire untrimmed
payload in a `raw` jsonb column so we never lose a field we didn't model. Any
leaderboard — K/D, HS%, per-weapon, streaks, heatmaps — can be derived later
without re-instrumenting the plugin.

## Buffer locally in SQLite (not in memory)

CS2 servers restart frequently and map changes are common. An in-memory buffer
loses everything on a crash. Instead:

1. On every game event, the plugin writes a row to a **local SQLite file**
   immediately (durable; the game server is the source of truth).
2. A timer (~15 min) **plus** a flush on `map_end` reads `WHERE sent = 0`, POSTs
   the batch, and on `200` marks those rows `sent = 1`.
3. If the API or site is down, nothing is lost — it flushes on the next tick.

## Idempotency (the easy-to-forget part)

Once we batch-and-retry, we risk double-counting: a POST can time out *after* it
actually landed, and the next flush resends the same kills, inflating K/D.

**Fix:** every buffered event gets a stable `event_id` on the plugin side
(`server_id` + monotonic counter, or a UUID). The ingest endpoint upserts on
`event_id` (`onConflictDoNothing`). Retries become free and safe.

---

## How this fits the existing schema (verified against the live DB)

Inspected the intradark Supabase project (`ujunmzeennmbbolmskdd`) via MCP. We
reuse the player-identity tables but add a fully separate `dm_*` namespace for the
stats themselves:

- **`players`** — PK is **`steamid64` (text)**. Canonical player key; ~10 tables
  FK to it. The DM leaderboard keys off the same `steamid64` (read-time join only).
- **`steam_profiles`** — PK `steamid64` (text); holds `personaname`, `avatarfull`,
  country. Where the leaderboard gets display name + avatar.
- **Snapshot convention** — every external-stats table (`player_*_snapshots`) is
  keyed by `steamid64` and carries a `raw jsonb` column. `dm_kill_events` follows
  the same house style.
- **`maps`** — keyed by `id` (uuid) with a `slug` (e.g. `de_mirage`) and
  `display_name`, `game = 'cs2'`. Event `map_name` maps to `maps.slug`.

### Three concrete decisions this forces

1. **Do NOT foreign-key `dm_kill_events` to `players`.** The DM server reports
   *every* connected player, including random pubbers with no `players` row. A hard
   FK would reject those inserts and drop data. Store `attacker_steamid64` /
   `victim_steamid64` as plain `text`, and **LEFT JOIN** to `players` /
   `steam_profiles` at read time. (Optional later: on ingest, upsert a bare
   `players` row for unseen SteamIDs — same idea as `player_cs2_gc_jobs` — so they
   become trackable profiles. Not required for v1.)

2. **RLS is enabled on every table.** New `dm_*` tables need policies:
   - **Ingest** (`/api/cs2/deathmatch/events`) writes with the **service-role**
     key, which bypasses RLS — fine.
   - **Leaderboard read** is public, so `dm_player_stats` / the events table need a
     `select` policy for `anon`/`authenticated`, mirroring how `players` /
     `steam_profiles` read policies are written.

3. **`raw jsonb` is the safety net, by convention.** Storing the full untrimmed
   event means any field we forgot to model is still recoverable.

## Components

### 1. Database — new `dm_*` Drizzle tables in `server/db/schema.ts`

Intradark is Postgres via Drizzle (schema in `server/db/schema.ts`, numbered
migrations in `drizzle/`). Adding tables = edit schema → `drizzle-kit generate`.

> Note: schema is owned by Drizzle, so add these via a Drizzle migration — **not**
> via the Supabase MCP `apply_migration` (that would drift from `schema.ts`). Keep
> the MCP for read-only inspection (`list_tables`, `execute_sql`, `get_advisors`).

**`dm_kill_events`** — the raw deathmatch firehose, one row per game event:

| column | type | notes |
|---|---|---|
| `id` | uuid PK | internal |
| `event_id` | text **UNIQUE** | plugin-supplied idempotency key |
| `server_id` | text | which DM server |
| `map_name` | text | maps to `maps.slug` |
| `event_type` | text | `death` / `hurt` / `connect` / `disconnect` / … |
| `attacker_steamid64` | text | nullable (e.g. world/suicide) |
| `victim_steamid64` | text | nullable |
| `assister_steamid64` | text | nullable |
| `weapon` | text | nullable |
| `headshot` | boolean | nullable |
| `noscope` | boolean | nullable |
| `penetrated` | boolean | nullable |
| `distance` | real | nullable |
| `attacker_pos` | jsonb | `{x,y,z}` nullable |
| `victim_pos` | jsonb | nullable |
| `raw` | jsonb | **entire untrimmed payload** |
| `occurred_at` | timestamptz | from the server clock |
| `ingested_at` | timestamptz | default now() |

Unique index on `event_id` powers the dedupe upsert. Index
`(attacker_steamid64)`, `(victim_steamid64)`, `(map_name)`, `(occurred_at)` for
aggregation/queries. (No `round_number` — deathmatch is roundless; drop it.)

**`dm_player_stats`** — rollup keyed by `steamid64`. LEFT JOINs `steam_profiles`
for `personaname`/`avatarfull` and `players` for the profile link (both keyed by
`steamid64`), so untracked pub players still appear (just without enriched data).

- **Start as a SQL VIEW** over `dm_kill_events` (always correct, zero refresh
  logic): kills = count where attacker = X and event_type = death and attacker ≠
  victim; deaths = count where victim = X; headshots; assists; K/D; HS%.
- Promote to a **materialized view or rollup table** only if/when the view gets
  slow at scale.

### 2. Ingest endpoint — NEW `app/api/cs2/deathmatch/events/route.ts`

A **dedicated, separate** route — not the existing `/api/cs2/events` (that stays
reserved for GSI/MatchZy). Bearer-authed via its own `CS2_DM_EVENTS_SECRET`.

- Accept a **batch** body: `{ serverId, events: [ {...}, {...} ] }`.
- Validate (zod) each event; clamp batch size.
- Bulk `insert(...).onConflictDoNothing({ target: dmKillEvents.eventId })`.
- Return `{ ok: true, inserted, skipped }` so the plugin can log flush results.
- Bearer auth; rate-limit headroom for 15-min batches.

**Endpoint contract (plugin → API):**

```jsonc
POST /api/cs2/deathmatch/events
Authorization: Bearer <CS2_DM_EVENTS_SECRET>
{
  "serverId": "dm-syd-01",
  "events": [
    {
      "eventId": "dm-syd-01:000123",
      "eventType": "death",
      "mapName": "de_mirage",
      "attackerSteamId64": "7656119...",
      "victimSteamId64": "7656119...",
      "assisterSteamId64": null,
      "weapon": "ak47",
      "headshot": true,
      "noscope": false,
      "penetrated": false,
      "distance": 12.4,
      "attackerPos": { "x": 1, "y": 2, "z": 3 },
      "victimPos": { "x": 4, "y": 5, "z": 6 },
      "occurredAt": "2026-06-18T10:00:00Z",
      "raw": { /* full original event */ }
    }
  ]
}
```

### 3. Deathmatch leaderboard page — under `app/(main)/`

- Its own route (e.g. `/leaderboards/deathmatch` or `/deathmatch`), separate from
  any competitive standings.
- Reads `dm_player_stats`; ranks by K/D / kills / HS% (sortable).
- Each row links to the existing player profile (Steam-ID64 keyed).
- Optional: filter by map, by time window, by server.
- Reuses existing player/profile components where possible.

### 4. C# plugin — `apps/intradark/cs2-deathmatch-stats/` (subfolder)

Lives alongside `cs2-gc-bot/` and `discord-bot/`, excluded from the Next build
(it's .NET, built/tested on the CS server). Responsibilities:

- Target CounterStrikeSharp; reference its event types.
- `RegisterEventHandler<EventPlayerDeath>` (and hurt / connect / disconnect / etc.).
- On each event: build the payload, assign `event_id`, write to local SQLite
  (`sent = 0`).
- Timer (~15 min) + `map_end` hook: read unsent rows, POST batch with bearer
  secret, mark `sent = 1` on success, leave for retry on failure.
- Config: API base URL, `CS2_DM_EVENTS_SECRET`, `server_id`, flush interval, batch
  size — via the plugin's config file.

**Events to capture (start generous):**
`player_death`, `player_hurt`, `player_connect_full`, `player_disconnect`.
(No round/bomb events — deathmatch has none.)

---

## Open questions / decisions

- **Env reach:** the DM server must reach the endpoint. Dev = tunnel
  (cloudflared/ngrok) or point at the deployed URL.
- **Bot/human filtering:** decide whether to drop BOT SteamIDs at ingest or
  display time (DM servers often run with bots).
- **Session grouping:** do we want a `dm_sessions` concept later (per-map-rotation
  leaderboards) or only all-time? Raw events support either; defer.
- **Retention:** raw firehose grows fast. Decide retention / archival once we see
  real volume.

## Build order (when greenlit)

1. `dm_kill_events` table + `dm_player_stats` view + RLS read policy → Drizzle
   migration. *(buildable & verifiable on web)*
2. New `/api/cs2/deathmatch/events` route: batch idempotent upsert + zod validation.
3. Deathmatch leaderboard page.
4. `IntradarkDmStats` CounterStrikeSharp plugin (starting point; built/tested on
   the CS server).

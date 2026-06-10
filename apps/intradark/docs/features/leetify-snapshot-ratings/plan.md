# Leetify snapshot ratings & season history

> **Product:** `apps/intradark`
> **Slug:** `leetify-snapshot-ratings`
> **Status:** Implemented
> **Owner:** intradark
> **Created:** 2026-06-09
> **Parent:** [`players-directory-profiles`](../players-directory-profiles/plan.md) — extends the Leetify archive slice of player profiles.

## 1. Summary

Fix incorrect Leetify rating storage on `player_leetify_snapshots` (today `leetify_rating` sums CT+T fractions instead of using Leetify’s flat `recentGameRatings.leetify`), add **Premier rating** and a **per-season rank summary** derived from the archived `games[]` payload (matching Leetify’s public profile season cards), and surface the data on the player profile via the existing Leetify API route and new UI components.

## 2. Scope

### In scope (MVP)

- Fix `parseLeetify` / `normalizeLeetify` so overall Leetify rating uses the flat API field (not CT+T sum).
- Migration `0023`: add `premier_rating INTEGER`, `season_ranks JSONB` to `player_leetify_snapshots`.
- New `parse-leetify-seasons.ts`: bucket CS2 games into Valve Premier seasons; compute match count, win rate, Premier min/max/current, Competitive min/max (numeric).
- Extend `archiveLeetify` insert + `LeetifyView` response on `GET /api/leetify/profile/[id]`.
- On cache hit, re-derive `premier_rating` / `season_ranks` from stored `raw` when columns are null (pre-migration rows).
- Fix `LeetifyRatingsCard` overall rating display.
- New `LeetifySeasonHistoryCard` on `player-profile.tsx` (Leetify-style season grid; Premier badges via `PremierEloBadge`; Competitive as numeric min/max).

### Out of scope (deferred)

- **PlayerHeader Premier badge** — still hardcoded placeholder; wire in a follow-up.
- **FACEIT row in season cards** — Faceit stats come from the Faceit archive in a separate feature; do not parse/store FACEIT min/max in `season_ranks`.
- **Competitive rank icons** — numeric ranks only in MVP; icon assets later.
- **Batch backfill job** — lazy via TTL refresh, manual refresh, and on-read re-derive from `raw`.
- **Telemetry** — no new events this slice (parent feature defines `players.source.*` for a later pass).

### Non-goals

- Re-fetch or re-host Leetify match history beyond what the public v3 profile API already returns.
- Cross-product shared package for season parsing (single consumer: intradark).

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/intradark` only | §3.2, §5.1 |
| Domain code location | `entities/players/lib/` (parsers) + `entities/players/components/` (UI) | §7.1 |
| Shell vs domain | Reuse `components/atoms/premier-elo-badge.tsx`; season UI in `entities/players/` | §7.1 |
| Auth dependency | Route + `archiveLeetify` via `@workspace/supabase` admin client; client uses fetch only | §3.2 |
| New package edges | **None** | §3.2, §10 |

> **ARCHITECTURE.md is NOT modified** by this feature.

## 4. Data model

Live intradark Supabase (verified 2026-06-09): `player_leetify_snapshots` exists with columns `id`, `steamid64` (TEXT), `fetched_at`, `leetify_rating`, `aim`, `positioning`, `utility`, `games_played`, `raw`. Remote migrations latest: `0022_teams_player_teams`. App-owned SQL next: `apps/intradark/drizzle/0023_leetify_snapshot_premier_seasons.sql`.

### Tables / columns

```sql
-- Expand-only alter on existing append-only archive
ALTER TABLE public.player_leetify_snapshots
  ADD COLUMN IF NOT EXISTS premier_rating INTEGER,
  ADD COLUMN IF NOT EXISTS season_ranks JSONB;

COMMENT ON COLUMN public.player_leetify_snapshots.leetify_rating IS
  'Flat Leetify rating fraction from recentGameRatings.leetify (NOT ct+t sum).';

COMMENT ON COLUMN public.player_leetify_snapshots.premier_rating IS
  'Latest Premier CS Rating (skillLevel) from most recent Premier game in raw.games.';

COMMENT ON COLUMN public.player_leetify_snapshots.season_ranks IS
  'Derived per-season summary from raw.games — see parse-leetify-seasons.ts.';
```

### `season_ranks` JSON shape

```json
{
  "currentPremier": 26715,
  "seasons": [
    {
      "id": "s4",
      "label": "Season Four",
      "start": "2026-01-21",
      "end": "2026-07-20",
      "matches": 260,
      "winRate": 0.66,
      "premier": { "min": 25404, "max": 29145, "current": 26715 },
      "competitive": { "min": 13, "max": 16 }
    }
  ]
}
```

No `faceit` key in MVP.

### Game classification (from `docs/leetify-profile.json` analysis)

| Mode | Filter | Rank field |
|------|--------|------------|
| Premier | `dataSource === 'matchmaking' && rankType === 11 && isCs2` | `skillLevel` (≥ ~5000) |
| Competitive | `(dataSource === 'matchmaking' && rankType === 12 && isCs2) \|\| dataSource === 'matchmaking_competitive'` | `skillLevel` (1–18) |
| Season bucket | `gameFinishedAt` vs `PREMIER_SEASONS` date table | — |

Validated against reference profile (`76561197998479808`): Season Four 260 matches / 66% WR / Premier 25404–29145 matches Leetify screenshot.

### Premier season calendar (code constant)

| id | label | start (inclusive) | end (exclusive) |
|----|-------|-------------------|-----------------|
| `beta` | Beta Season | 2023-09-01 | 2023-09-27 |
| `s1` | Season One | 2023-09-27 | 2025-01-28 |
| `s2` | Season Two | 2025-01-28 | 2025-07-15 |
| `s3` | Season Three | 2025-07-15 | 2026-01-21 |
| `s4` | Season Four | 2026-01-21 | 2026-07-20 |

Add Season Five in code when Valve publishes dates (~Jul 2026); no migration required.

### RLS

Unchanged — existing policies on `player_leetify_snapshots`:

| Policy | Role | Rule |
|--------|------|------|
| `leetify_snap_public_read` | anon, authenticated | `USING (true)` SELECT |
| (writes) | service_role | via admin client only |

### Migration ownership

- **Path:** `apps/intradark/drizzle/0023_leetify_snapshot_premier_seasons.sql`
- **Pattern:** App-owned (§8.1)
- **Backfill:** None — lazy via fetch + on-read re-derive from `raw`

### Generated types

After applying migration locally and remotely:

1. Regenerate `apps/intradark/types/supabase.ts` (`generate_typescript_types` on intradark Supabase project).
2. Implementation applies DDL through **`apply_migration`** (`name` + `query`) on the intradark Supabase project **in the same order** as `apps/intradark/drizzle/0023_*.sql` (per ARCHITECTURE.md §8.1).

## 5. API surface

| Operation | Surface | Path | Auth | Notes |
|-----------|---------|------|------|-------|
| Leetify profile (DB-first) | Route Handler | `app/api/leetify/profile/[id]/route.ts` | public | Returns extended `LeetifyView`; no new route |
| Manual refresh | Route Handler | `app/api/players/[id]/refresh/route.ts` | public (rate-limited) | Existing `archiveLeetify({ force: true })` populates new columns |

### Response extensions (`LeetifyView`)

| Field | Type | Source |
|-------|------|--------|
| `rating` | `number \| null` | Flat fraction × 100 for UI (%), from `recentGameRatings.leetify` |
| `premierRating` | `number \| null` | `premier_rating` column or parse from `raw` |
| `seasonRanks` | `SeasonRanksSummary \| null` | `season_ranks` column or parse from `raw` |

### Validation

- Route: existing `isSteamId64(id)` guard.
- Parsers: defensive; never throw on malformed `games[]`.

## 6. UI composition

```
apps/intradark/
├── entities/players/
│   ├── lib/
│   │   ├── parse-leetify.ts              # fix flat rating
│   │   └── parse-leetify-seasons.ts      # NEW
│   ├── components/
│   │   ├── leetify-ratings-card.tsx      # fix overall rating
│   │   ├── leetify-season-history.tsx    # NEW season grid
│   │   └── player-profile.tsx            # mount season card
│   └── lib/server/archive.ts             # insert new columns
├── components/atoms/premier-elo-badge.tsx  # reused (shell atom)
└── app/api/leetify/profile/[id]/route.ts
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Card, Separator | `@workspace/ui` | Season card layout |
| `PremierEloBadge` | `components/atoms/premier-elo-badge.tsx` | Premier min/max badges |
| `LeetifyRatingsCard` | `entities/players/components/` | Fix CT/T/overall switcher |
| `LeetifySeasonHistoryCard` | `entities/players/components/` | Grid: 1 col mobile, 2–3 col `md+` |

### Theming

- Tokens from `@workspace/ui` (§6). Premier badge colors already in `getRankColor`.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — Card, Button, Separator
- `@workspace/supabase` — admin client in `archiveLeetify` only

### New external deps

- None

### New package edges

- None

## 8. Implementation order (commits)

1. `docs(intradark): plan leetify-snapshot-ratings feature` — this triad.
2. `feat(intradark): add leetify snapshot premier/season columns` — `0023` migration + regen types.
3. `test(intradark): leetify season parser red tests` — fixture + failing tests (#1–6 in tdd.md).
4. `fix(intradark): parse flat leetify rating and season ranks` — parsers green.
5. `feat(intradark): archive leetify premier_rating and season_ranks` — `archiveLeetify` + `normalizeLeetify`.
6. `feat(intradark): leetify season history UI` — cards + ratings card fix + profile mount.
7. `docs(intradark): mark leetify-snapshot-ratings complete` — flip status.

## 9. Telemetry

None in this slice (non-goal). Parent [`players-directory-profiles`](../players-directory-profiles/plan.md) §9 defines future `players.source.fetched` events.

## 10. Rollout

- **Feature flag:** none (additive nullable columns + UI).
- **Env vars:** none new (Leetify public API is unauthenticated).
- **Migration sequencing:** apply `0023` before deploy; expand-only, safe online.
- **Remote apply:** `apply_migration` on intradark Supabase matching `drizzle/0023_*.sql`, then `generate_typescript_types`.
- **Backfill:** lazy — TTL refresh, `POST /api/players/[id]/refresh`, on-read re-derive from `raw` when new columns null.
- **Season calendar maintenance:** code change in `parse-leetify-seasons.ts` when Season 5 dates are announced.
- **Backout:** columns nullable; UI hides when null; `raw` archive untouched.

## 11. Open questions

- [ ] Add Competitive rank icon map (skill level → asset) — owner: intradark, due: post-MVP UI polish.
- [ ] Wire `PlayerHeader` `PremierEloBadge` to `premierRating` — owner: intradark, due: follow-up slice.

## 12. Cross-references

- Parent: [`../players-directory-profiles/plan.md`](../players-directory-profiles/plan.md)
- Reference payload: [`../../../docs/leetify-profile.json`](../../../docs/leetify-profile.json)
- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)

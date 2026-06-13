# Veritas player legitimacy score (Phase 1)

> **Product:** `apps/intradark`
> **Slug:** `veritas-legitimacy`
> **Status:** Implemented (Phase 1)
> **Owner:** intradark
> **Created:** 2026-06-11
> **Algorithm spec:** [`docs/veritas-algorithm.md`](../../veritas-algorithm.md)
> **Parent context:** [`players-directory-profiles`](../players-directory-profiles/plan.md) — external stats archive + profile UI already ship; this feature adds the legitimacy scorer and header UX on top.

## 1. Summary

Compute a **0–100 player legitimacy score** (“Veritas”) from archived Steam, Leetify, FACEIT, and CS2 GC data — centered on **anti-cheat plausibility** (earned-skill coherence), with establishment, corroboration, and integrity penalties as supporting axes. Persist one current row per `steamid64`, recompute whenever upstream snapshots or Steam enrichment change, and show a one-glance summary on the player profile header (tier, drivers, confidence) with a Sheet for per-axis breakdown. **Community karma (axis D) is stubbed at 0** until Phase 2.

## 2. Scope

### In scope (MVP — Phase 0 finish + Phase 1)

- **Pure scoring lib** at `entities/players/lib/legitimacy/` — normalization, coherence (`max(0, S−E)`), axis aggregation, penalties, confidence shrink-to-prior (~50), tier mapping.
- **Steam enrichment** on `steam_profiles`: GetPlayerBans, GetOwnedGames (CS2 hours), GetSteamLevel/GetBadges (badge count, years-of-service signals), friends count; fix `archiveSteam` to surface real `player_level` / `friends_count` (today hardcoded to 0).
- **Leetify input** for scorer: read latest `player_leetify_snapshots.raw` for `games[]` (temporal anomaly, `hasBannedPlayer`, party size) plus parsed columns.
- **FACEIT depth** (MVP): elo/level from latest snapshot; parse match-count / account-age from `raw` when present (defensive).
- **Table** `player_legitimacy_scores` — upsert current row per player (`score`, `tier`, `confidence`, `breakdown` jsonb, `computed_at`).
- **Recompute orchestration** — `recomputeLegitimacy(steamid64)` called after fresh writes in `archiveSteam`, `archiveFaceit`, `archiveLeetify`, `POST /api/players/[id]/refresh`, and CS2 GC bot after `player_cs2_gc_snapshots` insert. Failures logged; never block archive.
- **Read API** — `GET /api/players/[id]/legitimacy` (public, DB-first).
- **UI** — replace placeholder `veritas-summary.tsx` with `legitimacy-summary.tsx` in header slot: score + tier + top drivers/flags + confidence chip; Sheet for full breakdown. `useGetLegitimacyScore` React Query hook.
- **Telemetry** — client `player_legitimacy_breakdown_opened`; server `player_legitimacy_recomputed` (tier, confidence_band, coverage_bucket; no PII).
- **Rollout kill-switch** — `LEGITIMACY_SCORING_ENABLED` (default `true`); when `false`, skip recompute and hide legitimacy card.
- **Vitest** — fixture-driven unit tests for every pure function; integration for RLS + upsert.

### Out of scope (deferred)

- **Community karma (Phase 2)** — [`community-karma/plan.md`](community-karma/plan.md): `player_trust_events`, vouch/report actions, sybil-resistant aggregation.
- **In-platform behavior (Phase 3)** — [`platform-behavior/plan.md`](platform-behavior/plan.md): PUG completion, dodges, platform reports (blocked on sandbox PUG ingest).
- **CSStats** — no reliable API; corroboration axis omits csstats.gg until a source exists.
- **ML calibration** — logistic regression on ban outcomes; hand-tuned weights only in Phase 1.
- **Admin `verified.player` score floor** — open question; not in Phase 1.
- **`player_external_stats` cache table** — redundant with existing append-only snapshots + `steam_profiles`; not created.

### Non-goals

- Not an anti-cheat enforcement system (no auto-ban, no queue kick).
- Not a cross-product package (stays in `apps/intradark` per §5.1).
- Does not replace Leetify/FACEIT/Steam panels — legitimacy is an interpretive layer on archived data.

## 3. Architecture placement

Cites [ARCHITECTURE.md](../../../../../ARCHITECTURE.md).

| Decision | Choice | ARCHITECTURE.md section |
|----------|--------|-------------------------|
| Lives in app vs package | `apps/intradark` only | §3.2, §5.1 |
| Domain code location | `entities/players/lib/legitimacy/` (pure), `entities/players/lib/server/recompute-legitimacy.ts`, `entities/players/components/legitimacy-*.tsx` | §7.1 |
| Shell vs domain | Header composition stays in `entities/players/components/player-header.tsx`; no new atoms in `components/` | §7.1 |
| Auth dependency | Server: `@workspace/supabase` admin client + route handlers; client: fetch/React Query only | §3.2 |
| New package edges | **None** | §3.2, §10 |

> **ARCHITECTURE.md is NOT modified** by this feature.

### Phase composition

| Phase | Folder | Ships |
|-------|--------|-------|
| **0 + 1 (this triad)** | `veritas-legitimacy/` | Scorer, enrichment, persistence, API, header UI |
| **2** | `veritas-legitimacy/community-karma/` | Trust events + karma axis |
| **3** | `veritas-legitimacy/platform-behavior/` | PUG-derived signals + weight recalibration |

## 4. Data model

Keyed by `steamid64` (TEXT), matching [`players`](../../../server/db/schema.ts) and snapshot tables.

### Migration 1 — `0028_steam_profiles_enrichment.sql`

Extend `steam_profiles` (no new cache table):

```sql
ALTER TABLE public.steam_profiles
  ADD COLUMN IF NOT EXISTS vac_banned           BOOLEAN,
  ADD COLUMN IF NOT EXISTS game_banned          BOOLEAN,
  ADD COLUMN IF NOT EXISTS community_banned     BOOLEAN,
  ADD COLUMN IF NOT EXISTS economy_ban          TEXT,
  ADD COLUMN IF NOT EXISTS ban_age_days         INTEGER,
  ADD COLUMN IF NOT EXISTS cs2_playtime_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS badge_count          INTEGER,
  ADD COLUMN IF NOT EXISTS steam_level          INTEGER,
  ADD COLUMN IF NOT EXISTS friends_count        INTEGER,
  ADD COLUMN IF NOT EXISTS enrichment_fetched_at TIMESTAMPTZ;

COMMENT ON COLUMN public.steam_profiles.enrichment_fetched_at IS
  'Last Steam Web API enrichment pull (bans, owned games, badges, friends).';
```

`vac_banned` may also appear on `player_cs2_gc_snapshots`; scorer prefers Steam GetPlayerBans when enrichment is fresh, GC as fallback.

### Migration 2 — `0029_player_legitimacy_scores.sql`

```sql
CREATE TABLE IF NOT EXISTS public.player_legitimacy_scores (
    steamid64    TEXT PRIMARY KEY REFERENCES public.players(steamid64) ON DELETE CASCADE,
    score        SMALLINT NOT NULL CHECK (score >= 0 AND score <= 100),
    tier         TEXT NOT NULL CHECK (tier IN ('suspicious', 'unverified', 'established', 'trusted')),
    confidence   TEXT NOT NULL CHECK (confidence IN ('low', 'med', 'high')),
    coverage     NUMERIC(4,3) NOT NULL CHECK (coverage >= 0 AND coverage <= 1),
    breakdown    JSONB NOT NULL,
    computed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legitimacy_tier ON public.player_legitimacy_scores(tier);
CREATE INDEX IF NOT EXISTS idx_legitimacy_computed_at ON public.player_legitimacy_scores(computed_at DESC);

ALTER TABLE public.player_legitimacy_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legitimacy_public_read" ON public.player_legitimacy_scores;
CREATE POLICY "legitimacy_public_read" ON public.player_legitimacy_scores
  FOR SELECT USING (true);
```

Writes: service role only (no anon/authenticated INSERT/UPDATE policies; matches snapshot write pattern).

### `breakdown` JSON shape (illustrative)

```json
{
  "axes": {
    "plausibility": { "score": 72, "weight": 0.45, "drivers": ["8yr account", "balanced aim/util"] },
    "establishment": { "score": 81, "weight": 0.22 },
    "corroboration": { "score": 65, "weight": 0.15 },
    "karma": { "score": 0, "weight": 0.13, "note": "phase_2" },
    "skill": { "score": 58, "weight": 0.05 }
  },
  "penalties": [{ "code": "private_profile", "points": 12 }],
  "flags": { "positive": ["8-yr account", "FACEIT linked"], "risk": ["private profile"] },
  "coherence": {
    "skillEstimate": 0.82,
    "earnedEstimate": 0.71,
    "suspicion": 0.11
  },
  "inputsPresent": ["steam", "leetify", "faceit", "gc"]
}
```

Exact keys are implementation-defined but must remain stable enough for UI + calibration.

### RLS

| Policy | Role | Rule |
|--------|------|------|
| `legitimacy_public_read` | `anon`, `authenticated` | `SELECT USING (true)` |
| (implicit) | `service_role` | INSERT/UPDATE/DELETE via admin client |

### Migration ownership

- **Path:** `apps/intradark/drizzle/0028_*.sql`, `0029_*.sql` → mirror in `server/db/schema.ts`
- **Pattern:** App-owned (§8.1)
- **Remote apply:** `apply_migration` on intradark Supabase MCP **in the same order** as committed SQL; run `get_advisors` after DDL; `generate_typescript_types` when regenerating client types
- **Backfill:** Lazy — recompute on profile visit, manual refresh, or first snapshot write after deploy. Optional batch script post-ship.

### Generated types

Regenerate `apps/intradark/types/supabase.ts` after migrations apply.

## 5. API surface

| Operation | Surface | Path / name | Auth | Notes |
|-----------|---------|-------------|------|-------|
| Read legitimacy | Route Handler | `GET /api/players/[id]/legitimacy` | public | Returns latest row or `{ success: true, data: null }` if none |
| Recompute | Server helper | `recomputeLegitimacy(steamid64)` | service role | Not a public endpoint; gated by `LEGITIMACY_SCORING_ENABLED` |
| Snapshot refresh | Existing | `POST /api/players/[id]/refresh` | public (rate-limited) | Triggers archive helpers → recompute |
| Per-source archive | Existing | `archiveSteam/Faceit/Leetify` | service | Call recompute after successful fresh write |

### `GET /api/players/[id]/legitimacy` response

```ts
type LegitimacyApiResponse =
  | { success: true; data: LegitimacyScoreRow | null }
  | { success: false; error: string };
```

### Validation

- `id` path param must pass `isSteamId64`
- Invalid id → 400; DB miss → 200 with `data: null` (UI shows Unverified pending)
- Recompute errors → logged; do not surface to client on read path

### `LegitimacyInput` assembly

Server-only `buildLegitimacyInput(steamid64)` reads:

- Latest `steam_profiles` row (incl. enrichment columns + `communityvisibilitystate`, `timecreated`)
- Latest `player_leetify_snapshots` (`raw` + columns)
- Latest `player_faceit_snapshots` (`raw` + columns)
- Latest `player_cs2_gc_snapshots` (`vac_banned`, `player_level`, medals)
- `players.user_profile_id` → `user_profiles` (`discord_user_id`, `is_verified`) when linked

Pure `computeLegitimacy(input)` has no I/O.

## 6. UI composition

```
apps/intradark/
├── app/api/players/[id]/legitimacy/route.ts
├── entities/players/
│   ├── lib/legitimacy/
│   │   ├── types.ts
│   │   ├── normalize.ts
│   │   ├── coherence.ts
│   │   ├── axes/*.ts
│   │   ├── score.ts
│   │   └── *.test.ts
│   ├── lib/server/
│   │   ├── recompute-legitimacy.ts
│   │   ├── build-legitimacy-input.ts
│   │   └── steam-enrichment.ts      # GetPlayerBans, GetOwnedGames, badges, friends
│   ├── hooks/queries.ts             # + useGetLegitimacyScore
│   └── components/
│       ├── legitimacy-summary.tsx   # replaces veritas-summary.tsx
│       ├── legitimacy-breakdown-sheet.tsx
│       └── player-header.tsx        # wire hook + invalidate on refresh
```

### Component map

| Component | Source | Notes |
|-----------|--------|-------|
| Card, Sheet, Badge, Chart tokens | `@workspace/ui` | Tier colors via product CSS vars |
| `LegitimacySummary` | `entities/players/components/` | Compact header card |
| `LegitimacyBreakdownSheet` | `entities/players/components/` | Per-axis 0–100 + signal list |
| Delete `veritas-summary.tsx` | — | Remove dummy radial chart after cutover |

### Tier display (initial thresholds — tune in calibration)

| Tier | Score range (initial) |
|------|------------------------|
| `suspicious` | 0–34 |
| `unverified` | 35–54 |
| `established` | 55–74 |
| `trusted` | 75–100 |

Confidence shrink: `displayScore = coverage * rawScore + (1 - coverage) * 50`.

## 7. Dependencies

### Existing packages used

- `@workspace/ui` — Card, Sheet, Badge, Skeleton, Chart (if score ring retained minimally)
- `@workspace/supabase` — admin client in server/archive/recompute only

### New external deps

- None (Steam Web API endpoints already keyed via `STEAM_API_KEY`)

### Env vars (add to `env.example`)

```bash
# Veritas legitimacy scorer — set false to disable recompute + hide header card
LEGITIMACY_SCORING_ENABLED=true
```

## 8. Implementation order (commits)

1. `test(intradark): add red legitimacy scorer unit tests` — fixtures from `veritas-algorithm.md` edge cases.
2. `feat(intradark): add legitimacy pure scoring lib` — green unit tests.
3. `feat(intradark): migration steam_profiles enrichment` — `0028`, mirror schema, apply remote.
4. `feat(intradark): steam enrichment fetch in archiveSteam` — bans, hours, badges, friends.
5. `feat(intradark): migration player_legitimacy_scores` — `0029`, RLS, types.
6. `feat(intradark): recomputeLegitimacy server helper` — build input + upsert; wire archive/refresh/GC bot.
7. `feat(intradark): GET /api/players/[id]/legitimacy` — integration tests.
8. `feat(intradark): legitimacy summary UI + breakdown sheet` — replace `VeritasSummary`.
9. `feat(intradark): legitimacy telemetry + env kill-switch`.
10. `docs(intradark): mark veritas-legitimacy phase 1 complete`.

## 9. Telemetry

| Event | Trigger | Payload | Destination |
|-------|---------|---------|-------------|
| `player_legitimacy_breakdown_opened` | User opens breakdown Sheet | `{ tier }` | `@vercel/analytics/react` |
| `player_legitimacy_recomputed` | Successful upsert | `{ tier, confidence_band, coverage_bucket }` | `@vercel/analytics/server` |

`confidence_band` / `coverage_bucket`: `low` | `med` | `high`. No `steamid64`.

## 10. Rollout

- **Feature flag:** `LEGITIMACY_SCORING_ENABLED` (server env, default `true`)
- **Migration sequencing:** apply `0028` then `0029` before deploy that calls `recomputeLegitimacy`
- **Backfill:** lazy on profile view / refresh / snapshot write
- **Backout:** set `LEGITIMACY_SCORING_ENABLED=false` — skips recompute, hides card; DB tables remain

## 11. Open questions

- [ ] Exact tier thresholds and axis weights after calibration on labeled profiles — owner: intradark, due: post-ship
- [ ] Admin `verified.player` RBAC floor for pros/staff — owner: intradark, due: Phase 2 or ad-hoc
- [ ] FACEIT match-count source if not in player `raw` payload — owner: intradark, due: during enrichment sprint

## 12. Cross-references

- Algorithm design: [`docs/veritas-algorithm.md`](../../veritas-algorithm.md)
- TDD: [`tdd.md`](tdd.md)
- Flows: [`flows.md`](flows.md)
- Parent: [`players-directory-profiles/plan.md`](../players-directory-profiles/plan.md)
- Phase 2: [`community-karma/plan.md`](community-karma/plan.md) (stub)
- Phase 3: [`platform-behavior/plan.md`](platform-behavior/plan.md) (stub)
- Architecture: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)

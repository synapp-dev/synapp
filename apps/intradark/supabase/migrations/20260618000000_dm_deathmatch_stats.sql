-- Mirrors apps/intradark/drizzle/0030_dm_deathmatch_stats.sql.
-- Idempotent: safe if tables/policies/view already exist (e.g. partial apply via MCP).
-- Deathmatch stats: raw per-event firehose (dm_kill_events) + derived leaderboard
-- view (dm_player_stats). Fully separate from MatchZy/PUG. Keyed by steamid64
-- (text). Public read; writes via service role only. Events table is NOT FK'd to
-- players so untracked pub steamids are never rejected on ingest.

-- 1. dm_kill_events: raw firehose, one row per deathmatch game event.
CREATE TABLE IF NOT EXISTS public.dm_kill_events (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id           TEXT NOT NULL,
    server_id          TEXT NOT NULL,
    map_name           TEXT,
    event_type         TEXT NOT NULL,
    attacker_steamid64 TEXT,
    victim_steamid64   TEXT,
    assister_steamid64 TEXT,
    weapon             TEXT,
    headshot           BOOLEAN,
    noscope            BOOLEAN,
    penetrated         BOOLEAN,
    distance           DOUBLE PRECISION,
    attacker_pos       JSONB,
    victim_pos         JSONB,
    raw                JSONB NOT NULL,
    occurred_at        TIMESTAMPTZ NOT NULL,
    ingested_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS dm_kill_events_event_id_key
  ON public.dm_kill_events (event_id);
CREATE INDEX IF NOT EXISTS idx_dm_kill_events_attacker
  ON public.dm_kill_events (attacker_steamid64);
CREATE INDEX IF NOT EXISTS idx_dm_kill_events_victim
  ON public.dm_kill_events (victim_steamid64);
CREATE INDEX IF NOT EXISTS idx_dm_kill_events_map
  ON public.dm_kill_events (map_name);
CREATE INDEX IF NOT EXISTS idx_dm_kill_events_occurred_at
  ON public.dm_kill_events (occurred_at DESC);

ALTER TABLE public.dm_kill_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm_kill_events_public_read" ON public.dm_kill_events;
CREATE POLICY "dm_kill_events_public_read" ON public.dm_kill_events FOR SELECT USING (true);

-- 2. dm_player_stats: all-time leaderboard rollup, keyed by steamid64.
-- security_invoker=true so the view respects the caller's RLS (avoids the
-- security_definer_view lint); safe since all underlying tables are public-read.
CREATE OR REPLACE VIEW public.dm_player_stats
WITH (security_invoker = true) AS
WITH contributions AS (
  SELECT attacker_steamid64 AS steamid64, 'kill'::text AS kind, headshot
    FROM public.dm_kill_events
   WHERE event_type = 'death'
     AND attacker_steamid64 IS NOT NULL
     AND attacker_steamid64 IS DISTINCT FROM victim_steamid64
  UNION ALL
  SELECT victim_steamid64, 'death'::text, NULL::boolean
    FROM public.dm_kill_events
   WHERE event_type = 'death'
     AND victim_steamid64 IS NOT NULL
  UNION ALL
  SELECT assister_steamid64, 'assist'::text, NULL::boolean
    FROM public.dm_kill_events
   WHERE event_type = 'death'
     AND assister_steamid64 IS NOT NULL
),
agg AS (
  SELECT
    steamid64,
    COUNT(*) FILTER (WHERE kind = 'kill')              AS kills,
    COUNT(*) FILTER (WHERE kind = 'death')             AS deaths,
    COUNT(*) FILTER (WHERE kind = 'assist')            AS assists,
    COUNT(*) FILTER (WHERE kind = 'kill' AND headshot) AS headshot_kills
  FROM contributions
  GROUP BY steamid64
)
SELECT
  a.steamid64,
  sp.personaname,
  sp.avatarfull,
  pl.country_flag,
  (pl.steamid64 IS NOT NULL)                            AS is_tracked,
  a.kills,
  a.deaths,
  a.assists,
  a.headshot_kills,
  ROUND(a.kills::numeric / NULLIF(a.deaths, 0), 2)      AS kd,
  ROUND(100.0 * a.headshot_kills / NULLIF(a.kills, 0), 1) AS hs_pct
FROM agg a
LEFT JOIN public.steam_profiles sp ON sp.steamid64 = a.steamid64
LEFT JOIN public.players        pl ON pl.steamid64 = a.steamid64;

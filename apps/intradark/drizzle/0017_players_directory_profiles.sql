-- Players directory & profiles: registry + append-only per-source snapshots + GC job queue.
-- Keyed by steamid64 (matches public.steam_profiles PK). External stats are public:
-- public read on registry + snapshots, writes via service role only. GC jobs are private.

-- 1. players registry: one row per known steamid64; nullable mapping to an intradark account.
CREATE TABLE IF NOT EXISTS public.players (
    steamid64        BIGINT PRIMARY KEY,
    user_profile_id  UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
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

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "players_public_read" ON public.players;
CREATE POLICY "players_public_read" ON public.players FOR SELECT USING (true);

-- 2. Faceit snapshot (append-only)
CREATE TABLE IF NOT EXISTS public.player_faceit_snapshots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    steamid64   BIGINT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE,
    fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    faceit_elo  INTEGER,
    skill_level INTEGER,
    region      VARCHAR(16),
    nickname    VARCHAR(255),
    raw         JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_faceit_snap_latest ON public.player_faceit_snapshots(steamid64, fetched_at DESC);

ALTER TABLE public.player_faceit_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faceit_snap_public_read" ON public.player_faceit_snapshots;
CREATE POLICY "faceit_snap_public_read" ON public.player_faceit_snapshots FOR SELECT USING (true);

-- 3. Leetify snapshot (append-only)
CREATE TABLE IF NOT EXISTS public.player_leetify_snapshots (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    steamid64      BIGINT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE,
    fetched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    leetify_rating NUMERIC,
    aim            NUMERIC,
    positioning    NUMERIC,
    utility        NUMERIC,
    games_played   INTEGER,
    raw            JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leetify_snap_latest ON public.player_leetify_snapshots(steamid64, fetched_at DESC);

ALTER TABLE public.player_leetify_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leetify_snap_public_read" ON public.player_leetify_snapshots;
CREATE POLICY "leetify_snap_public_read" ON public.player_leetify_snapshots FOR SELECT USING (true);

-- 4. CS2 Game Coordinator snapshot (append-only): medals, coins, ranks, commendations, level
CREATE TABLE IF NOT EXISTS public.player_cs2_gc_snapshots (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    steamid64    BIGINT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE,
    fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    player_level INTEGER,
    cmd_friendly INTEGER,
    cmd_teaching INTEGER,
    cmd_leader   INTEGER,
    vac_banned   BOOLEAN,
    medals       JSONB,
    rankings     JSONB,
    raw          JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gc_snap_latest ON public.player_cs2_gc_snapshots(steamid64, fetched_at DESC);

ALTER TABLE public.player_cs2_gc_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gc_snap_public_read" ON public.player_cs2_gc_snapshots;
CREATE POLICY "gc_snap_public_read" ON public.player_cs2_gc_snapshots FOR SELECT USING (true);

-- 5. GC fetch job queue (Next API enqueues; bot worker drains). Private: no public policies.
CREATE TABLE IF NOT EXISTS public.player_cs2_gc_jobs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    steamid64    BIGINT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'queued',
    error        TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at   TIMESTAMPTZ,
    finished_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gc_jobs_status ON public.player_cs2_gc_jobs(status, requested_at);

ALTER TABLE public.player_cs2_gc_jobs ENABLE ROW LEVEL SECURITY;

-- 6. Realtime: let clients subscribe to new GC snapshot rows (public-read RLS gates it).
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_cs2_gc_snapshots;

-- Faceit-style PUG match & queue data layer (roadmap step 1; docs/pug-system-spec.md §1–§13).
-- This is the backend ledger the spec calls for: "All match state is owned by the backend,
-- not the game server." steamid64 (text) is canonical identity throughout, FK'd to public.players.
--
-- RLS model (matches the rest of the repo): writes via service role only (no write policies).
--   * public-read  — pool/match/result tables, so the web client can subscribe via Realtime
--                    (queue depth, accept phase, live match, history). Faceit shows these publicly.
--   * service-only — game_servers (infra detail incl. RCON refs) and player_queue_cooldowns
--                    (penalty records). RLS enabled with NO policy = only the service role reads.
--
-- Idempotent throughout (IF NOT EXISTS / DROP POLICY IF EXISTS / guarded ALTERs) so partial
-- applies via MCP are safe. RCON secrets NEVER live in the DB — game_servers stores only the
-- NAME of the env var holding the password (see docs security hygiene).

-- ───────────────────────────── 1. player_ratings ─────────────────────────────
-- Internal ELO/MMR per player. Drives §5 team auto-balance and queue banding.
CREATE TABLE IF NOT EXISTS public.player_ratings (
    steamid64      TEXT PRIMARY KEY REFERENCES public.players(steamid64) ON DELETE CASCADE,
    rating         INTEGER NOT NULL DEFAULT 1000,
    peak_rating    INTEGER NOT NULL DEFAULT 1000,
    matches_played INTEGER NOT NULL DEFAULT 0,
    wins           INTEGER NOT NULL DEFAULT 0,
    losses         INTEGER NOT NULL DEFAULT 0,
    last_match_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_ratings_rating ON public.player_ratings (rating DESC);

ALTER TABLE public.player_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "player_ratings_public_read" ON public.player_ratings;
CREATE POLICY "player_ratings_public_read" ON public.player_ratings FOR SELECT USING (true);

-- ───────────────────────────── 2. game_servers ───────────────────────────────
-- CS2 server pool (§8 server assignment). status drives availability; current_match_id
-- is the live booking. rcon_secret_ref is the ENV VAR NAME (never the secret).
-- Service-role only — exposes infra; not public.
CREATE TABLE IF NOT EXISTS public.game_servers (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(120) NOT NULL,
    region            VARCHAR(32),
    host              TEXT NOT NULL,             -- ip/hostname players connect to
    port              INTEGER NOT NULL DEFAULT 27015,
    gotv_port         INTEGER,
    rcon_secret_ref   TEXT,                      -- env var name holding the RCON password
    status            VARCHAR(16) NOT NULL DEFAULT 'offline',
    current_match_id  UUID,                      -- FK to matches added below (circular ref)
    last_heartbeat_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT game_servers_status_chk
      CHECK (status IN ('available','in_use','offline','maintenance'))
);

CREATE INDEX IF NOT EXISTS idx_game_servers_status ON public.game_servers (status);

ALTER TABLE public.game_servers ENABLE ROW LEVEL SECURITY;  -- no policy: service role only

-- ───────────────────────────── 3. matches ────────────────────────────────────
-- One row per PUG. `status` IS the phase state machine (backend-owned):
--   pending_accept → accepted → staging(§6 discord) → configuring(§8 server+map)
--   → awaiting_connect(§9) → live(§10) → completed(§12);  any → cancelled.
-- `seq` is a human-friendly id for shareable /matches/<seq> URLs (§13).
CREATE TABLE IF NOT EXISTS public.matches (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seq              BIGINT GENERATED ALWAYS AS IDENTITY,
    league           VARCHAR(32) NOT NULL DEFAULT 'open',  -- champions|stellaris|genesis|open
    region           VARCHAR(32),
    status           VARCHAR(24) NOT NULL DEFAULT 'pending_accept',
    map              VARCHAR(64),
    server_id        UUID REFERENCES public.game_servers(id) ON DELETE SET NULL,
    accept_deadline  TIMESTAMPTZ,                -- §4 ~30s accept window
    connect_deadline TIMESTAMPTZ,                -- §9 connect timeout
    cancel_reason    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at      TIMESTAMPTZ,
    started_at       TIMESTAMPTZ,
    ended_at         TIMESTAMPTZ,
    CONSTRAINT matches_status_chk CHECK (status IN (
      'pending_accept','accepted','staging','configuring','awaiting_connect','live','completed','cancelled'
    ))
);

CREATE UNIQUE INDEX IF NOT EXISTS matches_seq_key ON public.matches (seq);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches (status);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches (created_at DESC);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "matches_public_read" ON public.matches;
CREATE POLICY "matches_public_read" ON public.matches FOR SELECT USING (true);

-- Now wire the circular FK game_servers.current_match_id → matches.id.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_servers_current_match_fk') THEN
    ALTER TABLE public.game_servers
      ADD CONSTRAINT game_servers_current_match_fk
      FOREIGN KEY (current_match_id) REFERENCES public.matches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ───────────────────────────── 4. match_players ──────────────────────────────
-- Roster + team allocation (§5) + accept state (§4) + lobby/connect tracking (§6/§9).
-- One row per (match, player). team is NULL until allocation.
CREATE TABLE IF NOT EXISTS public.match_players (
    match_id        UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    steamid64       TEXT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE,
    team            INTEGER,                     -- 1|2; NULL until §5 auto-balance
    rating_at_queue INTEGER,                     -- ELO snapshot for balance/audit
    accept_status   VARCHAR(12) NOT NULL DEFAULT 'pending',
    accepted_at     TIMESTAMPTZ,
    discord_joined  BOOLEAN NOT NULL DEFAULT FALSE,  -- §6 moved into team voice
    connected       BOOLEAN NOT NULL DEFAULT FALSE,  -- §9 reported connected on server
    connected_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT match_players_pkey PRIMARY KEY (match_id, steamid64),
    CONSTRAINT match_players_team_chk CHECK (team IS NULL OR team IN (1,2)),
    CONSTRAINT match_players_accept_chk
      CHECK (accept_status IN ('pending','accepted','declined','timeout'))
);

CREATE INDEX IF NOT EXISTS idx_match_players_steamid64 ON public.match_players (steamid64);
CREATE INDEX IF NOT EXISTS idx_match_players_match ON public.match_players (match_id);

ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "match_players_public_read" ON public.match_players;
CREATE POLICY "match_players_public_read" ON public.match_players FOR SELECT USING (true);

-- ───────────────────────────── 5. queue_entries ──────────────────────────────
-- The live queue pool (§2). One active ('searching') row per player at a time.
-- status flips to 'matched' when the worker locks 10 into a match, or 'cancelled'
-- on leave/penalty. Public-read so the client can show & subscribe to pool depth.
CREATE TABLE IF NOT EXISTS public.queue_entries (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    steamid64  TEXT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE,
    league     VARCHAR(32) NOT NULL DEFAULT 'open',
    region     VARCHAR(32),
    party_id   UUID,                             -- group queue (post-MVP): same id = together
    status     VARCHAR(12) NOT NULL DEFAULT 'searching',
    rating     INTEGER,                          -- ELO snapshot at join, for banding
    match_id   UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT queue_entries_status_chk CHECK (status IN ('searching','matched','cancelled'))
);

-- A player may hold only ONE active entry (across all leagues) at a time.
CREATE UNIQUE INDEX IF NOT EXISTS queue_entries_one_active_per_player
  ON public.queue_entries (steamid64) WHERE status = 'searching';
CREATE INDEX IF NOT EXISTS idx_queue_entries_league_status
  ON public.queue_entries (league, status);

ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "queue_entries_public_read" ON public.queue_entries;
CREATE POLICY "queue_entries_public_read" ON public.queue_entries FOR SELECT USING (true);

-- ───────────────────────────── 6. player_queue_cooldowns ─────────────────────
-- Penalty matrix (§4 dodge / abandon). Eligibility (§2) checks for an active row.
-- Service-role only — penalty records are not public.
CREATE TABLE IF NOT EXISTS public.player_queue_cooldowns (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    steamid64  TEXT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE,
    reason     VARCHAR(32) NOT NULL,             -- accept_dodge|no_show|abandon|manual_ban|...
    match_id   UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    strikes    INTEGER NOT NULL DEFAULT 1,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_cooldowns_active
  ON public.player_queue_cooldowns (steamid64, expires_at DESC);

ALTER TABLE public.player_queue_cooldowns ENABLE ROW LEVEL SECURITY;  -- no policy: service role only

-- ───────────────────────────── 7. match_events ───────────────────────────────
-- Append-only raw firehose from MatchZy (§11), correlated by match_id. Mirrors the
-- dm_kill_events pattern: optional event_id for dedupe, full body in `raw`. Public-read
-- so a live scoreboard can subscribe.
CREATE TABLE IF NOT EXISTS public.match_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id    UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    event_id    TEXT,                            -- optional dedupe key from forwarder
    event_type  TEXT NOT NULL,                   -- round_end|player_death|bomb_*|match_end|...
    round       INTEGER,
    payload     JSONB,                           -- normalized fields (winner_side, score, ...)
    raw         JSONB NOT NULL,                  -- exact body as received
    occurred_at TIMESTAMPTZ,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS match_events_event_id_key
  ON public.match_events (event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_match_events_match
  ON public.match_events (match_id, occurred_at);

ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "match_events_public_read" ON public.match_events;
CREATE POLICY "match_events_public_read" ON public.match_events FOR SELECT USING (true);

-- ───────────────────────────── 8. match_results ──────────────────────────────
-- Aggregated outcome (§12), one row per match. winner_team NULL = draw/cancelled.
CREATE TABLE IF NOT EXISTS public.match_results (
    match_id         UUID PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
    winner_team      INTEGER,
    score_team1      INTEGER NOT NULL DEFAULT 0,
    score_team2      INTEGER NOT NULL DEFAULT 0,
    map              VARCHAR(64),
    duration_seconds INTEGER,
    finalized_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT match_results_winner_chk CHECK (winner_team IS NULL OR winner_team IN (1,2))
);

ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "match_results_public_read" ON public.match_results;
CREATE POLICY "match_results_public_read" ON public.match_results FOR SELECT USING (true);

-- ───────────────────────────── 9. match_player_stats ─────────────────────────
-- Per-player post-match line (§13 summary). rating_delta is the ELO change applied
-- to player_ratings for this match (audit trail of the adjustment).
CREATE TABLE IF NOT EXISTS public.match_player_stats (
    match_id       UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    steamid64      TEXT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE,
    team           INTEGER,
    kills          INTEGER NOT NULL DEFAULT 0,
    deaths         INTEGER NOT NULL DEFAULT 0,
    assists        INTEGER NOT NULL DEFAULT 0,
    headshot_kills INTEGER NOT NULL DEFAULT 0,
    damage         INTEGER NOT NULL DEFAULT 0,
    mvps           INTEGER NOT NULL DEFAULT 0,
    rating_delta   INTEGER,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT match_player_stats_pkey PRIMARY KEY (match_id, steamid64),
    CONSTRAINT match_player_stats_team_chk CHECK (team IS NULL OR team IN (1,2))
);

CREATE INDEX IF NOT EXISTS idx_match_player_stats_steamid64
  ON public.match_player_stats (steamid64);

ALTER TABLE public.match_player_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "match_player_stats_public_read" ON public.match_player_stats;
CREATE POLICY "match_player_stats_public_read" ON public.match_player_stats FOR SELECT USING (true);

-- ───────────────────────────── 10. Realtime ──────────────────────────────────
-- Add the live-changing tables to the Realtime publication so the client can subscribe
-- (queue depth, accept phase, lobby phase transitions, live scoreboard). Public-read RLS
-- gates the feed. Idempotent: only add tables not already published.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['queue_entries','matches','match_players','match_events'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

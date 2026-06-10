-- Teams (modelled on the Faceit team schema, sans inline members) + player_teams join table.
-- teams: one row per team; player_teams: many-to-many between players(steamid64) and teams.
-- Public-read RLS (matches players); writes via service role only.

-- 1. teams: one row per team. faceit_team_id holds the external Faceit team_id when imported.
CREATE TABLE IF NOT EXISTS public.teams (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faceit_team_id   UUID,
    name             VARCHAR(255) NOT NULL,
    nickname         VARCHAR(255),
    avatar           TEXT,
    cover_image      TEXT,
    description      TEXT,
    game             VARCHAR(32) NOT NULL DEFAULT 'cs2',
    team_type        VARCHAR(32),
    leader_steamid64 TEXT REFERENCES public.players(steamid64) ON DELETE SET NULL,
    chat_room_id     TEXT,
    faceit_url       TEXT,
    facebook         TEXT,
    twitter          TEXT,
    website          TEXT,
    youtube          TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_faceit_team_id ON public.teams(faceit_team_id) WHERE faceit_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teams_leader_steamid64 ON public.teams(leader_steamid64);
CREATE INDEX IF NOT EXISTS idx_teams_name ON public.teams(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_teams_nickname ON public.teams(LOWER(nickname));

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_public_read" ON public.teams;
CREATE POLICY "teams_public_read" ON public.teams FOR SELECT USING (true);

-- 2. player_teams: membership mapping. role maps to Faceit membership_type (e.g. leader/member).
CREATE TABLE IF NOT EXISTS public.player_teams (
    team_id    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    steamid64  TEXT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE,
    role       VARCHAR(32) NOT NULL DEFAULT 'member',
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT player_teams_pkey PRIMARY KEY (team_id, steamid64)
);

CREATE INDEX IF NOT EXISTS idx_player_teams_steamid64 ON public.player_teams(steamid64);
CREATE INDEX IF NOT EXISTS idx_player_teams_team_id ON public.player_teams(team_id);

ALTER TABLE public.player_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_teams_public_read" ON public.player_teams;
CREATE POLICY "player_teams_public_read" ON public.player_teams FOR SELECT USING (true);

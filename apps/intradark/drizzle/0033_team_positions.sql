-- Player roles/positions (rifler, AWPer, IGL, …) for the Play card + future match rosters.
-- Reconciles "declared default role" with "per-match override" in one table:
--   * match_id IS NULL  → the player's DEFAULT/declared position (what the /play card reads).
--   * match_id = <id>   → a per-match override (post-MVP team-role assignment; no extra migration).
--
-- RLS model mirrors 0032: public-read (so rosters/cards can render & subscribe via Realtime),
-- writes via service role only (no write policy). Idempotent throughout for safe MCP re-applies.
--
-- `position` CHECK is kept in sync with entities/players/lib/positions.ts (POSITION_IDS).

CREATE TABLE IF NOT EXISTS public.team_positions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    steamid64  TEXT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE,
    match_id   UUID REFERENCES public.matches(id) ON DELETE CASCADE,  -- NULL = default/declared role
    position   VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT team_positions_position_chk
      CHECK (position IN ('igl','awper','entry','rifler','support','lurker'))
);

-- One default (match-less) position per player.
CREATE UNIQUE INDEX IF NOT EXISTS team_positions_default_uq
  ON public.team_positions (steamid64) WHERE match_id IS NULL;
-- One position per player per match.
CREATE UNIQUE INDEX IF NOT EXISTS team_positions_match_uq
  ON public.team_positions (match_id, steamid64) WHERE match_id IS NOT NULL;
-- Lookups by match (roster role panel).
CREATE INDEX IF NOT EXISTS idx_team_positions_match
  ON public.team_positions (match_id) WHERE match_id IS NOT NULL;

ALTER TABLE public.team_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_positions_public_read" ON public.team_positions;
CREATE POLICY "team_positions_public_read" ON public.team_positions FOR SELECT USING (true);

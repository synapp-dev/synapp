-- Steam Web API enrichment fields for Veritas legitimacy scoring.
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

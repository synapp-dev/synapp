-- Leetify snapshot: Premier rating + per-season rank summary derived from raw.games[]

ALTER TABLE public.player_leetify_snapshots
  ADD COLUMN IF NOT EXISTS premier_rating INTEGER,
  ADD COLUMN IF NOT EXISTS season_ranks JSONB;

COMMENT ON COLUMN public.player_leetify_snapshots.leetify_rating IS
  'Flat Leetify rating fraction from recentGameRatings.leetify (not CT+T sum).';

COMMENT ON COLUMN public.player_leetify_snapshots.premier_rating IS
  'Latest Premier CS Rating (skillLevel) from the most recent Premier game in raw.games.';

COMMENT ON COLUMN public.player_leetify_snapshots.season_ranks IS
  'Per-season match stats and Premier/Competitive min-max derived from raw.games.';

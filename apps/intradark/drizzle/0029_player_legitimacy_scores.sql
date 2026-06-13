-- Veritas legitimacy score (one current row per player).
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

-- Add URL slug to teams for /teams/[slug]/… routes.
-- Backfill existing rows from name; enforce NOT NULL + unique index.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS slug varchar(160);

DO $$
DECLARE
  r RECORD;
  base_slug text;
  candidate text;
  n int;
BEGIN
  FOR r IN SELECT id, name FROM public.teams WHERE slug IS NULL LOOP
    base_slug := lower(regexp_replace(trim(r.name), '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN
      base_slug := 'team';
    END IF;
    base_slug := left(base_slug, 160);
    candidate := base_slug;
    n := 2;
    WHILE EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.slug IS NOT NULL AND lower(t.slug) = lower(candidate)
    ) LOOP
      candidate := left(base_slug, greatest(1, 160 - length('-' || n::text))) || '-' || n::text;
      n := n + 1;
    END LOOP;
    UPDATE public.teams SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.teams
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_slug ON public.teams (LOWER(slug));

-- Team brand colours for profile header glow, border, and team name accent.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS primary_color varchar(7),
  ADD COLUMN IF NOT EXISTS secondary_color varchar(7);

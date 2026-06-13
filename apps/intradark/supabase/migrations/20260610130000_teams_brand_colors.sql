-- Mirrors apps/intradark/drizzle/0027_teams_brand_colors.sql.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS primary_color varchar(7),
  ADD COLUMN IF NOT EXISTS secondary_color varchar(7);

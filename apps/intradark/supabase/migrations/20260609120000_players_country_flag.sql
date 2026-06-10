-- Mirrors apps/intradark/drizzle/0024_players_country_flag.sql.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS country_flag VARCHAR(2);

COMMENT ON COLUMN public.players.country_flag IS
  'ISO 3166-1 alpha-2 country code for country-flag-icons (Faceit primary, Steam fallback).';

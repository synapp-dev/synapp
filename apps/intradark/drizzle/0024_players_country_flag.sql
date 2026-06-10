-- players registry: ISO 3166-1 alpha-2 country code for profile flag display (e.g. AU, NZ).
-- Populated from Faceit country (primary) or Steam loccountrycode (fallback).

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS country_flag VARCHAR(2);

COMMENT ON COLUMN public.players.country_flag IS
  'ISO 3166-1 alpha-2 country code for country-flag-icons (Faceit primary, Steam fallback).';

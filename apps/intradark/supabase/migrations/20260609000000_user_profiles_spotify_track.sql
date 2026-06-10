-- Mirrors apps/intradark/drizzle/0019_user_profiles_spotify_track.sql.
-- Idempotent: safe if the column/constraint already exist (e.g. partial apply via MCP).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS spotify_track_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_spotify_track_url_format'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_spotify_track_url_format
      CHECK (
        spotify_track_url IS NULL
        OR spotify_track_url ~ '^https://open\.spotify\.com/track/[A-Za-z0-9]{22}$'
      );
  END IF;
END $$;

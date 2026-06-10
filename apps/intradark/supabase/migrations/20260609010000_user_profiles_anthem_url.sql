-- Mirrors apps/intradark/drizzle/0020_user_profiles_anthem_url.sql.
-- Renames spotify_track_url -> anthem_url and widens the CHECK to allow a
-- canonical Spotify track URL or a canonical SoundCloud track URL.
-- Idempotent: safe under partial/repeat apply.

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_spotify_track_url_format;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
      AND column_name = 'spotify_track_url'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
      AND column_name = 'anthem_url'
  ) THEN
    ALTER TABLE public.user_profiles RENAME COLUMN spotify_track_url TO anthem_url;
  END IF;
END $$;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS anthem_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_anthem_url_format'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_anthem_url_format
      CHECK (
        anthem_url IS NULL
        OR anthem_url ~ '^https://open\.spotify\.com/track/[A-Za-z0-9]{22}$'
        OR anthem_url ~ '^https://soundcloud\.com/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+$'
      );
  END IF;
END $$;

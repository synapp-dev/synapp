-- Add an optional Spotify track to user_profiles. Stored as the canonical
-- track URL ("https://open.spotify.com/track/{id}") and rendered as an embedded
-- player on the member's public profile. The CHECK guards the stored shape so a
-- malformed value can never reach the iframe src even if the app parser is
-- bypassed. RLS is unchanged: the existing owner UPDATE policy already covers
-- this column.

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

-- Allow an optional "#t=<seconds>" start offset on a SoundCloud anthem URL so a
-- member can pin playback to a specific moment (e.g. the drop). Spotify shape
-- unchanged. Idempotent: drops then re-adds the format CHECK.

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_anthem_url_format;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_anthem_url_format
  CHECK (
    anthem_url IS NULL
    OR anthem_url ~ '^https://open\.spotify\.com/track/[A-Za-z0-9]{22}$'
    OR anthem_url ~ '^https://soundcloud\.com/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+(#t=[0-9]+)?$'
  );

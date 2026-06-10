-- Optional member social profile links shown on the player header.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS twitch_url text,
  ADD COLUMN IF NOT EXISTS x_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text;

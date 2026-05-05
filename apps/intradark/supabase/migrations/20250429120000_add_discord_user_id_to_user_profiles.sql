-- Discord OAuth snowflake ID (string); nullable until user links Discord.
ALTER TABLE public.user_profiles
  ADD COLUMN discord_user_id TEXT;

CREATE UNIQUE INDEX idx_user_profiles_discord_user_id
  ON public.user_profiles (discord_user_id)
  WHERE discord_user_id IS NOT NULL;

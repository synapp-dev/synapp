-- Fix user_profiles constraint so new users can be created with email only
-- (Steam profile is linked later via steam_profile_id)
ALTER TABLE public.user_profiles
    DROP CONSTRAINT IF EXISTS check_steam_or_username;

ALTER TABLE public.user_profiles
    ADD CONSTRAINT check_steam_or_username_or_email CHECK (
        steam_profile_id IS NOT NULL OR username IS NOT NULL OR email IS NOT NULL
    );

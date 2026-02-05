-- Seed data for Steam auth tables
-- Run after migrations: supabase db reset (includes seed) or psql $DATABASE_URL < supabase/seed.sql

-- steam_profiles: sample row for local development / testing
-- In production, steam_profiles are populated when users sign in with Steam.
INSERT INTO public.steam_profiles (
    steamid64,
    steamid,
    personaname,
    profileurl,
    avatar,
    avatarmedium,
    avatarfull,
    personastate,
    communityvisibilitystate,
    profilestate,
    commentpermission
) VALUES (
    76561198000000000,
    '76561198000000000',
    'Test Steam User',
    'https://steamcommunity.com/profiles/76561198000000000',
    'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg',
    'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg',
    'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
    0,
    3,
    1,
    0
) ON CONFLICT (steamid64) DO NOTHING;

-- user_profiles are created automatically by the trigger on auth.users insert.
-- No seed data needed; they are populated when users sign up (Steam or email).

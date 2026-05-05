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

-- CS2 utility catalog maps (pools from migration 0007). radar_image_url / badge_image_url are
-- left empty until assets are uploaded to intradark-media (e.g. maps/<slug>/radar.*,
-- maps/<slug>/badge.*); re-seed preserves non-empty URLs.
INSERT INTO public.maps (
  game,
  slug,
  display_name,
  pool_id,
  radar_image_url,
  badge_image_url,
  is_active,
  sort_order
)
SELECT
  v.game,
  v.slug,
  v.display_name,
  p.id,
  '',
  '',
  v.is_active,
  v.sort_order
FROM (
  VALUES
    ('cs2'::varchar(32), 'de_mirage'::varchar(128), 'Mirage'::varchar(255), 'active_duty'::varchar(64), true, 0),
    ('cs2', 'de_dust2', 'Dust 2', 'active_duty', true, 10),
    ('cs2', 'de_overpass', 'Overpass', 'active_duty', true, 20),
    ('cs2', 'de_ancient', 'Ancient', 'active_duty', true, 30),
    ('cs2', 'de_inferno', 'Inferno', 'active_duty', true, 40),
    ('cs2', 'de_anubis', 'Anubis', 'active_duty', true, 50),
    ('cs2', 'de_nuke', 'Nuke', 'active_duty', true, 60),
    ('cs2', 'de_train', 'Train', 'reserve', true, 0),
    ('cs2', 'de_vertigo', 'Vertigo', 'reserve', true, 10),
    ('cs2', 'cs_office', 'Office', 'reserve', true, 20)
) AS v(game, slug, display_name, pool_slug, is_active, sort_order)
JOIN public.map_pools p ON p.slug = v.pool_slug
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  pool_id = EXCLUDED.pool_id,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

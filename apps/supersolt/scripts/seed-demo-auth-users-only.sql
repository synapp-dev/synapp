-- =============================================================================
-- Supersolt: create demo auth users only (auth.users + auth.identities)
-- =============================================================================
-- Run in Supabase SQL Editor. Trigger on auth.users fills public.user_profiles.
-- Set cfg_password below. Emails: {first}.{last}@supersoltdemo.com (32 accounts)
-- Safe to re-run: skips if email already exists.
-- If auth.instances is empty, instance_id falls back to 00000000-0000-0000-0000-000000000000 (normal for local).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  cfg_password text := 'SupersoltDemo2026!';

  v_instance_id uuid;
  v_encrypted   text;
  rec record;
  v_email       text;
  v_uid         uuid;
  v_first_slug  text;
  v_last_slug   text;
BEGIN
  -- Prefer project instance; many local / empty DBs have no auth.instances row — use nil UUID (GoTrue default).
  SELECT id INTO v_instance_id FROM auth.instances ORDER BY id LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  v_encrypted := crypt(cfg_password, gen_salt('bf'));

  CREATE TEMP TABLE _roster (
    first_name text NOT NULL,
    last_name  text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _roster (first_name, last_name) VALUES
    ('Alex',      'Chen'),
    ('Olivia',    'Kim'),
    ('Jack',      'Morrison'),
    ('Sam',       'Taylor'),
    ('Jordan',    'Lee'),
    ('Mia',       'Roberts'),
    ('Noah',      'Patel'),
    ('Ella',      'Wang'),
    ('Liam',      'Foster'),
    ('Sophie',    'Tran'),
    ('Chloe',     'Adams'),
    ('Daniel',    'Park'),
    ('Emma',      'Wilson'),
    ('James',     'Nguyen'),
    ('Charlotte', 'Singh'),
    ('William',   'Brown'),
    ('Ava',       'Martinez'),
    ('Henry',     'Garcia'),
    ('Isla',      'Thompson'),
    ('Lucas',     'Anderson'),
    ('Zoe',       'Martin'),
    ('Ethan',     'Lee'),
    ('Lily',      'Campbell'),
    ('Mason',     'Wright'),
    ('Harper',    'Scott'),
    ('Oliver',    'Hughes'),
    ('Amelia',    'Ross'),
    ('Elijah',    'Cooper'),
    ('Grace',     'Kelly'),
    ('Benjamin',  'Fox'),
    ('Hannah',    'Reed'),
    ('Sebastian', 'Cole');

  FOR rec IN SELECT * FROM _roster LOOP
    v_first_slug := lower(regexp_replace(rec.first_name, '[^a-zA-Z0-9]+', '', 'g'));
    v_last_slug  := lower(regexp_replace(rec.last_name,  '[^a-zA-Z0-9]+', '', 'g'));
    v_email := v_first_slug || '.' || v_last_slug || '@supersoltdemo.com';

    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
      CONTINUE;
    END IF;

    v_uid := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new
    ) VALUES (
      v_uid,
      v_instance_id,
      'authenticated',
      'authenticated',
      v_email,
      v_encrypted,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'first_name', rec.first_name,
        'last_name', rec.last_name,
        'full_name', rec.first_name || ' ' || rec.last_name
      ),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_uid,
      v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', v_email),
      'email',
      v_uid::text,
      now(),
      now(),
      now()
    );
  END LOOP;
END $$;

-- List what was created (or already existed)
SELECT u.id, u.email, u.email_confirmed_at, up.full_name
FROM auth.users AS u
LEFT JOIN public.user_profiles AS up ON up.id = u.id
WHERE u.email ILIKE '%@supersoltdemo.com'
ORDER BY u.email;

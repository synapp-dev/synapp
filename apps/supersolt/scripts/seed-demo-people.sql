-- =============================================================================
-- Supersolt: demo people via SQL (Supabase SQL Editor or psql)
-- =============================================================================
-- 1) Set the three values in the CONFIG block below (org slug, venue slug, password).
-- 2) Paste the whole file and run once.
-- 3) Creates auth users + auth.identities, relies on trigger for public.user_profiles,
--    then updates phone and inserts user_organisations + user_venues.
--
-- Emails: {first}.{last}.{venue_slug}.{org_slug}@supersoltdemo.com (non-alnum stripped)
-- Re-run safe: skips existing auth.users by email; still ensures org/venue rows exist.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  -- ----- CONFIG (edit these) -----
  cfg_org_slug   text := 'your-organisation-slug';
  cfg_venue_slug text := 'your-venue-slug';
  cfg_password   text := 'SupersoltDemo2026!';
  -- -------------------------------

  v_instance_id uuid;
  v_org_id      uuid;
  v_venue_id    uuid;
  v_org_slug    text;
  v_venue_slug  text;

  rec record;
  v_email       text;
  v_local       text;
  v_uid         uuid;
  v_uo_id       uuid;
  v_encrypted   text;
  v_role_id     uuid;
  v_uv_role_id  uuid;
  v_first_slug  text;
  v_last_slug   text;
BEGIN
  SELECT id INTO v_instance_id FROM auth.instances ORDER BY id LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  SELECT
    o.id,
    v.id,
    o.slug,
    v.slug
  INTO v_org_id, v_venue_id, v_org_slug, v_venue_slug
  FROM public.venues v
  INNER JOIN public.organisations o ON o.id = v.organisation_id
  WHERE o.slug = cfg_org_slug
    AND v.slug = cfg_venue_slug
    AND v.is_active = true
    AND v.archived_at IS NULL
    AND o.archived_at IS NULL
  LIMIT 1;

  IF v_org_id IS NULL OR v_venue_id IS NULL THEN
    RAISE EXCEPTION 'Venue not found for organisation slug % and venue slug %', cfg_org_slug, cfg_venue_slug;
  END IF;

  v_encrypted := crypt(cfg_password, gen_salt('bf'));

  CREATE TEMP TABLE _demo_roster (
    first_name text NOT NULL,
    last_name  text NOT NULL,
    role       text NOT NULL,
    phone      text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _demo_roster (first_name, last_name, role, phone) VALUES
    ('Alex',    'Chen',     'manager',    '0412 345 678'),
    ('Olivia',  'Kim',      'supervisor', '0423 456 789'),
    ('Jack',    'Morrison', 'supervisor', '0434 567 890'),
    ('Sam',     'Taylor',   'crew',       '0434 567 891'),
    ('Jordan',  'Lee',      'crew',       '0445 678 901'),
    ('Mia',     'Roberts',  'crew',       '0445 678 902'),
    ('Noah',    'Patel',    'crew',       '0456 789 012'),
    ('Ella',    'Wang',     'crew',       '0456 789 013');

  FOR rec IN SELECT * FROM _demo_roster LOOP
    v_first_slug := lower(regexp_replace(rec.first_name, '[^a-zA-Z0-9]+', '', 'g'));
    v_last_slug  := lower(regexp_replace(rec.last_name,  '[^a-zA-Z0-9]+', '', 'g'));
    v_local :=
      v_first_slug || '.' || v_last_slug || '.' ||
      lower(regexp_replace(v_venue_slug, '[^a-zA-Z0-9]+', '', 'g')) || '.' ||
      lower(regexp_replace(v_org_slug,    '[^a-zA-Z0-9]+', '', 'g'));
    v_email := v_local || '@supersoltdemo.com';

    SELECT id INTO v_uid FROM auth.users WHERE email = v_email LIMIT 1;

    IF v_uid IS NULL THEN
      v_uid := gen_random_uuid();

      -- If this fails on your project (unknown column), check auth.users in Dashboard
      -- Table Editor → auth schema and align column names with your Supabase version.
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
    END IF;

    UPDATE public.user_profiles
    SET
      phone = rec.phone,
      updated_at = now()
    WHERE id = v_uid;

    SELECT id INTO v_uo_id
    FROM public.user_organisations
    WHERE user_profile_id = v_uid
      AND organisation_id = v_org_id
      AND archived_at IS NULL
    LIMIT 1;

    -- Platform role UUIDs (public.roles, organisation_id IS NULL) — keep in sync with migration 20260408120000_roles_normalisation.sql
    v_role_id := CASE rec.role
      WHEN 'manager' THEN 'a0000001-0000-4000-8000-000000000003'::uuid
      WHEN 'supervisor' THEN 'a0000001-0000-4000-8000-000000000004'::uuid
      WHEN 'crew' THEN 'a0000001-0000-4000-8000-000000000005'::uuid
      ELSE NULL
    END;
    IF v_role_id IS NULL THEN
      RAISE EXCEPTION 'Unknown demo roster role %', rec.role;
    END IF;

    v_uv_role_id := NULL;
    IF rec.role IN ('manager', 'supervisor') THEN
      v_uv_role_id := v_role_id;
    END IF;

    IF v_uo_id IS NULL THEN
      INSERT INTO public.user_organisations (
        user_profile_id,
        organisation_id,
        role_id,
        is_active,
        joined_at
      ) VALUES (
        v_uid,
        v_org_id,
        v_role_id,
        true,
        now()
      )
      RETURNING id INTO v_uo_id;
    ELSE
      UPDATE public.user_organisations
      SET
        role_id = v_role_id,
        is_active = true,
        updated_at = now()
      WHERE id = v_uo_id;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.user_venues uv
      WHERE uv.user_organisation_id = v_uo_id
        AND uv.venue_id = v_venue_id
        AND uv.archived_at IS NULL
    ) THEN
      INSERT INTO public.user_venues (
        user_organisation_id,
        organisation_id,
        venue_id,
        role_id,
        is_active
      ) VALUES (
        v_uo_id,
        v_org_id,
        v_venue_id,
        v_uv_role_id,
        true
      );
    ELSE
      UPDATE public.user_venues
      SET
        role_id = v_uv_role_id,
        is_active = true,
        updated_at = now()
      WHERE user_organisation_id = v_uo_id
        AND venue_id = v_venue_id
        AND archived_at IS NULL;
    END IF;
  END LOOP;
END $$;

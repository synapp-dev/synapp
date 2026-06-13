-- Completely reset onboarding for a single user (dev / staging only).
--
-- - Clears setup_completed_at so middleware sends them to /setup
-- - Deletes every organisation they belong to (venues, Square/Xero, sync data, etc. cascade)
-- - Does NOT delete auth.users or user_profiles (same login, fresh wizard)
--
-- Run in Supabase SQL Editor (service role / postgres).
-- After running: hard refresh browser, clear site cookies for localhost (especially ss_onboarding_early_sales).

BEGIN;

DO $$
DECLARE
  v_email text := 'soxox76742@doreact.com'; -- fix typo if needed (e.g. dorcact.com)
  v_user_id uuid;
  v_org_ids uuid[];
  v_deleted_orgs int;
BEGIN
  SELECT id
  INTO v_user_id
  FROM public.user_profiles
  WHERE lower(trim(email)) = lower(trim(v_email));

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user_profiles row for email: %', v_email;
  END IF;

  SELECT coalesce(array_agg(DISTINCT uo.organisation_id), '{}'::uuid[])
  INTO v_org_ids
  FROM public.user_organisations uo
  WHERE uo.user_profile_id = v_user_id;

  IF cardinality(v_org_ids) > 0 THEN
    DELETE FROM public.organisations o
    WHERE o.id = ANY (v_org_ids);
    GET DIAGNOSTICS v_deleted_orgs = ROW_COUNT;
  ELSE
    v_deleted_orgs := 0;
  END IF;

  UPDATE public.user_profiles
  SET
    setup_completed_at = NULL,
    updated_at = now()
  WHERE id = v_user_id;

  RAISE NOTICE 'User % (%) — deleted % organisation(s). setup_completed_at cleared.',
    v_email, v_user_id, v_deleted_orgs;
END $$;

-- Verify
SELECT
  up.id,
  up.email,
  up.setup_completed_at,
  (
    SELECT count(*)::int
    FROM public.user_organisations uo
    WHERE uo.user_profile_id = up.id
      AND uo.archived_at IS NULL
  ) AS active_memberships,
  (
    SELECT coalesce(array_agg(o.slug), '{}'::text[])
    FROM public.user_organisations uo
    JOIN public.organisations o ON o.id = uo.organisation_id
    WHERE uo.user_profile_id = up.id
  ) AS org_slugs
FROM public.user_profiles up
WHERE lower(trim(up.email)) = lower(trim('soxox76742@doreact.com'));

COMMIT;

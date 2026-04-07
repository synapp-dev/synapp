-- user_orgs_select_org_peers referenced user_organisations inside its own USING clause,
-- so Postgres re-evaluated RLS on that table and hit "infinite recursion detected in policy".
-- SECURITY DEFINER helpers read membership without triggering RLS.

CREATE OR REPLACE FUNCTION public.current_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uo.organisation_id
  FROM public.user_organisations uo
  WHERE uo.user_profile_id = (SELECT auth.uid())
    AND uo.is_active = true
    AND uo.archived_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.current_user_org_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_org_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.user_profile_visible_to_directory(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_organisations peer
    WHERE peer.user_profile_id = p_profile_id
      AND peer.is_active = true
      AND peer.archived_at IS NULL
      AND peer.organisation_id IN (
        SELECT uo.organisation_id
        FROM public.user_organisations uo
        WHERE uo.user_profile_id = (SELECT auth.uid())
          AND uo.is_active = true
          AND uo.archived_at IS NULL
      )
  );
$$;

REVOKE ALL ON FUNCTION public.user_profile_visible_to_directory(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_profile_visible_to_directory(uuid) TO authenticated;

DROP POLICY IF EXISTS user_orgs_select_org_peers ON public.user_organisations;
CREATE POLICY user_orgs_select_org_peers ON public.user_organisations
  FOR SELECT TO authenticated
  USING (organisation_id IN (SELECT public.current_user_org_ids()));

DROP POLICY IF EXISTS user_profiles_select_org_peers ON public.user_profiles;
CREATE POLICY user_profiles_select_org_peers ON public.user_profiles
  FOR SELECT TO authenticated
  USING (public.user_profile_visible_to_directory(id));

DROP POLICY IF EXISTS user_venues_select_org_peers ON public.user_venues;
CREATE POLICY user_venues_select_org_peers ON public.user_venues
  FOR SELECT TO authenticated
  USING (organisation_id IN (SELECT public.current_user_org_ids()));

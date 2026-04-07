-- Allow org members to read colleague directory data (profiles, org memberships, venue assignments).
-- Existing self-only SELECT policies remain; permissive policies combine with OR.
--
-- Membership checks MUST use SECURITY DEFINER helpers. A policy on user_organisations that
-- subqueries user_organisations re-enters RLS and causes "infinite recursion detected in policy".

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

CREATE POLICY user_orgs_select_org_peers ON public.user_organisations
  FOR SELECT TO authenticated
  USING (organisation_id IN (SELECT public.current_user_org_ids()));

CREATE POLICY user_profiles_select_org_peers ON public.user_profiles
  FOR SELECT TO authenticated
  USING (public.user_profile_visible_to_directory(id));

CREATE POLICY user_venues_select_org_peers ON public.user_venues
  FOR SELECT TO authenticated
  USING (organisation_id IN (SELECT public.current_user_org_ids()));

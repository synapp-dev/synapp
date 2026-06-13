-- Permissions / User: invites, auth whitelist, role display names, archive supervisor.

CREATE OR REPLACE FUNCTION public.is_org_owner(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_organisations uo
    INNER JOIN public.roles r ON r.id = uo.role_id
    WHERE uo.user_profile_id = (SELECT auth.uid())
      AND uo.organisation_id = p_org_id
      AND uo.is_active = true
      AND uo.archived_at IS NULL
      AND r.archived_at IS NULL
      AND r.slug = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid) TO authenticated;

CREATE TABLE public.auth_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  trial_expires_at timestamptz,
  status text NOT NULL DEFAULT 'active'
    CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'revoked'::text])),
  added_by uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX auth_whitelist_active_email_org_uq
  ON public.auth_whitelist (lower(trim(email)), organisation_id)
  WHERE status = 'active';

CREATE INDEX auth_whitelist_org_status_idx
  ON public.auth_whitelist (organisation_id, status);

CREATE TABLE public.organisation_member_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  email text NOT NULL,
  role_id uuid NOT NULL REFERENCES public.roles (id),
  inviting_user_id uuid NOT NULL REFERENCES public.user_profiles (id),
  venue_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organisation_member_invites_email_format_chk
    CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

CREATE INDEX organisation_member_invites_org_pending_idx
  ON public.organisation_member_invites (organisation_id, expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX organisation_member_invites_email_org_idx
  ON public.organisation_member_invites (organisation_id, lower(trim(email)));

ALTER TABLE public.auth_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_member_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_whitelist_select_owner ON public.auth_whitelist
  FOR SELECT TO authenticated
  USING (public.is_org_owner(organisation_id));

CREATE POLICY auth_whitelist_manage_owner ON public.auth_whitelist
  FOR ALL TO authenticated
  USING (public.is_org_owner(organisation_id))
  WITH CHECK (public.is_org_owner(organisation_id));

CREATE POLICY organisation_member_invites_select_owner ON public.organisation_member_invites
  FOR SELECT TO authenticated
  USING (public.is_org_owner(organisation_id));

CREATE POLICY organisation_member_invites_manage_owner ON public.organisation_member_invites
  FOR ALL TO authenticated
  USING (public.is_org_owner(organisation_id))
  WITH CHECK (public.is_org_owner(organisation_id));

-- Auth OTP pre-check (service role or definer in app layer reads via admin).

UPDATE public.roles
SET archived_at = now(), updated_at = now()
WHERE organisation_id IS NULL AND slug = 'supervisor' AND archived_at IS NULL;

UPDATE public.user_organisations uo
SET role_id = r_mgr.id, updated_at = now()
FROM public.roles r_sup, public.roles r_mgr
WHERE uo.role_id = r_sup.id
  AND r_sup.slug = 'supervisor'
  AND r_mgr.organisation_id IS NULL
  AND r_mgr.slug = 'manager'
  AND r_mgr.archived_at IS NULL;

UPDATE public.user_venues uv
SET role_id = NULL, updated_at = now()
FROM public.roles r_sup
WHERE uv.role_id = r_sup.id AND r_sup.slug = 'supervisor';

UPDATE public.roles SET display_name = 'Area Manager', updated_at = now()
WHERE organisation_id IS NULL AND slug = 'admin' AND archived_at IS NULL;

UPDATE public.roles SET display_name = 'Venue Manager', updated_at = now()
WHERE organisation_id IS NULL AND slug = 'manager' AND archived_at IS NULL;

UPDATE public.roles SET display_name = 'Staff', updated_at = now()
WHERE organisation_id IS NULL AND slug = 'crew' AND archived_at IS NULL;

INSERT INTO public.auth_whitelist (email, organisation_id, status, added_at)
SELECT DISTINCT lower(trim(up.email)), uo.organisation_id, 'active', now()
FROM public.user_organisations uo
INNER JOIN public.user_profiles up ON up.id = uo.user_profile_id
WHERE uo.is_active = true
  AND uo.archived_at IS NULL
  AND trim(up.email) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.auth_whitelist aw
    WHERE aw.organisation_id = uo.organisation_id
      AND aw.status = 'active'
      AND lower(trim(aw.email)) = lower(trim(up.email))
  );

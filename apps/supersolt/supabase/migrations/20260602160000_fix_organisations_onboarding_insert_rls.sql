-- Onboarding step 1: authenticated users must INSERT organisations before membership exists.
-- organisations_admin_manage (FOR ALL) applied is_org_admin(id) on INSERT, which is always false
-- for a new row. Split admin coverage away from INSERT so organisations_insert_authenticated applies.

DROP POLICY IF EXISTS organisations_admin_manage ON public.organisations;

CREATE POLICY organisations_admin_select ON public.organisations
  FOR SELECT TO authenticated
  USING (public.is_org_admin(id));

CREATE POLICY organisations_admin_update ON public.organisations
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(id))
  WITH CHECK (public.is_org_admin(id));

CREATE POLICY organisations_admin_delete ON public.organisations
  FOR DELETE TO authenticated
  USING (public.is_org_admin(id));

DROP POLICY IF EXISTS organisations_insert_authenticated ON public.organisations;
CREATE POLICY organisations_insert_authenticated ON public.organisations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- After tables from 20260201100000_slim_mvp_tables.sql

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_organisations uo
    WHERE uo.user_profile_id = (SELECT auth.uid())
      AND uo.organisation_id = p_org_id
      AND uo.role IN ('owner', 'admin')
      AND uo.is_active = true
      AND uo.archived_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_method_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY organisations_admin_manage ON public.organisations
  FOR ALL TO authenticated
  USING (public.is_org_admin(id)) WITH CHECK (public.is_org_admin(id));

CREATE POLICY organisations_select_member ON public.organisations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = organisations.id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY organisations_insert_authenticated ON public.organisations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY venues_admin_manage ON public.venues
  FOR ALL TO authenticated
  USING (public.is_org_admin(organisation_id)) WITH CHECK (public.is_org_admin(organisation_id));

CREATE POLICY venues_select_scoped ON public.venues
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = venues.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY user_profiles_select_own ON public.user_profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY user_profiles_insert_own ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY user_profiles_update_own ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY user_orgs_admin_manage ON public.user_organisations
  FOR ALL TO authenticated
  USING (public.is_org_admin(organisation_id)) WITH CHECK (public.is_org_admin(organisation_id));

CREATE POLICY user_orgs_insert_own_membership ON public.user_organisations
  FOR INSERT TO authenticated
  WITH CHECK (user_profile_id = (SELECT auth.uid()));

CREATE POLICY user_orgs_select_own ON public.user_organisations
  FOR SELECT TO authenticated
  USING (user_profile_id = (SELECT auth.uid()));

CREATE POLICY user_venues_admin_manage ON public.user_venues
  FOR ALL TO authenticated
  USING (public.is_org_admin(organisation_id)) WITH CHECK (public.is_org_admin(organisation_id));

CREATE POLICY user_venues_select_own ON public.user_venues
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.id = user_venues.user_organisation_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY ingredients_select ON public.ingredients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = ingredients.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY ingredients_insert ON public.ingredients
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = ingredients.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY ingredients_update ON public.ingredients
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = ingredients.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY ingredients_delete ON public.ingredients
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = ingredients.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY recipes_select ON public.recipes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = recipes.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY recipes_insert ON public.recipes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = recipes.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY recipes_update ON public.recipes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = recipes.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY recipes_delete ON public.recipes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = recipes.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY recipe_ingredients_all ON public.recipe_ingredients
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      JOIN public.user_organisations uo ON uo.organisation_id = r.organisation_id
      WHERE r.id = recipe_ingredients.recipe_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes r
      JOIN public.user_organisations uo ON uo.organisation_id = r.organisation_id
      WHERE r.id = recipe_ingredients.recipe_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY recipe_method_steps_all ON public.recipe_method_steps
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      JOIN public.user_organisations uo ON uo.organisation_id = r.organisation_id
      WHERE r.id = recipe_method_steps.recipe_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes r
      JOIN public.user_organisations uo ON uo.organisation_id = r.organisation_id
      WHERE r.id = recipe_method_steps.recipe_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY recipe_allergens_all ON public.recipe_allergens
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      JOIN public.user_organisations uo ON uo.organisation_id = r.organisation_id
      WHERE r.id = recipe_allergens.recipe_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes r
      JOIN public.user_organisations uo ON uo.organisation_id = r.organisation_id
      WHERE r.id = recipe_allergens.recipe_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY menu_items_select ON public.menu_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = menu_items.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY menu_items_insert ON public.menu_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = menu_items.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY menu_items_update ON public.menu_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = menu_items.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY menu_items_delete ON public.menu_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = menu_items.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY menu_item_recipes_all ON public.menu_item_recipes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items m
      JOIN public.user_organisations uo ON uo.organisation_id = m.organisation_id
      WHERE m.id = menu_item_recipes.menu_item_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_items m
      JOIN public.user_organisations uo ON uo.organisation_id = m.organisation_id
      WHERE m.id = menu_item_recipes.menu_item_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

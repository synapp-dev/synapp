-- Normalised roles: platform + per-organisation custom; user_organisations / user_venues use role_id.
-- Scoped RLS policies that referenced user_organisations.role / user_venues.role_override are
-- recreated here using role_id + public.roles.slug (matches production tenancy migrations).

-- ---------------------------------------------------------------------------
-- 1. roles table + platform seed (stable UUIDs for scripts and backfill)
-- ---------------------------------------------------------------------------
CREATE TABLE public.roles (
  id uuid PRIMARY KEY NOT NULL,
  organisation_id uuid REFERENCES public.organisations (id) ON DELETE CASCADE,
  slug text NOT NULL,
  display_name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  grants_org_admin boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_slug_format_chk CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)
);

CREATE UNIQUE INDEX roles_platform_slug_uq
  ON public.roles (slug)
  WHERE organisation_id IS NULL AND archived_at IS NULL;

CREATE UNIQUE INDEX roles_org_slug_uq
  ON public.roles (organisation_id, slug)
  WHERE organisation_id IS NOT NULL AND archived_at IS NULL;

CREATE INDEX roles_org_list_idx ON public.roles (organisation_id)
  WHERE archived_at IS NULL;

INSERT INTO public.roles (
  id, organisation_id, slug, display_name, description, sort_order, is_system, grants_org_admin
) VALUES
  ('a0000001-0000-4000-8000-000000000001'::uuid, NULL, 'owner', 'Owner', 'Organisation owner', 10, true, true),
  ('a0000001-0000-4000-8000-000000000002'::uuid, NULL, 'admin', 'Admin', 'Organisation administrator', 20, true, true),
  ('a0000001-0000-4000-8000-000000000003'::uuid, NULL, 'manager', 'Manager', 'Venue / operations manager', 30, true, false),
  ('a0000001-0000-4000-8000-000000000004'::uuid, NULL, 'supervisor', 'Supervisor', 'Shift or team supervisor', 40, true, false),
  ('a0000001-0000-4000-8000-000000000005'::uuid, NULL, 'crew', 'Crew', 'Team member', 50, true, false);

-- ---------------------------------------------------------------------------
-- 2. user_organisations: role_id + is_org_admin (keep legacy role until policies updated)
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_organisations
  ADD COLUMN role_id uuid REFERENCES public.roles (id);

UPDATE public.user_organisations uo
SET role_id = r.id
FROM public.roles r
WHERE r.organisation_id IS NULL
  AND r.slug = uo.role
  AND r.archived_at IS NULL;

ALTER TABLE public.user_organisations
  ALTER COLUMN role_id SET NOT NULL;

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
    INNER JOIN public.roles r ON r.id = uo.role_id
    WHERE uo.user_profile_id = (SELECT auth.uid())
      AND uo.organisation_id = p_org_id
      AND uo.is_active = true
      AND uo.archived_at IS NULL
      AND r.archived_at IS NULL
      AND r.grants_org_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. user_venues: role_id before scoped policies (policies use uv.role_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_venues
  ADD COLUMN role_id uuid REFERENCES public.roles (id);

UPDATE public.user_venues uv
SET role_id = r.id
FROM public.roles r
WHERE uv.role_override IS NOT NULL
  AND r.organisation_id IS NULL
  AND r.slug = uv.role_override
  AND r.archived_at IS NULL;

ALTER TABLE public.user_venues
  DROP CONSTRAINT user_venues_role_override_check;

ALTER TABLE public.user_venues
  DROP COLUMN role_override;

CREATE INDEX user_venues_role_id_idx ON public.user_venues (role_id)
  WHERE archived_at IS NULL AND role_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Replace scoped RLS that depended on user_organisations.role / role_override
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS venues_select_scoped ON public.venues;
DROP POLICY IF EXISTS recipes_write_scoped ON public.recipes;
DROP POLICY IF EXISTS recipe_ingredients_write_scoped ON public.recipe_ingredients;
DROP POLICY IF EXISTS recipe_method_steps_write_scoped ON public.recipe_method_steps;
DROP POLICY IF EXISTS recipe_allergens_write_scoped ON public.recipe_allergens;
DROP POLICY IF EXISTS ingredients_write_scoped ON public.ingredients;
DROP POLICY IF EXISTS menu_items_write_scoped ON public.menu_items;
DROP POLICY IF EXISTS menu_item_recipes_write_scoped ON public.menu_item_recipes;

CREATE POLICY venues_select_scoped ON public.venues
  FOR SELECT TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM user_organisations uo
      INNER JOIN roles r ON r.id = uo.role_id AND r.archived_at IS NULL
      WHERE uo.organisation_id = venues.organisation_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND r.slug IN ('owner', 'admin', 'manager')
    ))
    OR
    (EXISTS (
      SELECT 1 FROM user_organisations uo
      INNER JOIN user_venues uv ON uv.user_organisation_id = uo.id
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = venues.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND uv.venue_id = venues.id
        AND uv.is_active = true
        AND uv.archived_at IS NULL
    ))
  );

CREATE POLICY recipes_write_scoped ON public.recipes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_organisations uo
      LEFT JOIN user_venues uv ON uv.user_organisation_id = uo.id
        AND uv.organisation_id = uo.organisation_id
        AND uv.venue_id = recipes.venue_id
        AND uv.is_active = true
        AND uv.archived_at IS NULL
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = recipes.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND (
          EXISTS (SELECT 1 FROM roles r WHERE r.id = uo.role_id AND r.archived_at IS NULL AND r.slug IN ('owner', 'admin', 'manager', 'supervisor'))
          OR (uv.role_id IS NOT NULL AND EXISTS (SELECT 1 FROM roles r2 WHERE r2.id = uv.role_id AND r2.archived_at IS NULL AND r2.slug IN ('admin', 'manager', 'supervisor')))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organisations uo
      LEFT JOIN user_venues uv ON uv.user_organisation_id = uo.id
        AND uv.organisation_id = uo.organisation_id
        AND uv.venue_id = recipes.venue_id
        AND uv.is_active = true
        AND uv.archived_at IS NULL
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = recipes.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND (
          EXISTS (SELECT 1 FROM roles r WHERE r.id = uo.role_id AND r.archived_at IS NULL AND r.slug IN ('owner', 'admin', 'manager', 'supervisor'))
          OR (uv.role_id IS NOT NULL AND EXISTS (SELECT 1 FROM roles r2 WHERE r2.id = uv.role_id AND r2.archived_at IS NULL AND r2.slug IN ('admin', 'manager', 'supervisor')))
        )
    )
  );

CREATE POLICY recipe_ingredients_write_scoped ON public.recipe_ingredients
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND EXISTS (
          SELECT 1 FROM user_organisations uo
          LEFT JOIN user_venues uv ON uv.user_organisation_id = uo.id
            AND uv.organisation_id = uo.organisation_id
            AND uv.venue_id = r.venue_id
            AND uv.is_active = true
            AND uv.archived_at IS NULL
          WHERE uo.user_profile_id = (SELECT auth.uid())
            AND uo.organisation_id = r.organisation_id
            AND uo.is_active = true
            AND uo.archived_at IS NULL
            AND (
              EXISTS (SELECT 1 FROM roles r2 WHERE r2.id = uo.role_id AND r2.archived_at IS NULL AND r2.slug IN ('owner', 'admin', 'manager', 'supervisor'))
              OR (uv.role_id IS NOT NULL AND EXISTS (SELECT 1 FROM roles r3 WHERE r3.id = uv.role_id AND r3.archived_at IS NULL AND r3.slug IN ('admin', 'manager', 'supervisor')))
            )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND EXISTS (
          SELECT 1 FROM user_organisations uo
          LEFT JOIN user_venues uv ON uv.user_organisation_id = uo.id
            AND uv.organisation_id = uo.organisation_id
            AND uv.venue_id = r.venue_id
            AND uv.is_active = true
            AND uv.archived_at IS NULL
          WHERE uo.user_profile_id = (SELECT auth.uid())
            AND uo.organisation_id = r.organisation_id
            AND uo.is_active = true
            AND uo.archived_at IS NULL
            AND (
              EXISTS (SELECT 1 FROM roles r2 WHERE r2.id = uo.role_id AND r2.archived_at IS NULL AND r2.slug IN ('owner', 'admin', 'manager', 'supervisor'))
              OR (uv.role_id IS NOT NULL AND EXISTS (SELECT 1 FROM roles r3 WHERE r3.id = uv.role_id AND r3.archived_at IS NULL AND r3.slug IN ('admin', 'manager', 'supervisor')))
            )
        )
    )
  );

CREATE POLICY recipe_method_steps_write_scoped ON public.recipe_method_steps
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_method_steps.recipe_id
        AND EXISTS (
          SELECT 1 FROM user_organisations uo
          LEFT JOIN user_venues uv ON uv.user_organisation_id = uo.id
            AND uv.organisation_id = uo.organisation_id
            AND uv.venue_id = r.venue_id
            AND uv.is_active = true
            AND uv.archived_at IS NULL
          WHERE uo.user_profile_id = (SELECT auth.uid())
            AND uo.organisation_id = r.organisation_id
            AND uo.is_active = true
            AND uo.archived_at IS NULL
            AND (
              EXISTS (SELECT 1 FROM roles r2 WHERE r2.id = uo.role_id AND r2.archived_at IS NULL AND r2.slug IN ('owner', 'admin', 'manager', 'supervisor'))
              OR (uv.role_id IS NOT NULL AND EXISTS (SELECT 1 FROM roles r3 WHERE r3.id = uv.role_id AND r3.archived_at IS NULL AND r3.slug IN ('admin', 'manager', 'supervisor')))
            )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_method_steps.recipe_id
        AND EXISTS (
          SELECT 1 FROM user_organisations uo
          LEFT JOIN user_venues uv ON uv.user_organisation_id = uo.id
            AND uv.organisation_id = uo.organisation_id
            AND uv.venue_id = r.venue_id
            AND uv.is_active = true
            AND uv.archived_at IS NULL
          WHERE uo.user_profile_id = (SELECT auth.uid())
            AND uo.organisation_id = r.organisation_id
            AND uo.is_active = true
            AND uo.archived_at IS NULL
            AND (
              EXISTS (SELECT 1 FROM roles r2 WHERE r2.id = uo.role_id AND r2.archived_at IS NULL AND r2.slug IN ('owner', 'admin', 'manager', 'supervisor'))
              OR (uv.role_id IS NOT NULL AND EXISTS (SELECT 1 FROM roles r3 WHERE r3.id = uv.role_id AND r3.archived_at IS NULL AND r3.slug IN ('admin', 'manager', 'supervisor')))
            )
        )
    )
  );

CREATE POLICY recipe_allergens_write_scoped ON public.recipe_allergens
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_allergens.recipe_id
        AND EXISTS (
          SELECT 1 FROM user_organisations uo
          LEFT JOIN user_venues uv ON uv.user_organisation_id = uo.id
            AND uv.organisation_id = uo.organisation_id
            AND uv.venue_id = r.venue_id
            AND uv.is_active = true
            AND uv.archived_at IS NULL
          WHERE uo.user_profile_id = (SELECT auth.uid())
            AND uo.organisation_id = r.organisation_id
            AND uo.is_active = true
            AND uo.archived_at IS NULL
            AND (
              EXISTS (SELECT 1 FROM roles r2 WHERE r2.id = uo.role_id AND r2.archived_at IS NULL AND r2.slug IN ('owner', 'admin', 'manager', 'supervisor'))
              OR (uv.role_id IS NOT NULL AND EXISTS (SELECT 1 FROM roles r3 WHERE r3.id = uv.role_id AND r3.archived_at IS NULL AND r3.slug IN ('admin', 'manager', 'supervisor')))
            )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes r
      WHERE r.id = recipe_allergens.recipe_id
        AND EXISTS (
          SELECT 1 FROM user_organisations uo
          LEFT JOIN user_venues uv ON uv.user_organisation_id = uo.id
            AND uv.organisation_id = uo.organisation_id
            AND uv.venue_id = r.venue_id
            AND uv.is_active = true
            AND uv.archived_at IS NULL
          WHERE uo.user_profile_id = (SELECT auth.uid())
            AND uo.organisation_id = r.organisation_id
            AND uo.is_active = true
            AND uo.archived_at IS NULL
            AND (
              EXISTS (SELECT 1 FROM roles r2 WHERE r2.id = uo.role_id AND r2.archived_at IS NULL AND r2.slug IN ('owner', 'admin', 'manager', 'supervisor'))
              OR (uv.role_id IS NOT NULL AND EXISTS (SELECT 1 FROM roles r3 WHERE r3.id = uv.role_id AND r3.archived_at IS NULL AND r3.slug IN ('admin', 'manager', 'supervisor')))
            )
        )
    )
  );

CREATE POLICY ingredients_write_scoped ON public.ingredients
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_organisations uo
      LEFT JOIN user_venues uv ON uv.user_organisation_id = uo.id
        AND uv.organisation_id = uo.organisation_id
        AND uv.venue_id = ingredients.venue_id
        AND uv.is_active = true
        AND uv.archived_at IS NULL
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = ingredients.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND (
          EXISTS (SELECT 1 FROM roles r WHERE r.id = uo.role_id AND r.archived_at IS NULL AND r.slug IN ('owner', 'admin', 'manager', 'supervisor'))
          OR (uv.role_id IS NOT NULL AND EXISTS (SELECT 1 FROM roles r2 WHERE r2.id = uv.role_id AND r2.archived_at IS NULL AND r2.slug IN ('admin', 'manager', 'supervisor')))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organisations uo
      LEFT JOIN user_venues uv ON uv.user_organisation_id = uo.id
        AND uv.organisation_id = uo.organisation_id
        AND uv.venue_id = ingredients.venue_id
        AND uv.is_active = true
        AND uv.archived_at IS NULL
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = ingredients.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND (
          EXISTS (SELECT 1 FROM roles r WHERE r.id = uo.role_id AND r.archived_at IS NULL AND r.slug IN ('owner', 'admin', 'manager', 'supervisor'))
          OR (uv.role_id IS NOT NULL AND EXISTS (SELECT 1 FROM roles r2 WHERE r2.id = uv.role_id AND r2.archived_at IS NULL AND r2.slug IN ('admin', 'manager', 'supervisor')))
        )
    )
  );

CREATE POLICY menu_items_write_scoped ON public.menu_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_organisations uo
      LEFT JOIN user_venues uv ON uv.user_organisation_id = uo.id
        AND uv.organisation_id = uo.organisation_id
        AND uv.venue_id = menu_items.venue_id
        AND uv.is_active = true
        AND uv.archived_at IS NULL
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = menu_items.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND (
          EXISTS (SELECT 1 FROM roles r WHERE r.id = uo.role_id AND r.archived_at IS NULL AND r.slug IN ('owner', 'admin', 'manager', 'supervisor'))
          OR (uv.role_id IS NOT NULL AND EXISTS (SELECT 1 FROM roles r2 WHERE r2.id = uv.role_id AND r2.archived_at IS NULL AND r2.slug IN ('admin', 'manager', 'supervisor')))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organisations uo
      LEFT JOIN user_venues uv ON uv.user_organisation_id = uo.id
        AND uv.organisation_id = uo.organisation_id
        AND uv.venue_id = menu_items.venue_id
        AND uv.is_active = true
        AND uv.archived_at IS NULL
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = menu_items.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND (
          EXISTS (SELECT 1 FROM roles r WHERE r.id = uo.role_id AND r.archived_at IS NULL AND r.slug IN ('owner', 'admin', 'manager', 'supervisor'))
          OR (uv.role_id IS NOT NULL AND EXISTS (SELECT 1 FROM roles r2 WHERE r2.id = uv.role_id AND r2.archived_at IS NULL AND r2.slug IN ('admin', 'manager', 'supervisor')))
        )
    )
  );

CREATE POLICY menu_item_recipes_write_scoped ON public.menu_item_recipes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_items mi
      WHERE mi.id = menu_item_recipes.menu_item_id
        AND EXISTS (
          SELECT 1 FROM user_organisations uo
          LEFT JOIN user_venues uv ON uv.user_organisation_id = uo.id
            AND uv.organisation_id = uo.organisation_id
            AND uv.venue_id = mi.venue_id
            AND uv.is_active = true
            AND uv.archived_at IS NULL
          WHERE uo.user_profile_id = (SELECT auth.uid())
            AND uo.organisation_id = mi.organisation_id
            AND uo.is_active = true
            AND uo.archived_at IS NULL
            AND (
              EXISTS (SELECT 1 FROM roles r WHERE r.id = uo.role_id AND r.archived_at IS NULL AND r.slug IN ('owner', 'admin', 'manager', 'supervisor'))
              OR (uv.role_id IS NOT NULL AND EXISTS (SELECT 1 FROM roles r2 WHERE r2.id = uv.role_id AND r2.archived_at IS NULL AND r2.slug IN ('admin', 'manager', 'supervisor')))
            )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menu_items mi
      WHERE mi.id = menu_item_recipes.menu_item_id
        AND EXISTS (
          SELECT 1 FROM user_organisations uo
          LEFT JOIN user_venues uv ON uv.user_organisation_id = uo.id
            AND uv.organisation_id = uo.organisation_id
            AND uv.venue_id = mi.venue_id
            AND uv.is_active = true
            AND uv.archived_at IS NULL
          WHERE uo.user_profile_id = (SELECT auth.uid())
            AND uo.organisation_id = mi.organisation_id
            AND uo.is_active = true
            AND uo.archived_at IS NULL
            AND (
              EXISTS (SELECT 1 FROM roles r WHERE r.id = uo.role_id AND r.archived_at IS NULL AND r.slug IN ('owner', 'admin', 'manager', 'supervisor'))
              OR (uv.role_id IS NOT NULL AND EXISTS (SELECT 1 FROM roles r2 WHERE r2.id = uv.role_id AND r2.archived_at IS NULL AND r2.slug IN ('admin', 'manager', 'supervisor')))
            )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Drop legacy user_organisations.role (policies no longer reference it)
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_organisations
  DROP CONSTRAINT user_organisations_role_check;

ALTER TABLE public.user_organisations
  DROP COLUMN role;

CREATE INDEX user_orgs_role_id_idx ON public.user_organisations (role_id)
  WHERE archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- 6. Scope validation triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_user_org_role_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.roles r
    WHERE r.id = NEW.role_id
      AND r.archived_at IS NULL
      AND (r.organisation_id IS NULL OR r.organisation_id = NEW.organisation_id)
  ) THEN
    RAISE EXCEPTION 'role_id % is not valid for organisation_id %', NEW.role_id, NEW.organisation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_organisations_validate_role_scope ON public.user_organisations;
CREATE TRIGGER user_organisations_validate_role_scope
  BEFORE INSERT OR UPDATE OF role_id, organisation_id ON public.user_organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_org_role_scope();

CREATE OR REPLACE FUNCTION public.validate_user_venue_role_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.roles r
    WHERE r.id = NEW.role_id
      AND r.archived_at IS NULL
      AND (r.organisation_id IS NULL OR r.organisation_id = NEW.organisation_id)
  ) THEN
    RAISE EXCEPTION 'role_id % is not valid for user_venues.organisation_id %', NEW.role_id, NEW.organisation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_venues_validate_role_scope ON public.user_venues;
CREATE TRIGGER user_venues_validate_role_scope
  BEFORE INSERT OR UPDATE OF role_id, organisation_id ON public.user_venues
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_venue_role_scope();

-- ---------------------------------------------------------------------------
-- 7. RLS on roles
-- ---------------------------------------------------------------------------
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_select_platform ON public.roles
  FOR SELECT TO authenticated
  USING (organisation_id IS NULL AND archived_at IS NULL);

CREATE POLICY roles_select_org_scoped ON public.roles
  FOR SELECT TO authenticated
  USING (
    organisation_id IS NOT NULL
    AND archived_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = roles.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY roles_insert_org_custom ON public.roles
  FOR INSERT TO authenticated
  WITH CHECK (
    organisation_id IS NOT NULL
    AND is_system = false
    AND public.is_org_admin(organisation_id)
  );

CREATE POLICY roles_update_org_custom ON public.roles
  FOR UPDATE TO authenticated
  USING (
    organisation_id IS NOT NULL
    AND is_system = false
    AND public.is_org_admin(organisation_id)
  )
  WITH CHECK (
    organisation_id IS NOT NULL
    AND is_system = false
    AND public.is_org_admin(organisation_id)
  );

CREATE POLICY roles_delete_org_custom ON public.roles
  FOR DELETE TO authenticated
  USING (
    organisation_id IS NOT NULL
    AND is_system = false
    AND public.is_org_admin(organisation_id)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;

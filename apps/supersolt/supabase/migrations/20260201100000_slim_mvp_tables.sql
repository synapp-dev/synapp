-- Tables + indexes only. Next: 20260201100001_slim_mvp_function_rls_grants.sql

CREATE TABLE public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  legal_name text,
  abn text,
  email text,
  phone text,
  website text,
  logo_url text,
  timezone text DEFAULT 'Australia/Melbourne' NOT NULL,
  currency text DEFAULT 'AUD' NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT organisations_slug_format_chk CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)
);

CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  venue_type text DEFAULT 'restaurant' NOT NULL,
  address_line1 text,
  address_line2 text,
  suburb text,
  state text,
  postcode text,
  country text DEFAULT 'Australia',
  email text,
  phone text,
  timezone text DEFAULT 'Australia/Melbourne' NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT venues_slug_format_chk CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text),
  CONSTRAINT venues_venue_type_check CHECK (
    venue_type = ANY (ARRAY['restaurant'::text, 'cafe'::text, 'bar'::text, 'food_truck'::text, 'catering'::text, 'other'::text])
  )
);

CREATE UNIQUE INDEX venues_organisation_id_id_uq ON public.venues (organisation_id, id);

CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  full_name text,
  avatar_url text,
  phone text,
  timezone text DEFAULT 'Australia/Melbourne',
  is_active boolean DEFAULT true NOT NULL,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.user_organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  role text DEFAULT 'crew' NOT NULL,
  invited_at timestamptz,
  joined_at timestamptz,
  revoked_at timestamptz,
  is_active boolean DEFAULT true NOT NULL,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT user_organisations_role_check CHECK (
    role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'supervisor'::text, 'crew'::text])
  )
);

CREATE UNIQUE INDEX user_orgs_id_organisation_id_uq ON public.user_organisations (id, organisation_id);

CREATE UNIQUE INDEX user_orgs_active_membership_uq
  ON public.user_organisations (user_profile_id, organisation_id)
  WHERE archived_at IS NULL;

CREATE TABLE public.user_venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_organisation_id uuid NOT NULL,
  organisation_id uuid NOT NULL,
  venue_id uuid NOT NULL,
  role_override text,
  is_active boolean DEFAULT true NOT NULL,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT user_venues_role_override_check CHECK (
    role_override = ANY (ARRAY['admin'::text, 'manager'::text, 'supervisor'::text, 'crew'::text])
  ),
  CONSTRAINT user_venues_user_org_fk FOREIGN KEY (user_organisation_id, organisation_id)
    REFERENCES public.user_organisations (id, organisation_id) ON DELETE CASCADE,
  CONSTRAINT user_venues_venue_org_fk FOREIGN KEY (organisation_id, venue_id)
    REFERENCES public.venues (organisation_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX user_venues_active_mapping_uq
  ON public.user_venues (user_organisation_id, venue_id)
  WHERE archived_at IS NULL;

CREATE TABLE public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  unit text NOT NULL,
  cost_per_unit_cents integer NOT NULL DEFAULT 0,
  current_stock_level numeric NOT NULL DEFAULT 0,
  best_supplier_cost_cents integer,
  status text NOT NULL DEFAULT 'active',
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE INDEX idx_ingredients_org_venue ON public.ingredients (organisation_id, venue_id)
  WHERE archived_at IS NULL;

CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other',
  serves integer NOT NULL DEFAULT 1,
  method text,
  status text NOT NULL DEFAULT 'draft',
  cost_per_serve_cents integer NOT NULL DEFAULT 0,
  suggested_price_cents integer NOT NULL DEFAULT 0,
  gp_target_percent integer NOT NULL DEFAULT 0,
  waste_percent integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE TABLE public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES public.ingredients (id) ON DELETE SET NULL,
  ingredient_name text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  unit_cost_cents integer NOT NULL DEFAULT 0,
  is_sub_recipe boolean NOT NULL DEFAULT false,
  sub_recipe_id uuid REFERENCES public.recipes (id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recipe_method_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  instruction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recipe_allergens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  allergen_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  name text NOT NULL,
  section_name text NOT NULL,
  plu_code text,
  price_cents integer NOT NULL DEFAULT 0,
  cost_per_serve_cents integer NOT NULL DEFAULT 0,
  gp_percent integer NOT NULL DEFAULT 0,
  gst_mode text NOT NULL DEFAULT 'inclusive',
  price_mode text NOT NULL DEFAULT 'fixed',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  show_on_menu boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE TABLE public.menu_item_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items (id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX organisations_active_idx ON public.organisations (is_active) WHERE archived_at IS NULL;
CREATE UNIQUE INDEX organisations_slug_uq ON public.organisations (slug);
CREATE INDEX venues_org_active_idx ON public.venues (organisation_id, is_active) WHERE archived_at IS NULL;
CREATE UNIQUE INDEX venues_org_slug_uq ON public.venues (organisation_id, slug);
CREATE INDEX user_profiles_active_idx ON public.user_profiles (is_active) WHERE archived_at IS NULL;
CREATE INDEX user_orgs_org_active_idx ON public.user_organisations (organisation_id, is_active) WHERE archived_at IS NULL;
CREATE INDEX user_orgs_user_active_idx ON public.user_organisations (user_profile_id, is_active) WHERE archived_at IS NULL;
CREATE INDEX user_venues_membership_active_idx ON public.user_venues (user_organisation_id, is_active) WHERE archived_at IS NULL;
CREATE INDEX user_venues_venue_active_idx ON public.user_venues (venue_id, is_active) WHERE archived_at IS NULL;

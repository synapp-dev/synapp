-- POS catalog enrichment: subcategory (item) groups, modifier catalog, raw Square capture.
-- See apps/supersolt/docs/features/inventory-setup/pos-catalog-import/plan.md §4.

-- Tier 2: the Square ITEM (a "subcategory" grouping its variations).
CREATE TABLE public.menu_item_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  square_item_id text NOT NULL,
  name text NOT NULL,
  section_name text NOT NULL DEFAULT 'Uncategorised',
  description text,
  square_raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT menu_item_groups_venue_square_item_uq UNIQUE (venue_id, square_item_id)
);

CREATE INDEX idx_menu_item_groups_org_venue
  ON public.menu_item_groups (organisation_id, venue_id);

-- Tier 3: variation rows gain a (nullable) link to their group + raw capture.
ALTER TABLE public.menu_items
  ADD COLUMN group_id uuid REFERENCES public.menu_item_groups (id) ON DELETE SET NULL,
  ADD COLUMN square_raw jsonb;

CREATE INDEX idx_menu_items_group_id
  ON public.menu_items (group_id)
  WHERE group_id IS NOT NULL;

-- Venue-wide modifier list catalog (Square MODIFIER_LIST).
CREATE TABLE public.venue_modifier_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  square_modifier_list_id text NOT NULL,
  name text NOT NULL,
  selection_type text NOT NULL DEFAULT 'multi'
    CHECK (selection_type IN ('single', 'multi')),
  min_selected integer,
  max_selected integer,
  square_raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT venue_modifier_lists_venue_square_uq UNIQUE (venue_id, square_modifier_list_id)
);

CREATE INDEX idx_venue_modifier_lists_org_venue
  ON public.venue_modifier_lists (organisation_id, venue_id);

-- Venue-wide modifier catalog (Square MODIFIER).
CREATE TABLE public.venue_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  modifier_list_id uuid NOT NULL REFERENCES public.venue_modifier_lists (id) ON DELETE CASCADE,
  square_modifier_id text NOT NULL,
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  square_raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT venue_modifiers_venue_square_uq UNIQUE (venue_id, square_modifier_id)
);

CREATE INDEX idx_venue_modifiers_list
  ON public.venue_modifiers (modifier_list_id);

-- Which modifier lists attach to which item group (Square ITEM.modifier_list_info).
CREATE TABLE public.menu_item_group_modifier_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.menu_item_groups (id) ON DELETE CASCADE,
  modifier_list_id uuid NOT NULL REFERENCES public.venue_modifier_lists (id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  min_selected integer,
  max_selected integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT menu_item_group_modifier_lists_uq UNIQUE (group_id, modifier_list_id)
);

CREATE INDEX idx_menu_item_group_modifier_lists_group
  ON public.menu_item_group_modifier_lists (group_id);
CREATE INDEX idx_menu_item_group_modifier_lists_list
  ON public.menu_item_group_modifier_lists (modifier_list_id);

-- RLS: organisation-scoped (mirrors menu_items / supplier_raw_items).
ALTER TABLE public.menu_item_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_modifier_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_group_modifier_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY menu_item_groups_all ON public.menu_item_groups
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = menu_item_groups.organisation_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = menu_item_groups.organisation_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY venue_modifier_lists_all ON public.venue_modifier_lists
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = venue_modifier_lists.organisation_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = venue_modifier_lists.organisation_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY venue_modifiers_all ON public.venue_modifiers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = venue_modifiers.organisation_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = venue_modifiers.organisation_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY menu_item_group_modifier_lists_all ON public.menu_item_group_modifier_lists
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = menu_item_group_modifier_lists.organisation_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = menu_item_group_modifier_lists.organisation_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_item_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_modifier_lists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_modifiers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_item_group_modifier_lists TO authenticated;

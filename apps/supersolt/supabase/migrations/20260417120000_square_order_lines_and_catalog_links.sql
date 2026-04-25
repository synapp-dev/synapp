-- Square order line snapshots (per payment line) + explicit catalog → menu_item links for a venue.

CREATE TABLE public.menu_item_square_catalog_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items (id) ON DELETE CASCADE,
  square_catalog_object_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT menu_item_square_catalog_links_uq UNIQUE (venue_id, square_catalog_object_id)
);

CREATE INDEX menu_item_square_catalog_links_venue_idx ON public.menu_item_square_catalog_links (venue_id);
CREATE INDEX menu_item_square_catalog_links_menu_item_idx ON public.menu_item_square_catalog_links (menu_item_id);

ALTER TABLE public.menu_item_square_catalog_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY menu_item_square_catalog_links_select ON public.menu_item_square_catalog_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = menu_item_square_catalog_links.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY menu_item_square_catalog_links_insert ON public.menu_item_square_catalog_links
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(organisation_id));

CREATE POLICY menu_item_square_catalog_links_update ON public.menu_item_square_catalog_links
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(organisation_id))
  WITH CHECK (public.is_org_admin(organisation_id));

CREATE POLICY menu_item_square_catalog_links_delete ON public.menu_item_square_catalog_links
  FOR DELETE TO authenticated
  USING (public.is_org_admin(organisation_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_item_square_catalog_links TO authenticated;

CREATE TABLE public.venue_square_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  square_payment_id text NOT NULL,
  square_order_id text,
  square_line_uid text NOT NULL,
  quantity numeric NOT NULL,
  line_name text,
  square_catalog_object_id text,
  gross_amount_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'AUD',
  menu_item_id uuid REFERENCES public.menu_items (id) ON DELETE SET NULL,
  match_source text NOT NULL DEFAULT 'unmapped',
  observed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_square_order_lines_match_chk CHECK (
    match_source IN ('catalog_link', 'name_exact', 'unmapped')
  ),
  CONSTRAINT venue_square_order_lines_uq UNIQUE (venue_id, square_payment_id, square_line_uid)
);

CREATE INDEX venue_square_order_lines_venue_observed_idx ON public.venue_square_order_lines (venue_id, observed_at DESC);

ALTER TABLE public.venue_square_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY venue_square_order_lines_select ON public.venue_square_order_lines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = venue_square_order_lines.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT ON public.venue_square_order_lines TO authenticated;

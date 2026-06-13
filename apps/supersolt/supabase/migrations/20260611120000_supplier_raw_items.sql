-- Raw supplier items catalog (invoice language, pre-normalisation)

CREATE TABLE public.supplier_raw_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers (id) ON DELETE CASCADE,
  raw_description text NOT NULL,
  raw_description_normalized text NOT NULL,
  raw_unit text,
  last_quantity numeric,
  last_unit_price_cents integer,
  last_line_total_cents integer,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('xero_api', 'invoice_parse', 'manual')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_invoice_id uuid REFERENCES public.venue_invoices (id) ON DELETE SET NULL,
  normalisation_status text NOT NULL DEFAULT 'pending'
    CHECK (normalisation_status IN ('pending', 'normalised', 'skipped')),
  supplier_product_id uuid REFERENCES public.supplier_products (id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT supplier_raw_items_supplier_dedupe_uq
    UNIQUE (supplier_id, raw_description_normalized)
);

CREATE INDEX idx_supplier_raw_items_org_supplier
  ON public.supplier_raw_items (organisation_id, supplier_id)
  WHERE archived_at IS NULL;

CREATE INDEX idx_supplier_raw_items_pending
  ON public.supplier_raw_items (supplier_id)
  WHERE archived_at IS NULL AND normalisation_status = 'pending';

ALTER TABLE public.supplier_raw_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY supplier_raw_items_all ON public.supplier_raw_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = supplier_raw_items.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = supplier_raw_items.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_raw_items TO authenticated;

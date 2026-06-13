-- Price history for supplier products (manual edits, invoices, bulk import, etc.)

CREATE TABLE public.supplier_product_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  supplier_product_id uuid NOT NULL REFERENCES public.supplier_products (id) ON DELETE CASCADE,
  old_price_cents integer,
  new_price_cents integer NOT NULL,
  source text NOT NULL,
  source_ref text,
  changed_by_user_id uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_product_price_history_source_chk CHECK (
    source IN ('manual_edit', 'invoice', 'xero_sync', 'bulk_import', 'active_switch')
  )
);

CREATE INDEX idx_supplier_product_price_history_product
  ON public.supplier_product_price_history (supplier_product_id, changed_at DESC);

ALTER TABLE public.supplier_product_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY supplier_product_price_history_all ON public.supplier_product_price_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = supplier_product_price_history.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = supplier_product_price_history.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT ON public.supplier_product_price_history TO authenticated;

-- Suppliers: per-venue (venue_id set) or shared across org (venue_id null).
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid REFERENCES public.venues (id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  abn text,
  category text NOT NULL DEFAULT 'other',
  payment_terms text,
  delivery_days text,
  order_method text,
  active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE INDEX idx_suppliers_org_list ON public.suppliers (organisation_id)
  WHERE archived_at IS NULL;

CREATE INDEX idx_suppliers_org_venue_list ON public.suppliers (organisation_id, venue_id)
  WHERE archived_at IS NULL;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_select ON public.suppliers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.user_profile_id = auth.uid()
        AND uo.organisation_id = suppliers.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY suppliers_insert ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.user_profile_id = auth.uid()
        AND uo.organisation_id = suppliers.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY suppliers_update ON public.suppliers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.user_profile_id = auth.uid()
        AND uo.organisation_id = suppliers.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY suppliers_delete ON public.suppliers
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.user_profile_id = auth.uid()
        AND uo.organisation_id = suppliers.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;

-- Supplier detail fields (reference SupplierDetail / schedule) + ingredient → supplier link

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS suburb text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS is_gst_registered boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS schedule_overrides jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS haccp_certified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificate_number text,
  ADD COLUMN IF NOT EXISTS certificate_expiry date,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ingredients_supplier_id
  ON public.ingredients (supplier_id)
  WHERE archived_at IS NULL;

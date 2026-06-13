-- Link Supersolt suppliers to Xero contacts for import/sync.

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS xero_contact_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_org_xero_contact
  ON public.suppliers (organisation_id, xero_contact_id)
  WHERE xero_contact_id IS NOT NULL AND archived_at IS NULL;

ALTER TABLE public.venue_xero_connections
  ADD COLUMN IF NOT EXISTS last_supplier_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_supplier_sync_error text;

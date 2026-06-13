-- Supplier bills (ACCPAY) synced from Xero per venue.

ALTER TABLE public.venue_xero_connections
  ADD COLUMN IF NOT EXISTS last_invoice_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_invoice_sync_error text;

CREATE TABLE public.venue_xero_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  xero_invoice_id uuid NOT NULL,
  invoice_number text,
  supplier_name text,
  xero_contact_id text,
  invoice_date date,
  due_date date,
  document_type text NOT NULL DEFAULT 'invoice',
  total_cents bigint NOT NULL,
  amount_due_cents bigint,
  currency_code text NOT NULL DEFAULT 'AUD',
  xero_status text NOT NULL,
  review_status text NOT NULL DEFAULT 'pending_review',
  source text NOT NULL DEFAULT 'xero',
  reference text,
  xero_updated_at timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_xero_invoices_venue_xero_uq UNIQUE (venue_id, xero_invoice_id),
  CONSTRAINT venue_xero_invoices_document_type_chk CHECK (
    document_type IN ('invoice', 'credit_note')
  ),
  CONSTRAINT venue_xero_invoices_review_status_chk CHECK (
    review_status IN ('pending_review', 'confirmed', 'disputed', 'duplicate')
  ),
  CONSTRAINT venue_xero_invoices_source_chk CHECK (source IN ('xero', 'upload', 'email'))
);

CREATE INDEX venue_xero_invoices_venue_date_idx
  ON public.venue_xero_invoices (venue_id, invoice_date DESC NULLS LAST);

CREATE INDEX venue_xero_invoices_org_idx
  ON public.venue_xero_invoices (organisation_id);

ALTER TABLE public.venue_xero_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY venue_xero_invoices_select ON public.venue_xero_invoices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venues v
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = venue_xero_invoices.venue_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT ON public.venue_xero_invoices TO authenticated;

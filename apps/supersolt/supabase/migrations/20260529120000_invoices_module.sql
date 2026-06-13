-- Invoices module: generalize venue_xero_invoices → venue_invoices + line items, audit, email, storage.

-- Rename primary table
ALTER TABLE public.venue_xero_invoices RENAME TO venue_invoices;

ALTER TABLE public.venue_invoices RENAME CONSTRAINT venue_xero_invoices_document_type_chk TO venue_invoices_document_type_chk;
ALTER TABLE public.venue_invoices RENAME CONSTRAINT venue_xero_invoices_review_status_chk TO venue_invoices_review_status_chk;
ALTER TABLE public.venue_invoices RENAME CONSTRAINT venue_xero_invoices_source_chk TO venue_invoices_source_chk;
ALTER TABLE public.venue_invoices RENAME CONSTRAINT venue_xero_invoices_venue_xero_uq TO venue_invoices_venue_xero_uq;
ALTER TABLE public.venue_invoices RENAME CONSTRAINT venue_xero_invoices_organisation_id_fkey TO venue_invoices_organisation_id_fkey;
ALTER TABLE public.venue_invoices RENAME CONSTRAINT venue_xero_invoices_purchase_order_id_fkey TO venue_invoices_purchase_order_id_fkey;
ALTER TABLE public.venue_invoices RENAME CONSTRAINT venue_xero_invoices_venue_id_fkey TO venue_invoices_venue_id_fkey;

ALTER INDEX IF EXISTS public.venue_xero_invoices_org_idx RENAME TO venue_invoices_org_idx;
ALTER INDEX IF EXISTS public.venue_xero_invoices_po_idx RENAME TO venue_invoices_po_idx;
ALTER INDEX IF EXISTS public.venue_xero_invoices_venue_date_idx RENAME TO venue_invoices_venue_date_idx;

ALTER POLICY venue_xero_invoices_select ON public.venue_invoices RENAME TO venue_invoices_select;

-- Nullable xero id for upload/email sources
ALTER TABLE public.venue_invoices ALTER COLUMN xero_invoice_id DROP NOT NULL;

ALTER TABLE public.venue_invoices DROP CONSTRAINT venue_invoices_venue_xero_uq;
CREATE UNIQUE INDEX venue_invoices_venue_xero_uq
  ON public.venue_invoices (venue_id, xero_invoice_id)
  WHERE xero_invoice_id IS NOT NULL;

-- Extended header columns
ALTER TABLE public.venue_invoices
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subtotal_cents bigint,
  ADD COLUMN IF NOT EXISTS gst_cents bigint,
  ADD COLUMN IF NOT EXISTS gst_treatment text,
  ADD COLUMN IF NOT EXISTS parse_confidence text,
  ADD COLUMN IF NOT EXISTS match_method text,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS dispute_notes text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS attachment_storage_path text,
  ADD COLUMN IF NOT EXISTS email_message_id uuid,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS disputed_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.venue_invoices DROP CONSTRAINT IF EXISTS venue_invoices_review_status_chk;
ALTER TABLE public.venue_invoices ADD CONSTRAINT venue_invoices_review_status_chk CHECK (
  review_status IN (
    'pending_review', 'pending_approval', 'confirmed', 'disputed', 'duplicate', 'archived'
  )
);

ALTER TABLE public.venue_invoices ADD CONSTRAINT venue_invoices_gst_treatment_chk CHECK (
  gst_treatment IS NULL OR gst_treatment IN ('inclusive', 'exclusive', 'mixed')
);

ALTER TABLE public.venue_invoices ADD CONSTRAINT venue_invoices_parse_confidence_chk CHECK (
  parse_confidence IS NULL OR parse_confidence IN ('high', 'medium', 'low')
);

ALTER TABLE public.venue_invoices ADD CONSTRAINT venue_invoices_match_method_chk CHECK (
  match_method IS NULL OR match_method IN ('auto', 'manual', 'standalone')
);

CREATE INDEX IF NOT EXISTS venue_invoices_supplier_idx
  ON public.venue_invoices (supplier_id)
  WHERE supplier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS venue_invoices_review_status_idx
  ON public.venue_invoices (venue_id, review_status);

-- Line items
CREATE TABLE public.venue_invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.venue_invoices (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  parsed_description text,
  supplier_product_id uuid REFERENCES public.supplier_products (id) ON DELETE SET NULL,
  ingredient_id uuid REFERENCES public.ingredients (id) ON DELETE SET NULL,
  quantity numeric,
  unit text,
  unit_price_cents bigint,
  line_total_cents bigint,
  gst_treatment text,
  is_unmapped boolean NOT NULL DEFAULT true,
  mapping_method text,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_invoice_line_items_mapping_method_chk CHECK (
    mapping_method IS NULL OR mapping_method IN ('auto', 'manual')
  )
);

CREATE INDEX idx_venue_invoice_line_items_invoice
  ON public.venue_invoice_line_items (invoice_id, sort_order);

ALTER TABLE public.venue_invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY venue_invoice_line_items_select ON public.venue_invoice_line_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venues v
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = venue_invoice_line_items.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY venue_invoice_line_items_write ON public.venue_invoice_line_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venues v
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = venue_invoice_line_items.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.venues v
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = venue_invoice_line_items.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_invoice_line_items TO authenticated;

-- Attachments (local storage metadata)
CREATE TABLE public.venue_invoice_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.venue_invoices (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  file_name text NOT NULL,
  mime_type text,
  content_length bigint,
  storage_path text NOT NULL,
  source text NOT NULL DEFAULT 'upload',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_invoice_attachments_source_chk CHECK (
    source IN ('upload', 'email', 'xero')
  )
);

CREATE INDEX idx_venue_invoice_attachments_invoice
  ON public.venue_invoice_attachments (invoice_id);

ALTER TABLE public.venue_invoice_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY venue_invoice_attachments_select ON public.venue_invoice_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = venue_invoice_attachments.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT ON public.venue_invoice_attachments TO authenticated;

-- Audit log
CREATE TABLE public.venue_invoice_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.venue_invoices (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  changed_by_user_id uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_invoice_audit_invoice
  ON public.venue_invoice_audit_log (invoice_id, changed_at DESC);

ALTER TABLE public.venue_invoice_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY venue_invoice_audit_log_select ON public.venue_invoice_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venue_invoices vi
      INNER JOIN public.venues v ON v.id = vi.venue_id
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE vi.id = venue_invoice_audit_log.invoice_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY venue_invoice_audit_log_insert ON public.venue_invoice_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.venue_invoices vi
      INNER JOIN public.venues v ON v.id = vi.venue_id
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE vi.id = venue_invoice_audit_log.invoice_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT ON public.venue_invoice_audit_log TO authenticated;

-- Cost change events
CREATE TABLE public.invoice_cost_change_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.venue_invoices (id) ON DELETE CASCADE,
  supplier_product_id uuid REFERENCES public.supplier_products (id) ON DELETE SET NULL,
  old_price_cents bigint,
  new_price_cents bigint,
  propagated boolean NOT NULL DEFAULT false,
  affected_recipe_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_cost_change_events_invoice
  ON public.invoice_cost_change_events (invoice_id);

ALTER TABLE public.invoice_cost_change_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_cost_change_events_select ON public.invoice_cost_change_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venue_invoices vi
      INNER JOIN public.venues v ON v.id = vi.venue_id
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE vi.id = invoice_cost_change_events.invoice_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT ON public.invoice_cost_change_events TO authenticated;

-- Invoice write policy for venue members
CREATE POLICY venue_invoices_update ON public.venue_invoices
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = venue_invoices.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues v
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = venue_invoices.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY venue_invoices_insert ON public.venue_invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues v
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = venue_invoices.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT INSERT, UPDATE ON public.venue_invoices TO authenticated;

-- Org purchasing: invoice approval threshold
ALTER TABLE public.organisation_purchasing_settings
  ADD COLUMN IF NOT EXISTS invoice_approval_threshold_cents integer NOT NULL DEFAULT 250000;

-- Email infrastructure
CREATE TABLE public.venue_email_inboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  address text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_email_inboxes_venue_uq UNIQUE (venue_id),
  CONSTRAINT venue_email_inboxes_address_uq UNIQUE (address),
  CONSTRAINT venue_email_inboxes_status_chk CHECK (status IN ('active', 'suspended'))
);

ALTER TABLE public.venue_email_inboxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY venue_email_inboxes_select ON public.venue_email_inboxes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = venue_email_inboxes.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT ON public.venue_email_inboxes TO authenticated;

CREATE TABLE public.inbound_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_id uuid NOT NULL REFERENCES public.venue_email_inboxes (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  from_address text NOT NULL,
  subject text,
  received_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'received',
  parse_result jsonb,
  linked_invoice_id uuid REFERENCES public.venue_invoices (id) ON DELETE SET NULL,
  raw_blob_path text,
  CONSTRAINT inbound_email_log_status_chk CHECK (
    status IN ('received', 'parsed', 'failed', 'non_invoice', 'spam')
  )
);

CREATE INDEX idx_inbound_email_log_venue ON public.inbound_email_log (venue_id, received_at DESC);

ALTER TABLE public.inbound_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY inbound_email_log_select ON public.inbound_email_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.organisation_id = inbound_email_log.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT ON public.inbound_email_log TO authenticated;

-- FK purchase_orders.linked_invoice_id → venue_invoices
ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_linked_invoice_id_fkey;

ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_linked_invoice_id_fkey
  FOREIGN KEY (linked_invoice_id) REFERENCES public.venue_invoices (id) ON DELETE SET NULL;

-- Storage bucket for invoice attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'venue-invoice-attachments',
  'venue-invoice-attachments',
  false,
  52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY venue_invoice_attachments_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'venue-invoice-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.venues v
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.organisation_id::text = (storage.foldername(name))[1]
        AND v.id::text = (storage.foldername(name))[2]
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY venue_invoice_attachments_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'venue-invoice-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.venues v
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.organisation_id::text = (storage.foldername(name))[1]
        AND v.id::text = (storage.foldername(name))[2]
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

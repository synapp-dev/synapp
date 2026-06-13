-- Purchasing → Orders: supplier products, purchase orders, order guide cache, org settings.

-- Supplier extensions for ordering
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS ordering_email text,
  ADD COLUMN IF NOT EXISTS lead_time_days integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS minimum_order_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_delivery_grace_days integer NOT NULL DEFAULT 1;

-- Org-level purchasing settings
CREATE TABLE public.organisation_purchasing_settings (
  organisation_id uuid PRIMARY KEY REFERENCES public.organisations (id) ON DELETE CASCADE,
  default_buffer_percent numeric(5, 2) NOT NULL DEFAULT 15,
  po_approval_threshold_cents integer NOT NULL DEFAULT 50000,
  gst_treatment text NOT NULL DEFAULT 'exclusive',
  po_email_template text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organisation_purchasing_settings_gst_chk CHECK (
    gst_treatment IN ('inclusive', 'exclusive')
  )
);

ALTER TABLE public.organisation_purchasing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY organisation_purchasing_settings_select ON public.organisation_purchasing_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = organisation_purchasing_settings.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT ON public.organisation_purchasing_settings TO authenticated;

-- Ingredient buffer overrides (most-specific wins over category/org)
CREATE TABLE public.ingredient_order_buffers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients (id) ON DELETE CASCADE,
  buffer_percent numeric(5, 2) NOT NULL,
  exclude_from_order_guide boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ingredient_order_buffers_uq UNIQUE (venue_id, ingredient_id)
);

CREATE INDEX idx_ingredient_order_buffers_venue ON public.ingredient_order_buffers (venue_id);

ALTER TABLE public.ingredient_order_buffers ENABLE ROW LEVEL SECURITY;

CREATE POLICY ingredient_order_buffers_all ON public.ingredient_order_buffers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = ingredient_order_buffers.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = ingredient_order_buffers.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredient_order_buffers TO authenticated;

-- Supplier products (SKU layer)
CREATE TABLE public.supplier_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid REFERENCES public.venues (id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers (id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES public.ingredients (id) ON DELETE SET NULL,
  name text NOT NULL,
  sku_code text,
  pack_label text NOT NULL DEFAULT 'each',
  units_per_pack numeric NOT NULL DEFAULT 1,
  pack_unit text NOT NULL DEFAULT 'each',
  unit_price_cents integer NOT NULL DEFAULT 0,
  is_active_for_ingredient boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE INDEX idx_supplier_products_supplier ON public.supplier_products (supplier_id)
  WHERE archived_at IS NULL;

CREATE INDEX idx_supplier_products_ingredient ON public.supplier_products (ingredient_id)
  WHERE archived_at IS NULL AND is_active_for_ingredient = true;

ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY supplier_products_all ON public.supplier_products
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = supplier_products.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = supplier_products.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_products TO authenticated;

ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS active_supplier_product_id uuid REFERENCES public.supplier_products (id) ON DELETE SET NULL;

-- PO number sequence per venue per year
CREATE TABLE public.purchase_order_number_sequences (
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (venue_id, year)
);

CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers (id) ON DELETE RESTRICT,
  po_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  expected_delivery_date date,
  actual_delivery_date date,
  subtotal_cents integer NOT NULL DEFAULT 0,
  gst_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  gst_treatment text NOT NULL DEFAULT 'exclusive',
  notes text,
  partial_delivery_flag boolean NOT NULL DEFAULT false,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  confirmed_at timestamptz,
  delivered_at timestamptz,
  closed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  approval_status text,
  approved_by_user_id uuid,
  approval_comment text,
  rejected_at timestamptz,
  linked_invoice_id uuid,
  CONSTRAINT purchase_orders_status_chk CHECK (
    status IN (
      'draft',
      'pending_approval',
      'submitted',
      'confirmed',
      'delivered',
      'closed',
      'cancelled'
    )
  ),
  CONSTRAINT purchase_orders_approval_status_chk CHECK (
    approval_status IS NULL
    OR approval_status IN ('pending', 'approved', 'rejected')
  ),
  CONSTRAINT purchase_orders_gst_treatment_chk CHECK (gst_treatment IN ('inclusive', 'exclusive')),
  CONSTRAINT purchase_orders_venue_po_number_uq UNIQUE (venue_id, po_number)
);

CREATE INDEX idx_purchase_orders_venue_status ON public.purchase_orders (venue_id, status);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders (supplier_id, created_at DESC);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchase_orders_all ON public.purchase_orders
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = purchase_orders.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = purchase_orders.organisation_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;

CREATE TABLE public.purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders (id) ON DELETE CASCADE,
  supplier_product_id uuid REFERENCES public.supplier_products (id) ON DELETE SET NULL,
  ingredient_id uuid REFERENCES public.ingredients (id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity_ordered numeric NOT NULL DEFAULT 0,
  quantity_received numeric NOT NULL DEFAULT 0,
  unit_price_cents integer NOT NULL DEFAULT 0,
  subtotal_cents integer NOT NULL DEFAULT 0,
  notes text,
  is_outstanding boolean NOT NULL DEFAULT false,
  outstanding_resolution text,
  expected_delivery_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_order_lines_outstanding_resolution_chk CHECK (
    outstanding_resolution IS NULL
    OR outstanding_resolution IN ('expect_later', 'cancel_remainder', 'credit_owed')
  )
);

CREATE INDEX idx_purchase_order_lines_po ON public.purchase_order_lines (po_id);

ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchase_order_lines_all ON public.purchase_order_lines
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      INNER JOIN public.user_organisations uo ON uo.organisation_id = po.organisation_id
      WHERE po.id = purchase_order_lines.po_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      INNER JOIN public.user_organisations uo ON uo.organisation_id = po.organisation_id
      WHERE po.id = purchase_order_lines.po_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_lines TO authenticated;

CREATE TABLE public.purchase_order_receiving_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders (id) ON DELETE CASCADE,
  received_at timestamptz NOT NULL DEFAULT now(),
  received_by_user_id uuid,
  quantities_received jsonb NOT NULL DEFAULT '{}',
  notes text,
  over_receipt_resolution jsonb
);

CREATE INDEX idx_po_receiving_events_po ON public.purchase_order_receiving_events (po_id, received_at DESC);

ALTER TABLE public.purchase_order_receiving_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchase_order_receiving_events_all ON public.purchase_order_receiving_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      INNER JOIN public.user_organisations uo ON uo.organisation_id = po.organisation_id
      WHERE po.id = purchase_order_receiving_events.po_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      INNER JOIN public.user_organisations uo ON uo.organisation_id = po.organisation_id
      WHERE po.id = purchase_order_receiving_events.po_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_receiving_events TO authenticated;

CREATE TABLE public.purchase_order_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders (id) ON DELETE CASCADE,
  direction text NOT NULL,
  from_address text NOT NULL,
  to_address text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]',
  sent_at timestamptz,
  received_at timestamptz,
  provider_message_id text,
  CONSTRAINT purchase_order_emails_direction_chk CHECK (direction IN ('outbound', 'inbound'))
);

CREATE INDEX idx_purchase_order_emails_po ON public.purchase_order_emails (po_id, sent_at DESC NULLS LAST);

ALTER TABLE public.purchase_order_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchase_order_emails_all ON public.purchase_order_emails
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      INNER JOIN public.user_organisations uo ON uo.organisation_id = po.organisation_id
      WHERE po.id = purchase_order_emails.po_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      INNER JOIN public.user_organisations uo ON uo.organisation_id = po.organisation_id
      WHERE po.id = purchase_order_emails.po_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_emails TO authenticated;

CREATE TABLE public.purchase_order_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  changed_by_user_id uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_order_audit_po ON public.purchase_order_audit_log (po_id, changed_at DESC);

ALTER TABLE public.purchase_order_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchase_order_audit_log_select ON public.purchase_order_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      INNER JOIN public.user_organisations uo ON uo.organisation_id = po.organisation_id
      WHERE po.id = purchase_order_audit_log.po_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY purchase_order_audit_log_insert ON public.purchase_order_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      INNER JOIN public.user_organisations uo ON uo.organisation_id = po.organisation_id
      WHERE po.id = purchase_order_audit_log.po_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT ON public.purchase_order_audit_log TO authenticated;

CREATE TABLE public.order_guide_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  computed_at timestamptz NOT NULL DEFAULT now(),
  forecast_horizon_days integer NOT NULL,
  period_preset text NOT NULL DEFAULT 'lead_time',
  suggestions jsonb NOT NULL DEFAULT '[]',
  meta jsonb NOT NULL DEFAULT '{}',
  CONSTRAINT order_guide_cache_venue_uq UNIQUE (venue_id)
);

ALTER TABLE public.order_guide_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_guide_cache_select ON public.order_guide_cache
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venues v
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = order_guide_cache.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY order_guide_cache_upsert ON public.order_guide_cache
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venues v
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = order_guide_cache.venue_id
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
      WHERE v.id = order_guide_cache.venue_id
        AND uo.user_profile_id = auth.uid()
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_guide_cache TO authenticated;

-- Link invoices to POs when matched
ALTER TABLE public.venue_xero_invoices
  ADD COLUMN IF NOT EXISTS purchase_order_id uuid REFERENCES public.purchase_orders (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS venue_xero_invoices_po_idx
  ON public.venue_xero_invoices (purchase_order_id)
  WHERE purchase_order_id IS NOT NULL;

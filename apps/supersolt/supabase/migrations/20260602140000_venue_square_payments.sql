-- Mirror Square payment headers for fast sales reads (see docs/features/insights-platform/square-sales-mirror).

ALTER TABLE public.venue_forecast_state
  ADD COLUMN IF NOT EXISTS last_payments_sync_at timestamptz;

CREATE TABLE public.venue_square_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  square_payment_id text NOT NULL,
  square_order_id text,
  order_datetime timestamptz NOT NULL,
  order_number text,
  channel text NOT NULL DEFAULT 'pos',
  gross_amount_cents bigint NOT NULL DEFAULT 0,
  tax_amount_cents bigint NOT NULL DEFAULT 0,
  net_amount_cents bigint NOT NULL DEFAULT 0,
  discount_amount_cents bigint NOT NULL DEFAULT 0,
  is_void boolean NOT NULL DEFAULT false,
  is_refund boolean NOT NULL DEFAULT false,
  refund_reason text,
  payment_method text,
  square_status text,
  square_source_type text,
  square_location_id text,
  receipt_url text,
  receipt_number text,
  square_created_at timestamptz,
  square_updated_at timestamptz,
  observed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_square_payments_uq UNIQUE (venue_id, square_payment_id)
);

CREATE INDEX venue_square_payments_venue_datetime_idx
  ON public.venue_square_payments (venue_id, order_datetime DESC);

CREATE INDEX venue_square_payments_venue_square_updated_idx
  ON public.venue_square_payments (venue_id, square_updated_at DESC NULLS LAST);

ALTER TABLE public.venue_square_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY venue_square_payments_select ON public.venue_square_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organisations uo
      WHERE uo.user_profile_id = (SELECT auth.uid())
        AND uo.organisation_id = venue_square_payments.organisation_id
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT ON public.venue_square_payments TO authenticated;

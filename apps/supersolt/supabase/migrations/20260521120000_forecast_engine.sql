-- Forecast Engine: daily_sales aggregates, forecasts, per-venue state.

CREATE TABLE public.daily_sales (
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  date date NOT NULL,
  revenue_cents bigint NOT NULL DEFAULT 0,
  orders_count integer NOT NULL DEFAULT 0,
  avg_check_cents bigint NOT NULL DEFAULT 0,
  refunds_count integer NOT NULL DEFAULT 0,
  refunds_value_cents bigint NOT NULL DEFAULT 0,
  voids_count integer NOT NULL DEFAULT 0,
  dine_in_revenue_cents bigint NOT NULL DEFAULT 0,
  pick_up_revenue_cents bigint NOT NULL DEFAULT 0,
  delivery_revenue_cents bigint NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'square',
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (venue_id, date)
);

CREATE INDEX daily_sales_venue_date_idx ON public.daily_sales (venue_id, date DESC);

ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_sales_select ON public.daily_sales
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venues v
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = daily_sales.venue_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT ON public.daily_sales TO authenticated;

CREATE TABLE public.forecasts (
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  date date NOT NULL,
  metric text NOT NULL,
  forecast_value numeric NOT NULL,
  confidence text NOT NULL,
  confidence_lower_bound numeric,
  confidence_upper_bound numeric,
  inputs jsonb NOT NULL DEFAULT '{}',
  is_anomaly_flagged boolean NOT NULL DEFAULT false,
  anomaly_resolution text,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (venue_id, date, metric),
  CONSTRAINT forecasts_metric_chk CHECK (metric IN ('revenue', 'orders', 'avg_check')),
  CONSTRAINT forecasts_confidence_chk CHECK (confidence IN ('low', 'medium', 'high')),
  CONSTRAINT forecasts_anomaly_resolution_chk CHECK (
    anomaly_resolution IS NULL
    OR anomaly_resolution IN ('one_off', 'include_in_baseline')
  )
);

CREATE INDEX forecasts_venue_date_idx ON public.forecasts (venue_id, date);

ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY forecasts_select ON public.forecasts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venues v
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = forecasts.venue_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT ON public.forecasts TO authenticated;

CREATE TABLE public.venue_forecast_state (
  venue_id uuid PRIMARY KEY REFERENCES public.venues (id) ON DELETE CASCADE,
  available_history_days integer NOT NULL DEFAULT 0,
  forecast_ready boolean NOT NULL DEFAULT false,
  backfill_status text NOT NULL DEFAULT 'idle',
  backfill_progress jsonb,
  data_starts_from date,
  last_daily_sales_sync_at timestamptz,
  last_computed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_forecast_state_backfill_status_chk CHECK (
    backfill_status IN ('idle', 'running', 'complete', 'failed')
  )
);

ALTER TABLE public.venue_forecast_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY venue_forecast_state_select ON public.venue_forecast_state
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venues v
      INNER JOIN public.user_organisations uo ON uo.organisation_id = v.organisation_id
      WHERE v.id = venue_forecast_state.venue_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

GRANT SELECT ON public.venue_forecast_state TO authenticated;

-- Cross-module proactive insights cards (Sales, Labour, Inventory, Agent, Dashboard).

CREATE TABLE public.insights_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid REFERENCES public.venues (id) ON DELETE CASCADE,
  module text NOT NULL,
  severity text NOT NULL DEFAULT 'notable',
  headline text NOT NULL,
  supporting_metric text,
  destination_key text,
  destination_payload jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  dismissed_at timestamptz,
  dismissed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  source_run_id text,
  CONSTRAINT insights_alerts_module_chk CHECK (
    module IN ('sales', 'labour', 'inventory', 'forecast')
  ),
  CONSTRAINT insights_alerts_severity_chk CHECK (
    severity IN ('urgent', 'notable', 'informational')
  )
);

CREATE INDEX insights_alerts_venue_active_idx ON public.insights_alerts (
  venue_id,
  detected_at DESC
)
WHERE dismissed_at IS NULL;

ALTER TABLE public.insights_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY insights_alerts_select ON public.insights_alerts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = insights_alerts.organisation_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND (
          insights_alerts.venue_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.user_venues uv
            WHERE uv.venue_id = insights_alerts.venue_id
              AND uv.user_organisation_id = uo.id
              AND uv.is_active = true
              AND uv.archived_at IS NULL
          )
        )
    )
  );

CREATE POLICY insights_alerts_update_dismiss ON public.insights_alerts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = insights_alerts.organisation_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
        AND (
          insights_alerts.venue_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.user_venues uv
            WHERE uv.venue_id = insights_alerts.venue_id
              AND uv.user_organisation_id = uo.id
              AND uv.is_active = true
              AND uv.archived_at IS NULL
          )
        )
    )
  )
  WITH CHECK (
    dismissed_at IS NOT NULL
    AND dismissed_by = (SELECT auth.uid())
  );

GRANT SELECT, UPDATE ON public.insights_alerts TO authenticated;

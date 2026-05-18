-- Per-user dashboard UI scope (time window, venue selection) and cached agent digest rows.
-- RLS: rows are owned by auth.uid() and restricted to organisations the user belongs to.

CREATE TABLE public.dashboard_user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  time_window text NOT NULL DEFAULT 'today',
  venue_scope_mode text NOT NULL DEFAULT 'all',
  selected_venue_ids uuid[] NULL,
  custom_range_start date NULL,
  custom_range_end date NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dashboard_user_preferences_time_window_chk CHECK (
    time_window = ANY (
      ARRAY[
        'today'::text,
        'yesterday'::text,
        'this_week'::text,
        'last_week'::text,
        'this_month'::text,
        'last_month'::text,
        'custom'::text
      ]
    )
  ),
  CONSTRAINT dashboard_user_preferences_venue_scope_chk CHECK (
    venue_scope_mode = ANY (ARRAY['all'::text, 'single'::text, 'selected'::text])
  ),
  CONSTRAINT dashboard_user_preferences_custom_range_chk CHECK (
    (time_window <> 'custom' AND custom_range_start IS NULL AND custom_range_end IS NULL)
    OR (
      time_window = 'custom'
      AND custom_range_start IS NOT NULL
      AND custom_range_end IS NOT NULL
      AND custom_range_end >= custom_range_start
    )
  ),
  CONSTRAINT dashboard_user_preferences_user_org_uq UNIQUE (user_profile_id, organisation_id)
);

CREATE INDEX dashboard_user_preferences_org_idx
  ON public.dashboard_user_preferences (organisation_id);

CREATE TABLE public.agent_digest_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  digest_date date NOT NULL,
  body_md text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_digest_cache_user_org_day_uq UNIQUE (user_profile_id, organisation_id, digest_date)
);

CREATE INDEX agent_digest_cache_lookup_idx
  ON public.agent_digest_cache (user_profile_id, organisation_id, digest_date DESC);

ALTER TABLE public.dashboard_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_digest_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY dashboard_user_preferences_select ON public.dashboard_user_preferences
  FOR SELECT TO authenticated
  USING (
    user_profile_id = (SELECT auth.uid())
    AND organisation_id IN (SELECT public.current_user_org_ids())
  );

CREATE POLICY dashboard_user_preferences_insert ON public.dashboard_user_preferences
  FOR INSERT TO authenticated
  WITH CHECK (
    user_profile_id = (SELECT auth.uid())
    AND organisation_id IN (SELECT public.current_user_org_ids())
  );

CREATE POLICY dashboard_user_preferences_update ON public.dashboard_user_preferences
  FOR UPDATE TO authenticated
  USING (
    user_profile_id = (SELECT auth.uid())
    AND organisation_id IN (SELECT public.current_user_org_ids())
  )
  WITH CHECK (
    user_profile_id = (SELECT auth.uid())
    AND organisation_id IN (SELECT public.current_user_org_ids())
  );

CREATE POLICY dashboard_user_preferences_delete ON public.dashboard_user_preferences
  FOR DELETE TO authenticated
  USING (
    user_profile_id = (SELECT auth.uid())
    AND organisation_id IN (SELECT public.current_user_org_ids())
  );

CREATE POLICY agent_digest_cache_select ON public.agent_digest_cache
  FOR SELECT TO authenticated
  USING (
    user_profile_id = (SELECT auth.uid())
    AND organisation_id IN (SELECT public.current_user_org_ids())
  );

CREATE POLICY agent_digest_cache_insert ON public.agent_digest_cache
  FOR INSERT TO authenticated
  WITH CHECK (
    user_profile_id = (SELECT auth.uid())
    AND organisation_id IN (SELECT public.current_user_org_ids())
  );

CREATE POLICY agent_digest_cache_update ON public.agent_digest_cache
  FOR UPDATE TO authenticated
  USING (
    user_profile_id = (SELECT auth.uid())
    AND organisation_id IN (SELECT public.current_user_org_ids())
  )
  WITH CHECK (
    user_profile_id = (SELECT auth.uid())
    AND organisation_id IN (SELECT public.current_user_org_ids())
  );

CREATE POLICY agent_digest_cache_delete ON public.agent_digest_cache
  FOR DELETE TO authenticated
  USING (
    user_profile_id = (SELECT auth.uid())
    AND organisation_id IN (SELECT public.current_user_org_ids())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_user_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_digest_cache TO authenticated;

-- Per-user venue readiness UI state (dismissed Superbot cards, seen unlock celebrations).

CREATE TABLE public.venue_readiness_user_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  dismissed_suggestion_keys text[] NOT NULL DEFAULT '{}'::text[],
  seen_unlock_module_ids text[] NOT NULL DEFAULT '{}'::text[],
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_readiness_user_state_user_venue_uq UNIQUE (user_profile_id, venue_id)
);

CREATE INDEX venue_readiness_user_state_venue_idx
  ON public.venue_readiness_user_state (venue_id);

ALTER TABLE public.venue_readiness_user_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY venue_readiness_user_state_select ON public.venue_readiness_user_state
  FOR SELECT TO authenticated
  USING (
    user_profile_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_venues uv
      INNER JOIN public.user_organisations uo ON uo.id = uv.user_organisation_id
      WHERE uv.venue_id = venue_readiness_user_state.venue_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uv.is_active = true
        AND uv.archived_at IS NULL
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY venue_readiness_user_state_insert ON public.venue_readiness_user_state
  FOR INSERT TO authenticated
  WITH CHECK (
    user_profile_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_venues uv
      INNER JOIN public.user_organisations uo ON uo.id = uv.user_organisation_id
      WHERE uv.venue_id = venue_readiness_user_state.venue_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uv.is_active = true
        AND uv.archived_at IS NULL
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY venue_readiness_user_state_update ON public.venue_readiness_user_state
  FOR UPDATE TO authenticated
  USING (
    user_profile_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_venues uv
      INNER JOIN public.user_organisations uo ON uo.id = uv.user_organisation_id
      WHERE uv.venue_id = venue_readiness_user_state.venue_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uv.is_active = true
        AND uv.archived_at IS NULL
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  )
  WITH CHECK (user_profile_id = (SELECT auth.uid()));

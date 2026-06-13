-- Tracks inventory setup Xero import progress for realtime UI updates.

CREATE TABLE public.inventory_setup_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  current_step_id text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  result jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_setup_import_jobs_venue_created_idx
  ON public.inventory_setup_import_jobs (venue_id, created_at DESC);

ALTER TABLE public.inventory_setup_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_setup_import_jobs_select ON public.inventory_setup_import_jobs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = inventory_setup_import_jobs.organisation_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

CREATE POLICY inventory_setup_import_jobs_insert ON public.inventory_setup_import_jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by_user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_organisations uo
      WHERE uo.organisation_id = inventory_setup_import_jobs.organisation_id
        AND uo.user_profile_id = (SELECT auth.uid())
        AND uo.is_active = true
        AND uo.archived_at IS NULL
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_setup_import_jobs;

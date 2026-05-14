-- Upload job queue for utility lineup videos (per-user, background upload + finalize).
-- Keep in sync with apps/intradark/drizzle/0014_utility_lineup_upload_jobs.sql

CREATE TABLE IF NOT EXISTS public.utility_lineup_upload_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_profile_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (
    status = ANY (
      ARRAY[
        'queued'::text,
        'uploading'::text,
        'finalizing'::text,
        'completed'::text,
        'failed'::text,
        'cancelled'::text
      ]
    )
  ),
  payload_json jsonb NOT NULL,
  video_object_path text NOT NULL,
  expected_byte_length integer NOT NULL,
  error_message text,
  lineup_id uuid REFERENCES public.utility_lineups(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS utility_lineup_upload_jobs_profile_status_idx
  ON public.utility_lineup_upload_jobs (author_profile_id, status, created_at DESC);

ALTER TABLE public.utility_lineup_upload_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS utility_lineup_upload_jobs_select_own ON public.utility_lineup_upload_jobs;
CREATE POLICY utility_lineup_upload_jobs_select_own ON public.utility_lineup_upload_jobs
  AS PERMISSIVE FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = utility_lineup_upload_jobs.author_profile_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS utility_lineup_upload_jobs_insert_own ON public.utility_lineup_upload_jobs;
CREATE POLICY utility_lineup_upload_jobs_insert_own ON public.utility_lineup_upload_jobs
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = utility_lineup_upload_jobs.author_profile_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS utility_lineup_upload_jobs_update_own ON public.utility_lineup_upload_jobs;
CREATE POLICY utility_lineup_upload_jobs_update_own ON public.utility_lineup_upload_jobs
  AS PERMISSIVE FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = utility_lineup_upload_jobs.author_profile_id
        AND up.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = utility_lineup_upload_jobs.author_profile_id
        AND up.user_id = auth.uid()
    )
  );

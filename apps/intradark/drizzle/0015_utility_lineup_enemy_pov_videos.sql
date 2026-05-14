-- Enemy POV companion videos for utility lineups.
-- Mirror to supabase/migrations for remote apply.

CREATE TABLE IF NOT EXISTS public.utility_lineup_enemy_pov_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lineup_id uuid NOT NULL REFERENCES public.utility_lineups(id) ON DELETE CASCADE,
  author_profile_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  video_object_path text NOT NULL,
  description text,
  video_start_ms integer NOT NULL DEFAULT 0,
  video_end_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT utility_lineup_enemy_pov_videos_video_end_after_start CHECK (
    video_end_ms IS NULL OR video_end_ms > video_start_ms
  )
);

CREATE INDEX IF NOT EXISTS utility_lineup_enemy_pov_videos_lineup_id_idx
  ON public.utility_lineup_enemy_pov_videos (lineup_id);

CREATE INDEX IF NOT EXISTS utility_lineup_enemy_pov_videos_author_idx
  ON public.utility_lineup_enemy_pov_videos (author_profile_id);

ALTER TABLE public.utility_lineup_enemy_pov_videos ENABLE ROW LEVEL SECURITY;

-- Public can read enemy POV rows tied to a published lineup.
DROP POLICY IF EXISTS utility_lineup_enemy_pov_videos_select_published ON public.utility_lineup_enemy_pov_videos;
CREATE POLICY utility_lineup_enemy_pov_videos_select_published ON public.utility_lineup_enemy_pov_videos
  AS PERMISSIVE FOR SELECT TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM public.utility_lineups ul
      WHERE ul.id = utility_lineup_enemy_pov_videos.lineup_id
        AND ul.status = 'published'
    )
  );

-- Authors can read their own rows attached to a pending or published lineup they own.
DROP POLICY IF EXISTS utility_lineup_enemy_pov_videos_select_own ON public.utility_lineup_enemy_pov_videos;
CREATE POLICY utility_lineup_enemy_pov_videos_select_own ON public.utility_lineup_enemy_pov_videos
  AS PERMISSIVE FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = utility_lineup_enemy_pov_videos.author_profile_id
        AND up.user_id = auth.uid()
    )
  );

-- Authors can insert their own enemy POV rows for a lineup they own.
DROP POLICY IF EXISTS utility_lineup_enemy_pov_videos_insert_own ON public.utility_lineup_enemy_pov_videos;
CREATE POLICY utility_lineup_enemy_pov_videos_insert_own ON public.utility_lineup_enemy_pov_videos
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = utility_lineup_enemy_pov_videos.author_profile_id
        AND up.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.utility_lineups ul
      JOIN public.user_profiles up2 ON up2.id = ul.author_profile_id
      WHERE ul.id = utility_lineup_enemy_pov_videos.lineup_id
        AND up2.user_id = auth.uid()
    )
  );

-- Authors can update their own enemy POV rows.
DROP POLICY IF EXISTS utility_lineup_enemy_pov_videos_update_own ON public.utility_lineup_enemy_pov_videos;
CREATE POLICY utility_lineup_enemy_pov_videos_update_own ON public.utility_lineup_enemy_pov_videos
  AS PERMISSIVE FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = utility_lineup_enemy_pov_videos.author_profile_id
        AND up.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = utility_lineup_enemy_pov_videos.author_profile_id
        AND up.user_id = auth.uid()
    )
  );

-- Discriminate upload jobs by kind so the same queue serves both videos.
ALTER TABLE public.utility_lineup_upload_jobs
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'lineup';
ALTER TABLE public.utility_lineup_upload_jobs
  ADD COLUMN IF NOT EXISTS parent_lineup_id uuid REFERENCES public.utility_lineups(id) ON DELETE CASCADE;
ALTER TABLE public.utility_lineup_upload_jobs
  ADD COLUMN IF NOT EXISTS enemy_pov_video_id uuid REFERENCES public.utility_lineup_enemy_pov_videos(id) ON DELETE SET NULL;

ALTER TABLE public.utility_lineup_upload_jobs
  DROP CONSTRAINT IF EXISTS utility_lineup_upload_jobs_kind_check;
ALTER TABLE public.utility_lineup_upload_jobs
  ADD CONSTRAINT utility_lineup_upload_jobs_kind_check
  CHECK (kind IN ('lineup', 'enemy_pov'));

-- Enemy POV jobs must reference a parent lineup; main lineup jobs must not.
ALTER TABLE public.utility_lineup_upload_jobs
  DROP CONSTRAINT IF EXISTS utility_lineup_upload_jobs_kind_parent_check;
ALTER TABLE public.utility_lineup_upload_jobs
  ADD CONSTRAINT utility_lineup_upload_jobs_kind_parent_check CHECK (
    (kind = 'enemy_pov' AND parent_lineup_id IS NOT NULL)
    OR (kind = 'lineup' AND parent_lineup_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS utility_lineup_upload_jobs_kind_status_idx
  ON public.utility_lineup_upload_jobs (kind, status, created_at DESC);

CREATE INDEX IF NOT EXISTS utility_lineup_upload_jobs_parent_lineup_idx
  ON public.utility_lineup_upload_jobs (parent_lineup_id);

-- Allow uploads to the new enemy-pov object key shape under utility/enemy-pov/...
DROP POLICY IF EXISTS intradark_media_insert_utility_enemy_pov_video ON storage.objects;
CREATE POLICY intradark_media_insert_utility_enemy_pov_video ON storage.objects
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'intradark-media'
    AND name ~ '^utility/enemy-pov/[a-zA-Z0-9._-]+/(smoke|flashbang|hegrenade|molotov)/[^/]+$'
  );

DROP POLICY IF EXISTS intradark_media_update_utility_enemy_pov_video ON storage.objects;
CREATE POLICY intradark_media_update_utility_enemy_pov_video ON storage.objects
  AS PERMISSIVE FOR UPDATE TO authenticated USING (
    bucket_id = 'intradark-media'
    AND name ~ '^utility/enemy-pov/[a-zA-Z0-9._-]+/(smoke|flashbang|hegrenade|molotov)/[^/]+$'
  ) WITH CHECK (
    bucket_id = 'intradark-media'
    AND name ~ '^utility/enemy-pov/[a-zA-Z0-9._-]+/(smoke|flashbang|hegrenade|molotov)/[^/]+$'
  );

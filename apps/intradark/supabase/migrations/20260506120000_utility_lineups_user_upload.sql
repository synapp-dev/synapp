-- User-uploaded utility lineup videos: pending status, storage path, bucket limits, RLS, storage policy.
-- Keep in sync with apps/intradark/drizzle/0012_utility_lineups_user_upload.sql
-- Per-bucket file_size_limit cannot exceed the project Storage global limit (50 MiB on Free tier).

ALTER TABLE public.utility_lineups DROP CONSTRAINT IF EXISTS utility_lineups_status_check;
ALTER TABLE public.utility_lineups ADD CONSTRAINT utility_lineups_status_check CHECK (
  status::text = ANY (ARRAY['draft', 'published', 'pending']::text[])
);

ALTER TABLE public.utility_lineups ADD COLUMN IF NOT EXISTS video_object_path text;
ALTER TABLE public.utility_lineups ALTER COLUMN youtube_url DROP NOT NULL;

ALTER TABLE public.utility_lineups DROP CONSTRAINT IF EXISTS utility_lineups_video_source_check;
ALTER TABLE public.utility_lineups ADD CONSTRAINT utility_lineups_video_source_check CHECK (
  status::text = 'draft'::text
  OR NULLIF(btrim(COALESCE(youtube_url, '')), '') IS NOT NULL
  OR NULLIF(btrim(COALESCE(video_object_path, '')), '') IS NOT NULL
);

CREATE INDEX IF NOT EXISTS utility_lineups_status_created_idx
  ON public.utility_lineups (status, created_at DESC)
  WHERE status = 'pending';

DROP POLICY IF EXISTS utility_lineups_select_own_pending ON public.utility_lineups;
CREATE POLICY utility_lineups_select_own_pending ON public.utility_lineups
  AS PERMISSIVE FOR SELECT TO authenticated USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = utility_lineups.author_profile_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS utility_lineups_insert_own_pending ON public.utility_lineups;
CREATE POLICY utility_lineups_insert_own_pending ON public.utility_lineups
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = utility_lineups.author_profile_id
        AND up.user_id = auth.uid()
    )
  );

UPDATE storage.buckets
SET
  file_size_limit = 262144000,
  allowed_mime_types = ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]::text[]
WHERE id = 'intradark-media';

DROP POLICY IF EXISTS intradark_media_insert_utility_lineup_video ON storage.objects;
CREATE POLICY intradark_media_insert_utility_lineup_video ON storage.objects
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'intradark-media'
    AND name ~ '^utility/[a-zA-Z0-9._-]+/(smoke|flashbang|hegrenade|molotov)/[^/]+$'
  );

DROP POLICY IF EXISTS intradark_media_update_utility_lineup_video ON storage.objects;
CREATE POLICY intradark_media_update_utility_lineup_video ON storage.objects
  AS PERMISSIVE FOR UPDATE TO authenticated USING (
    bucket_id = 'intradark-media'
    AND name ~ '^utility/[a-zA-Z0-9._-]+/(smoke|flashbang|hegrenade|molotov)/[^/]+$'
  ) WITH CHECK (
    bucket_id = 'intradark-media'
    AND name ~ '^utility/[a-zA-Z0-9._-]+/(smoke|flashbang|hegrenade|molotov)/[^/]+$'
  );

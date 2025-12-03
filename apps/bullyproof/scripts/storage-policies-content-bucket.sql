-- Storage policies for the 'content' bucket
-- Allows authenticated users to read, and PLATFORM_ADMIN to read/write
--
-- To run this script:
-- 1. Make sure the 'content' bucket exists in Supabase Storage
-- 2. Run this SQL script in your Supabase SQL editor
-- 3. The bucket should be created with public: false (private bucket)
--
-- Note: RLS is enabled by default on storage.objects in Supabase

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "content_bucket_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "content_bucket_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "content_bucket_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "content_bucket_delete_policy" ON storage.objects;

-- Policy: Allow all authenticated users to SELECT (read) from content bucket
CREATE POLICY "content_bucket_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'content');

-- Policy: Allow PLATFORM_ADMIN to INSERT (upload) to content bucket
CREATE POLICY "content_bucket_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content' 
  AND has_any_role(ARRAY['PLATFORM_ADMIN'::text], NULL::uuid)
);

-- Policy: Allow PLATFORM_ADMIN to UPDATE files in content bucket
CREATE POLICY "content_bucket_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'content' 
  AND has_any_role(ARRAY['PLATFORM_ADMIN'::text], NULL::uuid)
)
WITH CHECK (
  bucket_id = 'content' 
  AND has_any_role(ARRAY['PLATFORM_ADMIN'::text], NULL::uuid)
);

-- Policy: Allow PLATFORM_ADMIN to DELETE files from content bucket
CREATE POLICY "content_bucket_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'content' 
  AND has_any_role(ARRAY['PLATFORM_ADMIN'::text], NULL::uuid)
);

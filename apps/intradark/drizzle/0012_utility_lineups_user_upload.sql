-- User-uploaded utility lineup videos: pending status, storage path, bucket limits, RLS, storage policy.
-- Note: `storage.buckets.file_size_limit` cannot exceed the project Storage *global* limit (50 MiB on Free).
-- Raise the global limit in the Supabase Dashboard before relying on large per-bucket limits.

--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" DROP CONSTRAINT IF EXISTS "utility_lineups_status_check";
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD CONSTRAINT "utility_lineups_status_check" CHECK (
	("status")::text = ANY (
		(ARRAY['draft'::character varying, 'published'::character varying, 'pending'::character varying])::text[]
	)
);
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD COLUMN IF NOT EXISTS "video_object_path" text;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ALTER COLUMN "youtube_url" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" DROP CONSTRAINT IF EXISTS "utility_lineups_video_source_check";
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD CONSTRAINT "utility_lineups_video_source_check" CHECK (
	("status")::text = 'draft'::text
	OR NULLIF(btrim(COALESCE("youtube_url", '')), '') IS NOT NULL
	OR NULLIF(btrim(COALESCE("video_object_path", '')), '') IS NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "utility_lineups_status_created_idx"
	ON "public"."utility_lineups" USING btree ("status", "created_at" DESC)
	WHERE "status" = 'pending';
--> statement-breakpoint
DROP POLICY IF EXISTS "utility_lineups_select_own_pending" ON "public"."utility_lineups";
--> statement-breakpoint
CREATE POLICY "utility_lineups_select_own_pending" ON "public"."utility_lineups" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
	"status" = 'pending'
	AND EXISTS (
		SELECT 1 FROM "public"."user_profiles" "up"
		WHERE "up"."id" = "utility_lineups"."author_profile_id"
			AND "up"."user_id" = auth.uid()
	)
);
--> statement-breakpoint
DROP POLICY IF EXISTS "utility_lineups_insert_own_pending" ON "public"."utility_lineups";
--> statement-breakpoint
CREATE POLICY "utility_lineups_insert_own_pending" ON "public"."utility_lineups" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
	"status" = 'pending'
	AND EXISTS (
		SELECT 1 FROM "public"."user_profiles" "up"
		WHERE "up"."id" = "utility_lineups"."author_profile_id"
			AND "up"."user_id" = auth.uid()
	)
);
--> statement-breakpoint
UPDATE "storage"."buckets"
SET
	"file_size_limit" = 262144000,
	"allowed_mime_types" = ARRAY[
		'image/png',
		'image/jpeg',
		'image/webp',
		'image/gif',
		'video/mp4',
		'video/webm',
		'video/quicktime'
	]::text[]
WHERE "id" = 'intradark-media';
--> statement-breakpoint
DROP POLICY IF EXISTS "intradark_media_insert_utility_lineup_video" ON "storage"."objects";
--> statement-breakpoint
CREATE POLICY "intradark_media_insert_utility_lineup_video" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
	"bucket_id" = 'intradark-media'
	AND "name" ~ '^utility/[a-zA-Z0-9._-]+/(smoke|flashbang|hegrenade|molotov)/[^/]+$'
);
--> statement-breakpoint
DROP POLICY IF EXISTS "intradark_media_update_utility_lineup_video" ON "storage"."objects";
--> statement-breakpoint
CREATE POLICY "intradark_media_update_utility_lineup_video" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
	"bucket_id" = 'intradark-media'
	AND "name" ~ '^utility/[a-zA-Z0-9._-]+/(smoke|flashbang|hegrenade|molotov)/[^/]+$'
) WITH CHECK (
	"bucket_id" = 'intradark-media'
	AND "name" ~ '^utility/[a-zA-Z0-9._-]+/(smoke|flashbang|hegrenade|molotov)/[^/]+$'
);

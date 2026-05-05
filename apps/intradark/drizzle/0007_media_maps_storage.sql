-- Canonical CS maps + pools; migrate off utility_maps; intradark-media storage bucket.

CREATE TABLE "public"."map_pools" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "map_pools_slug_key" ON "public"."map_pools" USING btree ("slug");
--> statement-breakpoint
ALTER TABLE "public"."map_pools" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "map_pools_select_all" ON "public"."map_pools" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);
--> statement-breakpoint
INSERT INTO "public"."map_pools" ("id", "slug", "display_name", "sort_order") VALUES
	('a1111111-1111-4111-8111-111111111101', 'active_duty', 'Active Duty', 0),
	('a1111111-1111-4111-8111-111111111102', 'reserve', 'Reserve', 1),
	('a1111111-1111-4111-8111-111111111103', 'community', 'Community', 2);
--> statement-breakpoint
CREATE TABLE "public"."maps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game" varchar(32) DEFAULT 'cs2' NOT NULL,
	"slug" varchar(128) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"pool_id" uuid NOT NULL,
	"radar_image_url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."maps" ADD CONSTRAINT "maps_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "public"."map_pools"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "maps_slug_key" ON "public"."maps" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "maps_is_active_sort_idx" ON "public"."maps" USING btree ("is_active", "sort_order");
--> statement-breakpoint
CREATE INDEX "maps_pool_id_idx" ON "public"."maps" USING btree ("pool_id");
--> statement-breakpoint
INSERT INTO "public"."maps" ("id", "game", "slug", "display_name", "pool_id", "radar_image_url", "is_active", "sort_order", "created_at", "updated_at")
SELECT
	"um"."id",
	'cs2',
	"um"."slug",
	"um"."display_name",
	(SELECT "mp"."id" FROM "public"."map_pools" "mp" WHERE "mp"."slug" = 'active_duty' LIMIT 1),
	"um"."radar_image_url",
	"um"."is_active",
	"um"."sort_order",
	"um"."created_at",
	"um"."updated_at"
FROM "public"."utility_maps" "um";
--> statement-breakpoint
ALTER TABLE "public"."utility_map_spots" DROP CONSTRAINT "utility_map_spots_map_id_fkey";
--> statement-breakpoint
ALTER TABLE "public"."utility_map_spots" ADD CONSTRAINT "utility_map_spots_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" DROP CONSTRAINT "utility_lineups_map_id_fkey";
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD CONSTRAINT "utility_lineups_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
DROP POLICY IF EXISTS "utility_map_spots_select_public" ON "public"."utility_map_spots";
--> statement-breakpoint
DROP POLICY IF EXISTS "utility_maps_select_public" ON "public"."utility_maps";
--> statement-breakpoint
DROP TABLE "public"."utility_maps";
--> statement-breakpoint
CREATE POLICY "utility_map_spots_select_public" ON "public"."utility_map_spots" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (
	EXISTS (
		SELECT 1 FROM "public"."maps" "m"
		WHERE "m"."id" = "utility_map_spots"."map_id" AND "m"."is_active" = true
	)
);
--> statement-breakpoint
ALTER TABLE "public"."maps" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "maps_select" ON "public"."maps" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (
	("is_active" = true)
	OR EXISTS (
		SELECT 1
		FROM "public"."user_roles" "ur"
		INNER JOIN "public"."roles" "r" ON "r"."id" = "ur"."role_id"
		INNER JOIN "public"."user_profiles" "up" ON "up"."id" = "ur"."user_profile_id"
		WHERE "up"."user_id" = auth.uid()
			AND "r"."slug" = 'developer'
	)
);
--> statement-breakpoint
CREATE POLICY "maps_insert_developer" ON "public"."maps" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
	EXISTS (
		SELECT 1
		FROM "public"."user_roles" "ur"
		INNER JOIN "public"."roles" "r" ON "r"."id" = "ur"."role_id"
		INNER JOIN "public"."user_profiles" "up" ON "up"."id" = "ur"."user_profile_id"
		WHERE "up"."user_id" = auth.uid()
			AND "r"."slug" = 'developer'
	)
);
--> statement-breakpoint
CREATE POLICY "maps_update_developer" ON "public"."maps" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
	EXISTS (
		SELECT 1
		FROM "public"."user_roles" "ur"
		INNER JOIN "public"."roles" "r" ON "r"."id" = "ur"."role_id"
		INNER JOIN "public"."user_profiles" "up" ON "up"."id" = "ur"."user_profile_id"
		WHERE "up"."user_id" = auth.uid()
			AND "r"."slug" = 'developer'
	)
) WITH CHECK (
	EXISTS (
		SELECT 1
		FROM "public"."user_roles" "ur"
		INNER JOIN "public"."roles" "r" ON "r"."id" = "ur"."role_id"
		INNER JOIN "public"."user_profiles" "up" ON "up"."id" = "ur"."user_profile_id"
		WHERE "up"."user_id" = auth.uid()
			AND "r"."slug" = 'developer'
	)
);
--> statement-breakpoint
CREATE POLICY "maps_delete_developer" ON "public"."maps" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
	EXISTS (
		SELECT 1
		FROM "public"."user_roles" "ur"
		INNER JOIN "public"."roles" "r" ON "r"."id" = "ur"."role_id"
		INNER JOIN "public"."user_profiles" "up" ON "up"."id" = "ur"."user_profile_id"
		WHERE "up"."user_id" = auth.uid()
			AND "r"."slug" = 'developer'
	)
);
--> statement-breakpoint
INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES (
	'intradark-media',
	'intradark-media',
	true,
	52428800,
	ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
);
--> statement-breakpoint
CREATE POLICY "intradark_media_select" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("bucket_id" = 'intradark-media');
--> statement-breakpoint
CREATE POLICY "intradark_media_insert_developer" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
	"bucket_id" = 'intradark-media'
	AND EXISTS (
		SELECT 1
		FROM "public"."user_roles" "ur"
		INNER JOIN "public"."roles" "r" ON "r"."id" = "ur"."role_id"
		INNER JOIN "public"."user_profiles" "up" ON "up"."id" = "ur"."user_profile_id"
		WHERE "up"."user_id" = auth.uid()
			AND "r"."slug" = 'developer'
	)
);
--> statement-breakpoint
CREATE POLICY "intradark_media_update_developer" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
	"bucket_id" = 'intradark-media'
	AND EXISTS (
		SELECT 1
		FROM "public"."user_roles" "ur"
		INNER JOIN "public"."roles" "r" ON "r"."id" = "ur"."role_id"
		INNER JOIN "public"."user_profiles" "up" ON "up"."id" = "ur"."user_profile_id"
		WHERE "up"."user_id" = auth.uid()
			AND "r"."slug" = 'developer'
	)
) WITH CHECK (
	"bucket_id" = 'intradark-media'
	AND EXISTS (
		SELECT 1
		FROM "public"."user_roles" "ur"
		INNER JOIN "public"."roles" "r" ON "r"."id" = "ur"."role_id"
		INNER JOIN "public"."user_profiles" "up" ON "up"."id" = "ur"."user_profile_id"
		WHERE "up"."user_id" = auth.uid()
			AND "r"."slug" = 'developer'
	)
);
--> statement-breakpoint
CREATE POLICY "intradark_media_delete_developer" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
	"bucket_id" = 'intradark-media'
	AND EXISTS (
		SELECT 1
		FROM "public"."user_roles" "ur"
		INNER JOIN "public"."roles" "r" ON "r"."id" = "ur"."role_id"
		INNER JOIN "public"."user_profiles" "up" ON "up"."id" = "ur"."user_profile_id"
		WHERE "up"."user_id" = auth.uid()
			AND "r"."slug" = 'developer'
	)
);

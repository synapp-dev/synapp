CREATE TABLE "public"."utility_maps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(128) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"radar_image_url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "utility_maps_slug_key" ON "public"."utility_maps" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "utility_maps_is_active_sort_idx" ON "public"."utility_maps" USING btree ("is_active", "sort_order");
--> statement-breakpoint
CREATE TABLE "public"."utility_map_spots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"map_id" uuid NOT NULL,
	"slug" varchar(128) NOT NULL,
	"label" text NOT NULL,
	"radar_x" double precision NOT NULL,
	"radar_y" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "utility_map_spots_radar_x_check" CHECK (("radar_x" >= 0::double precision) AND ("radar_x" <= 1::double precision)),
	CONSTRAINT "utility_map_spots_radar_y_check" CHECK (("radar_y" >= 0::double precision) AND ("radar_y" <= 1::double precision))
);
--> statement-breakpoint
ALTER TABLE "public"."utility_map_spots" ADD CONSTRAINT "utility_map_spots_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "public"."utility_maps"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "utility_map_spots_map_id_slug_key" ON "public"."utility_map_spots" USING btree ("map_id", "slug");
--> statement-breakpoint
CREATE INDEX "utility_map_spots_map_id_idx" ON "public"."utility_map_spots" USING btree ("map_id");
--> statement-breakpoint
CREATE TABLE "public"."utility_lineups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"map_id" uuid NOT NULL,
	"throw_spot_id" uuid NOT NULL,
	"land_spot_id" uuid NOT NULL,
	"grenade_type" varchar(32) NOT NULL,
	"side" varchar(16) NOT NULL,
	"movement" varchar(32) NOT NULL,
	"technique" varchar(48) NOT NULL,
	"margin" varchar(16) NOT NULL,
	"youtube_url" text NOT NULL,
	"video_start_ms" integer DEFAULT 0 NOT NULL,
	"video_end_ms" integer,
	"lineup_image_url" text,
	"description" text NOT NULL,
	"setpos_text" text,
	"author_profile_id" uuid,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"pro_verified" boolean DEFAULT false NOT NULL,
	"intradark_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "utility_lineups_grenade_type_check" CHECK (("grenade_type")::text = ANY ((ARRAY['smoke'::character varying, 'molotov'::character varying, 'flashbang'::character varying, 'he'::character varying])::text[])),
	CONSTRAINT "utility_lineups_side_check" CHECK (("side")::text = ANY ((ARRAY['t'::character varying, 'ct'::character varying, 'both'::character varying])::text[])),
	CONSTRAINT "utility_lineups_movement_check" CHECK (("movement")::text = ANY ((ARRAY['stationary'::character varying, 'running'::character varying, 'walking'::character varying, 'crouched'::character varying, 'crouched_walking'::character varying])::text[])),
	CONSTRAINT "utility_lineups_technique_check" CHECK (("technique")::text = ANY ((ARRAY['left_click'::character varying, 'right_click'::character varying, 'left_and_right_click'::character varying, 'jump_left_click'::character varying, 'jump_right_click'::character varying, 'jump_left_and_right_click'::character varying])::text[])),
	CONSTRAINT "utility_lineups_margin_check" CHECK (("margin")::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[])),
	CONSTRAINT "utility_lineups_status_check" CHECK (("status")::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD CONSTRAINT "utility_lineups_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "public"."utility_maps"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD CONSTRAINT "utility_lineups_throw_spot_id_fkey" FOREIGN KEY ("throw_spot_id") REFERENCES "public"."utility_map_spots"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD CONSTRAINT "utility_lineups_land_spot_id_fkey" FOREIGN KEY ("land_spot_id") REFERENCES "public"."utility_map_spots"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD CONSTRAINT "utility_lineups_author_profile_id_fkey" FOREIGN KEY ("author_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "utility_lineups_map_id_idx" ON "public"."utility_lineups" USING btree ("map_id");
--> statement-breakpoint
CREATE INDEX "utility_lineups_map_grenade_side_idx" ON "public"."utility_lineups" USING btree ("map_id", "grenade_type", "side");
--> statement-breakpoint
CREATE INDEX "utility_lineups_land_spot_id_idx" ON "public"."utility_lineups" USING btree ("land_spot_id");
--> statement-breakpoint
ALTER TABLE "public"."utility_maps" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."utility_map_spots" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "utility_maps_select_public" ON "public"."utility_maps" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("is_active" = true);
--> statement-breakpoint
CREATE POLICY "utility_map_spots_select_public" ON "public"."utility_map_spots" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (
	EXISTS (
		SELECT 1 FROM "public"."utility_maps" m
		WHERE m.id = "utility_map_spots"."map_id" AND m."is_active" = true
	)
);
--> statement-breakpoint
CREATE POLICY "utility_lineups_select_public" ON "public"."utility_lineups" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("status" = 'published');

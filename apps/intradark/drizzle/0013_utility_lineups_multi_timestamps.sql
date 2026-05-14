--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD COLUMN IF NOT EXISTS "still_stand_ms" integer;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD COLUMN IF NOT EXISTS "still_throw_ms" integer;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD COLUMN IF NOT EXISTS "still_land_ms" integer;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD COLUMN IF NOT EXISTS "grenade_release_ms" integer;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD COLUMN IF NOT EXISTS "grenade_bloom_ms" integer;

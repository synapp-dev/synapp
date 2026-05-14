-- Replace spot FKs on utility_lineups with inline normalized radar coords (0–1) and labels.
-- Existing rows are backfilled from utility_map_spots before FK columns are dropped.

ALTER TABLE "public"."utility_lineups" ADD COLUMN IF NOT EXISTS "throw_spot_x" double precision;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD COLUMN IF NOT EXISTS "throw_spot_y" double precision;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD COLUMN IF NOT EXISTS "land_spot_x" double precision;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD COLUMN IF NOT EXISTS "land_spot_y" double precision;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD COLUMN IF NOT EXISTS "throw_label" text;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD COLUMN IF NOT EXISTS "land_label" text;
--> statement-breakpoint
UPDATE "public"."utility_lineups" AS ul
SET
  "throw_spot_x" = ts."radar_x",
  "throw_spot_y" = ts."radar_y",
  "land_spot_x" = ls."radar_x",
  "land_spot_y" = ls."radar_y",
  "throw_label" = ts."label",
  "land_label" = ls."label"
FROM "public"."utility_map_spots" AS ts,
  "public"."utility_map_spots" AS ls
WHERE ul."throw_spot_id" = ts."id"
  AND ul."land_spot_id" = ls."id";
--> statement-breakpoint
DELETE FROM "public"."utility_lineups"
WHERE "throw_spot_x" IS NULL;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ALTER COLUMN "throw_spot_x" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ALTER COLUMN "throw_spot_y" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ALTER COLUMN "land_spot_x" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ALTER COLUMN "land_spot_y" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ALTER COLUMN "throw_label" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ALTER COLUMN "land_label" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" DROP CONSTRAINT IF EXISTS "utility_lineups_throw_spot_id_fkey";
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" DROP CONSTRAINT IF EXISTS "utility_lineups_land_spot_id_fkey";
--> statement-breakpoint
DROP INDEX IF EXISTS "utility_lineups_land_spot_id_idx";
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" DROP COLUMN IF EXISTS "throw_spot_id";
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" DROP COLUMN IF EXISTS "land_spot_id";
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD CONSTRAINT "utility_lineups_throw_spot_x_check" CHECK (("throw_spot_x" >= 0::double precision) AND ("throw_spot_x" <= 1::double precision));
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD CONSTRAINT "utility_lineups_throw_spot_y_check" CHECK (("throw_spot_y" >= 0::double precision) AND ("throw_spot_y" <= 1::double precision));
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD CONSTRAINT "utility_lineups_land_spot_x_check" CHECK (("land_spot_x" >= 0::double precision) AND ("land_spot_x" <= 1::double precision));
--> statement-breakpoint
ALTER TABLE "public"."utility_lineups" ADD CONSTRAINT "utility_lineups_land_spot_y_check" CHECK (("land_spot_y" >= 0::double precision) AND ("land_spot_y" <= 1::double precision));
--> statement-breakpoint
CREATE INDEX "utility_lineups_map_land_xy_idx" ON "public"."utility_lineups" USING btree ("map_id", "land_spot_x", "land_spot_y");

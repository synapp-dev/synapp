-- Matches drizzle/0011_maps_map_screenshot_url.sql — required for Drizzle `maps` selects.
ALTER TABLE "public"."maps" ADD COLUMN IF NOT EXISTS "map_screenshot_url" text DEFAULT '' NOT NULL;

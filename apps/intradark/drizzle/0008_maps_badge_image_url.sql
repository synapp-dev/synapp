-- Map card / logo badge image (public URL or intradark-media object URL), parallel to radar_image_url.
ALTER TABLE "public"."maps" ADD COLUMN IF NOT EXISTS "badge_image_url" text DEFAULT '' NOT NULL;

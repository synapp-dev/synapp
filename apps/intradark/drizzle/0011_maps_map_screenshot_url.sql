-- Full-map screenshot (public URL or intradark-media object URL), e.g. maps/<slug>/map_screenshot.*
ALTER TABLE "public"."maps" ADD COLUMN IF NOT EXISTS "map_screenshot_url" text DEFAULT '' NOT NULL;

-- Banner / cover image for news articles.
-- Stores the full public URL of an object in the `intradark-media` bucket
-- (uploaded under the `news/{articleId}/…` prefix). Nullable: articles may have no banner.
ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "cover_image_url" text;

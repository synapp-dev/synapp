-- News provenance (auto-ingest from the Steam CS2 feed) + a tag system (public + admin queue).

-- Provenance: where an article came from and its stable upstream id (for dedupe).
ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "source" varchar(64);
ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "external_id" varchar(128);
CREATE UNIQUE INDEX IF NOT EXISTS "news_articles_source_external_id_key"
  ON "news_articles" ("source", "external_id")
  WHERE "external_id" IS NOT NULL;

-- Tag taxonomy.
CREATE TABLE IF NOT EXISTS "news_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" varchar(64) NOT NULL,
  "label" varchar(255) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "news_tags_slug_key" ON "news_tags" ("slug");

-- Article <-> tag join.
CREATE TABLE IF NOT EXISTS "news_article_tags" (
  "article_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  CONSTRAINT "news_article_tags_pk" PRIMARY KEY ("article_id", "tag_id")
);
ALTER TABLE "news_article_tags"
  ADD CONSTRAINT "news_article_tags_article_id_fkey"
  FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE cascade;
ALTER TABLE "news_article_tags"
  ADD CONSTRAINT "news_article_tags_tag_id_fkey"
  FOREIGN KEY ("tag_id") REFERENCES "news_tags"("id") ON DELETE cascade;
CREATE INDEX IF NOT EXISTS "news_article_tags_tag_id_idx" ON "news_article_tags" ("tag_id");

-- Seed taxonomy.
INSERT INTO "news_tags" ("slug", "label") VALUES
  ('official-valve-update', 'Official Valve Update'),
  ('esports', 'Esports'),
  ('announcement', 'Announcement'),
  ('blog', 'Blog'),
  ('community', 'Community')
ON CONFLICT ("slug") DO NOTHING;

-- RLS: public read; writes happen via the Drizzle (owner) connection, so no insert policies.
ALTER TABLE "news_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "news_article_tags" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_tags_select_public" ON "news_tags"
  AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);

CREATE POLICY "news_article_tags_select_public" ON "news_article_tags"
  AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (
    EXISTS (
      SELECT 1 FROM "news_articles" a
      WHERE a.id = "news_article_tags"."article_id"
        AND a.status = 'published'
        AND a.published_at IS NOT NULL
    )
  );

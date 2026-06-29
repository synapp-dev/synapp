-- News view tracking.
--   • news_articles.view_count  — raw total, bumped +1 on every page load.
--   • news_article_views        — one row per unique viewer (member or anon),
--                                 deduped on (article_id, viewer_key). Powers
--                                 the unique / members / anonymous breakdown.
-- The ledger is written + read only by the server (drizzle service-role); RLS is
-- enabled with no policies so anon/auth clients can't read who viewed what.

ALTER TABLE public.news_articles
    ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.news_article_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
    -- null for anonymous (logged-out) viewers.
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    -- stable per-browser id (idk_anon_id cookie); set for anonymous viewers.
    anon_id TEXT,
    -- 'u:<userId>' for members, 'a:<anonId>' for anonymous. Dedupe key.
    viewer_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS news_article_views_article_viewer_key
    ON public.news_article_views(article_id, viewer_key);
CREATE INDEX IF NOT EXISTS idx_news_article_views_article
    ON public.news_article_views(article_id);

ALTER TABLE public.news_article_views ENABLE ROW LEVEL SECURITY;
-- No policies: server-only (drizzle/service-role) access.

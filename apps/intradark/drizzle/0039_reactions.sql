-- Generic, polymorphic emoji reactions. One reaction per user per target.
-- Targets span comments and entities across the app (player profiles/comments,
-- news articles/comments, forum threads/replies). `target_id` is TEXT so it can
-- hold both uuids (comments/articles/threads) and steamid64 keys (profiles).

CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(32) NOT NULL,
    target_id TEXT NOT NULL,
    react_type VARCHAR(16) NOT NULL
        CHECK (react_type IN ('like', 'love', 'laugh', 'fire', 'sad')),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active reaction per user per target (toggling replaces/removes).
CREATE UNIQUE INDEX IF NOT EXISTS reactions_target_user_key
    ON public.reactions(target_type, target_id, user_id);
-- Fast lookups of all reactions for a given target.
CREATE INDEX IF NOT EXISTS idx_reactions_target
    ON public.reactions(target_type, target_id, created_at DESC);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reactions_select_public" ON public.reactions;
CREATE POLICY "reactions_select_public" ON public.reactions
    AS PERMISSIVE FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "reactions_insert_own" ON public.reactions;
CREATE POLICY "reactions_insert_own" ON public.reactions
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reactions_update_own" ON public.reactions;
CREATE POLICY "reactions_update_own" ON public.reactions
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reactions_delete_own" ON public.reactions;
CREATE POLICY "reactions_delete_own" ON public.reactions
    AS PERMISSIVE FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- News comments — threaded, soft-deletable. Mirrors player_profile_comments
-- minus the trust-signal machinery. Reactions attach via the generic table
-- (target_type = 'news_comment').
CREATE TABLE IF NOT EXISTS public.news_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.news_comments(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_news_comments_article_created_at
    ON public.news_comments(article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_comments_parent_comment_id
    ON public.news_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_news_comments_author_article_created
    ON public.news_comments(author_user_id, article_id, created_at DESC);

ALTER TABLE public.news_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_comments_select_public" ON public.news_comments;
CREATE POLICY "news_comments_select_public" ON public.news_comments
    AS PERMISSIVE FOR SELECT TO anon, authenticated
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "news_comments_insert_own" ON public.news_comments;
CREATE POLICY "news_comments_insert_own" ON public.news_comments
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (author_user_id = auth.uid());

DROP POLICY IF EXISTS "news_comments_update_own" ON public.news_comments;
CREATE POLICY "news_comments_update_own" ON public.news_comments
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING (author_user_id = auth.uid())
    WITH CHECK (author_user_id = auth.uid());

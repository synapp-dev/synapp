-- Player profile comments, deduplicated trust votes, and comment reports.

CREATE TABLE IF NOT EXISTS public.player_profile_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_steamid64 TEXT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.player_profile_comments(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trust_signal VARCHAR(16) CHECK (trust_signal IS NULL OR trust_signal IN ('legit', 'suspicious')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ppc_subject_created_at
    ON public.player_profile_comments(subject_steamid64, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ppc_parent_comment_id
    ON public.player_profile_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_ppc_author_subject_created
    ON public.player_profile_comments(author_user_id, subject_steamid64, created_at DESC);

CREATE TABLE IF NOT EXISTS public.player_profile_trust_votes (
    subject_steamid64 TEXT NOT NULL REFERENCES public.players(steamid64) ON DELETE CASCADE,
    voter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signal VARCHAR(16) NOT NULL CHECK (signal IN ('legit', 'suspicious')),
    source_comment_id UUID REFERENCES public.player_profile_comments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (subject_steamid64, voter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_pptv_subject_signal
    ON public.player_profile_trust_votes(subject_steamid64, signal);

CREATE TABLE IF NOT EXISTS public.player_profile_comment_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.player_profile_comments(id) ON DELETE CASCADE,
    reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (comment_id, reporter_user_id)
);

ALTER TABLE public.player_profile_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_profile_trust_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_profile_comment_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ppc_select_public" ON public.player_profile_comments;
CREATE POLICY "ppc_select_public" ON public.player_profile_comments
    AS PERMISSIVE FOR SELECT TO anon, authenticated
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "ppc_insert_own" ON public.player_profile_comments;
CREATE POLICY "ppc_insert_own" ON public.player_profile_comments
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (author_user_id = auth.uid());

DROP POLICY IF EXISTS "ppc_update_own" ON public.player_profile_comments;
CREATE POLICY "ppc_update_own" ON public.player_profile_comments
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING (author_user_id = auth.uid())
    WITH CHECK (author_user_id = auth.uid());

DROP POLICY IF EXISTS "pptv_select_public" ON public.player_profile_trust_votes;
CREATE POLICY "pptv_select_public" ON public.player_profile_trust_votes
    AS PERMISSIVE FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "pptv_insert_own" ON public.player_profile_trust_votes;
CREATE POLICY "pptv_insert_own" ON public.player_profile_trust_votes
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (voter_user_id = auth.uid());

DROP POLICY IF EXISTS "pptv_update_own" ON public.player_profile_trust_votes;
CREATE POLICY "pptv_update_own" ON public.player_profile_trust_votes
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING (voter_user_id = auth.uid())
    WITH CHECK (voter_user_id = auth.uid());

DROP POLICY IF EXISTS "ppcr_insert_own" ON public.player_profile_comment_reports;
CREATE POLICY "ppcr_insert_own" ON public.player_profile_comment_reports
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (reporter_user_id = auth.uid());

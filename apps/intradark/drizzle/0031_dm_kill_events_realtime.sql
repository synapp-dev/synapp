-- Add dm_kill_events to the Realtime publication so the leaderboard page can
-- subscribe to inserts and live-update (public-read RLS gates the feed).
-- Idempotent guard: only add if not already a member.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'dm_kill_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_kill_events;
  END IF;
END $$;

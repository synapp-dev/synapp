-- Mirrors apps/intradark/drizzle/0031_dm_kill_events_realtime.sql.
-- Idempotent: adds dm_kill_events to the Realtime publication only if not present.
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

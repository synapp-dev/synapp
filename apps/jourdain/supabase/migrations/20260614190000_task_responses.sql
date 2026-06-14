-- Reminder responses: allow tasks to be skipped, and record when the user
-- responded to a reminder (the hook for the "respond within 5 min" scoring).

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status = ANY (ARRAY['open','done','skipped']::text[]));

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

-- Missed tasks: a routine occurrence not done on its scheduled day locks in as
-- a fail ('missed') instead of lingering as overdue. The morning check-in can
-- retroactively flip a recent miss back to done.

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status = ANY (ARRAY['open','done','skipped','missed']::text[]));

-- Lets the client show the morning check-in once per day.
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS last_checkin_at timestamptz;

-- Lock in yesterday-and-older routine occurrences as missed, evaluated in the
-- user's local timezone (notification settings, else the routine's, else
-- Sydney). Idempotent; p_user_id null = all users (cron).
CREATE OR REPLACE FUNCTION public.expire_missed_tasks(p_user_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE expired_count integer := 0;
BEGIN
  UPDATE public.tasks t
  SET status = 'missed'
  FROM public.routines r
  WHERE r.id = t.routine_id
    AND t.status = 'open'
    AND t.occurrence_date IS NOT NULL
    AND (p_user_id IS NULL OR t.user_id = p_user_id)
    AND t.occurrence_date < (now() AT TIME ZONE COALESCE(
      (SELECT ns.timezone FROM public.notification_settings ns
       WHERE ns.user_id = t.user_id),
      r.timezone,
      'Australia/Sydney'
    ))::date;

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_missed_tasks(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.expire_missed_tasks(uuid) TO service_role;

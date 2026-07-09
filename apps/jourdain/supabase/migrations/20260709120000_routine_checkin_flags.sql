-- Routine check-in flags: some routines are true just by opening the app (Wake)
-- and are never asked or missed; others want the time-of-day recorded (meds).

ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS auto_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS track_time boolean NOT NULL DEFAULT false;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS logged_time time NULL;

-- Auto-complete routines never lock in as missed; they resolve on app open.
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
    AND r.auto_complete = false
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

-- Mark open occurrences of auto_complete routines as done through today,
-- evaluated in the user's local timezone. Idempotent; p_user_id null = cron.
CREATE OR REPLACE FUNCTION public.auto_complete_routine_tasks(p_user_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE done_count integer := 0;
BEGIN
  UPDATE public.tasks t
  SET status = 'done', completed_at = now()
  FROM public.routines r
  WHERE r.id = t.routine_id
    AND r.auto_complete = true
    AND t.status = 'open'
    AND t.occurrence_date IS NOT NULL
    AND (p_user_id IS NULL OR t.user_id = p_user_id)
    AND t.occurrence_date <= (now() AT TIME ZONE COALESCE(
      (SELECT ns.timezone FROM public.notification_settings ns
       WHERE ns.user_id = t.user_id),
      r.timezone,
      'Australia/Sydney'
    ))::date;

  GET DIAGNOSTICS done_count = ROW_COUNT;
  RETURN done_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_complete_routine_tasks(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.auto_complete_routine_tasks(uuid) TO service_role;

-- Backfill the two known routines; both reversible via the routine editor.
UPDATE public.routines SET auto_complete = true WHERE title = 'Wake';
UPDATE public.routines SET track_time = true WHERE title ILIKE 'take meds';

-- Completion-triggered routines: spawn one routine's occurrence N minutes after
-- another routine's occurrence is completed. Covers wake→meds (+5m),
-- shower→moisturise (+5m), and self-loops like mow→mow (+14 days).

ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS trigger_type text NOT NULL DEFAULT 'schedule'
    CHECK (trigger_type IN ('schedule', 'on_complete')),
  ADD COLUMN IF NOT EXISTS parent_routine_id uuid
    REFERENCES public.routines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS offset_minutes integer CHECK (offset_minutes >= 0);

-- When a routine-linked task is completed, spawn any routines triggered by it.
-- AFTER UPDATE only fires on status flipping to 'done'; the spawn is an INSERT
-- (no recursion). occurrence_date is the spawned remind date (so a self-loop
-- lands on a different day and doesn't conflict with the just-completed task).
CREATE OR REPLACE FUNCTION public.fire_routine_completion_triggers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'done'
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.routine_id IS NOT NULL THEN
    INSERT INTO public.tasks (
      user_id, title, notes, domains, priority, status,
      due_date, remind_at, routine_id, occurrence_date
    )
    SELECT
      child.user_id, child.title, child.notes,
      ARRAY[child.domain]::text[], child.priority, 'open',
      ((now() + make_interval(mins => COALESCE(child.offset_minutes, 0)))
        AT TIME ZONE child.timezone)::date,
      now() + make_interval(mins => COALESCE(child.offset_minutes, 0)),
      child.id,
      ((now() + make_interval(mins => COALESCE(child.offset_minutes, 0)))
        AT TIME ZONE child.timezone)::date
    FROM public.routines child
    WHERE child.trigger_type = 'on_complete'
      AND child.parent_routine_id = NEW.routine_id
      AND child.active
      AND NOT EXISTS (
        SELECT 1 FROM public.tasks t2
        WHERE t2.routine_id = child.id AND t2.status = 'open'
      )
    ON CONFLICT (routine_id, occurrence_date) WHERE routine_id IS NOT NULL
    DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_fire_completion_triggers ON public.tasks;
CREATE TRIGGER tasks_fire_completion_triggers
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.fire_routine_completion_triggers();

-- Schedule-based generation must ignore completion-triggered routines.
CREATE OR REPLACE FUNCTION public.materialize_due_routines(p_user_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE inserted_count integer := 0;
BEGIN
  INSERT INTO public.tasks (
    user_id, title, notes, domains, priority, status,
    due_date, remind_at, routine_id, occurrence_date
  )
  SELECT
    r.user_id, r.title, r.notes, ARRAY[r.domain]::text[], r.priority, 'open',
    loc.d, (loc.d + r.remind_time) AT TIME ZONE r.timezone, r.id, loc.d
  FROM public.routines r
  CROSS JOIN LATERAL (SELECT (now() AT TIME ZONE r.timezone)::date AS d) loc
  WHERE r.active
    AND r.trigger_type = 'schedule'
    AND r.freq <> 'interval'
    AND (p_user_id IS NULL OR r.user_id = p_user_id)
    AND (
      r.freq = 'daily'
      OR (r.freq = 'weekly' AND EXTRACT(dow FROM loc.d)::int = ANY (r.days_of_week))
      OR (r.freq = 'monthly' AND r.day_of_month IS NOT NULL
          AND EXTRACT(day FROM loc.d)::int = r.day_of_month)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.tasks t2
      WHERE t2.routine_id = r.id AND t2.status = 'open'
    )
  ON CONFLICT (routine_id, occurrence_date) WHERE routine_id IS NOT NULL
  DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

-- Don't pile up duplicate routine cards: only generate a new occurrence when
-- the routine has no open task already. Finish the one you have, and the next
-- occurrence appears — so a missed weekly chore stays a single card.

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

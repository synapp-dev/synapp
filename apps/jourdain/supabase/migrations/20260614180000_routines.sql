-- Routines: recurring task templates that auto-spawn a normal task per
-- occurrence, so generated tasks flow through the existing tasks list,
-- calendar, and push-reminder runner. Scoring (later) reads the completions.

CREATE TABLE IF NOT EXISTS public.routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  notes text,
  domain text NOT NULL CHECK (
    domain = ANY (ARRAY['identity','health','work','social','finance']::text[])
  ),
  priority smallint NOT NULL DEFAULT 4 CHECK (priority BETWEEN 1 AND 4),
  freq text NOT NULL CHECK (freq = ANY (ARRAY['daily','weekly','monthly']::text[])),
  days_of_week smallint[] NOT NULL DEFAULT '{}'::smallint[], -- 0=Sun..6=Sat (weekly)
  day_of_month smallint CHECK (day_of_month BETWEEN 1 AND 31), -- (monthly)
  remind_time time NOT NULL DEFAULT '08:00',
  timezone text NOT NULL DEFAULT 'Australia/Sydney',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS routines_user_idx ON public.routines (user_id);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS routines_select_own ON public.routines;
CREATE POLICY routines_select_own ON public.routines
  AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS routines_insert_own ON public.routines;
CREATE POLICY routines_insert_own ON public.routines
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS routines_update_own ON public.routines;
CREATE POLICY routines_update_own ON public.routines
  AS PERMISSIVE FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS routines_delete_own ON public.routines;
CREATE POLICY routines_delete_own ON public.routines
  AS PERMISSIVE FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.routines_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS routines_set_updated_at ON public.routines;
CREATE TRIGGER routines_set_updated_at BEFORE UPDATE ON public.routines
  FOR EACH ROW EXECUTE FUNCTION public.routines_set_updated_at();

-- Link generated tasks back to their routine + the date they represent.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS routine_id uuid REFERENCES public.routines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS occurrence_date date;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_routine_occurrence_idx
  ON public.tasks (routine_id, occurrence_date)
  WHERE routine_id IS NOT NULL;

-- Materialize today's due routine occurrences as tasks. Idempotent (ON CONFLICT
-- DO NOTHING) and timezone-aware: "today" and the reminder time are evaluated in
-- each routine's own timezone via Postgres. p_user_id null = all users (cron).
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
    AND (p_user_id IS NULL OR r.user_id = p_user_id)
    AND (
      r.freq = 'daily'
      OR (r.freq = 'weekly' AND EXTRACT(dow FROM loc.d)::int = ANY (r.days_of_week))
      OR (r.freq = 'monthly' AND r.day_of_month IS NOT NULL
          AND EXTRACT(day FROM loc.d)::int = r.day_of_month)
    )
  ON CONFLICT (routine_id, occurrence_date) WHERE routine_id IS NOT NULL
  DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.materialize_due_routines(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.materialize_due_routines(uuid) TO service_role;

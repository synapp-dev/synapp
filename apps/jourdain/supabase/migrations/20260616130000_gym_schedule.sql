-- Gym schedule: the PPL rotation. Maps each weekday (0=Sun..6=Sat) to a program
-- so a program can recur on several days (e.g. Push on Mon AND Thu) while each
-- day points to exactly one program. This replaces the single, awkward
-- gym_programs.day_of_week for scheduling.
--
-- Two more pieces stitch the "accountability" axis (routine → task) to the
-- "training-content" axis (program → session):
--   • gym_sessions.task_id  — the session that satisfied a day's training task.
--   • gym_preferences.routine_id — the weekly "go to gym" reminder routine, so
--     completing a session can tick off that day's generated task.

-- ── Weekday → program map ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gym_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  program_id uuid NOT NULL REFERENCES public.gym_programs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS gym_schedule_user_idx
  ON public.gym_schedule (user_id, day_of_week);

-- ── Link a logged session to the routine task it completes ───────────────────
ALTER TABLE public.gym_sessions
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gym_sessions_task_idx
  ON public.gym_sessions (task_id) WHERE task_id IS NOT NULL;

-- ── Per-user gym preferences (the training-reminder routine) ─────────────────
CREATE TABLE IF NOT EXISTS public.gym_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id uuid REFERENCES public.routines(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── RLS: owner-only (matches the rest of the gym module) ─────────────────────
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['gym_schedule', 'gym_preferences']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_select_own', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());',
      tbl || '_select_own', tbl);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_insert_own', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());',
      tbl || '_insert_own', tbl);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_update_own', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());',
      tbl || '_update_own', tbl);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_delete_own', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR DELETE TO authenticated USING (user_id = auth.uid());',
      tbl || '_delete_own', tbl);
  END LOOP;
END $$;

-- ── updated_at triggers (reuse the shared gym function) ──────────────────────
DROP TRIGGER IF EXISTS gym_schedule_set_updated_at ON public.gym_schedule;
CREATE TRIGGER gym_schedule_set_updated_at
  BEFORE UPDATE ON public.gym_schedule
  FOR EACH ROW EXECUTE FUNCTION public.gym_set_updated_at();

DROP TRIGGER IF EXISTS gym_preferences_set_updated_at ON public.gym_preferences;
CREATE TRIGGER gym_preferences_set_updated_at
  BEFORE UPDATE ON public.gym_preferences
  FOR EACH ROW EXECUTE FUNCTION public.gym_set_updated_at();

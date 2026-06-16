-- Gym module (Health > Gym) — strength training tracker for the Force USA G20.
-- Per-user library, day-program templates, logged sessions and sets.
-- Every table is RLS-scoped directly to auth.uid(); user_id is denormalised onto
-- child tables so policies stay a simple equality check (matches tasks/health).

-- Shared updated_at trigger for the gym tables.
CREATE OR REPLACE FUNCTION public.gym_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ── Exercise library ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gym_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  muscle_group text NOT NULL CHECK (muscle_group = ANY (ARRAY[
    'chest','back','shoulders','biceps','triceps','quads','hamstrings',
    'glutes','calves','core','forearms','full_body'
  ])),
  secondary_muscles text[] NOT NULL DEFAULT '{}',
  station text NOT NULL CHECK (station = ANY (ARRAY[
    'cable','smith','lat_pulldown','low_row','leg_press','leg_developer',
    'chin_up','landmine','bench','bodyweight'
  ])),
  is_unilateral boolean NOT NULL DEFAULT false,
  is_custom boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS gym_exercises_user_muscle_idx
  ON public.gym_exercises (user_id, muscle_group, archived);

-- ── Programs (day templates, e.g. "Chest & Triceps") ────────────────────────
CREATE TABLE IF NOT EXISTS public.gym_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  day_of_week smallint CHECK (day_of_week BETWEEN 0 AND 6),
  muscle_groups text[] NOT NULL DEFAULT '{}',
  notes text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gym_programs_user_idx
  ON public.gym_programs (user_id, order_index);

CREATE TABLE IF NOT EXISTS public.gym_program_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.gym_programs(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.gym_exercises(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  target_sets smallint NOT NULL DEFAULT 3 CHECK (target_sets BETWEEN 1 AND 20),
  target_rep_min smallint NOT NULL DEFAULT 8 CHECK (target_rep_min BETWEEN 1 AND 100),
  target_rep_max smallint NOT NULL DEFAULT 12 CHECK (target_rep_max BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS gym_program_exercises_program_idx
  ON public.gym_program_exercises (program_id, order_index);

-- ── Sessions (a logged workout) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gym_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.gym_programs(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  performed_on date NOT NULL DEFAULT current_date,
  started_at timestamptz,
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'active'
    CHECK (status = ANY (ARRAY['active'::text, 'completed'::text])),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gym_sessions_user_date_idx
  ON public.gym_sessions (user_id, performed_on DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.gym_session_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.gym_sessions(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES public.gym_exercises(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  target_sets smallint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gym_session_exercises_session_idx
  ON public.gym_session_exercises (session_id, order_index);
CREATE INDEX IF NOT EXISTS gym_session_exercises_user_exercise_idx
  ON public.gym_session_exercises (user_id, exercise_id);

CREATE TABLE IF NOT EXISTS public.gym_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_exercise_id uuid NOT NULL
    REFERENCES public.gym_session_exercises(id) ON DELETE CASCADE,
  set_index smallint NOT NULL,
  weight numeric(6,2),
  reps smallint CHECK (reps IS NULL OR reps BETWEEN 0 AND 1000),
  rpe numeric(3,1) CHECK (rpe IS NULL OR rpe BETWEEN 1 AND 10),
  is_warmup boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gym_sets_session_exercise_idx
  ON public.gym_sets (session_exercise_id, set_index);

-- ── RLS: every gym table is owner-only ──────────────────────────────────────
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'gym_exercises','gym_programs','gym_program_exercises',
    'gym_sessions','gym_session_exercises','gym_sets'
  ]
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

-- ── updated_at triggers ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS gym_exercises_set_updated_at ON public.gym_exercises;
CREATE TRIGGER gym_exercises_set_updated_at
  BEFORE UPDATE ON public.gym_exercises
  FOR EACH ROW EXECUTE FUNCTION public.gym_set_updated_at();

DROP TRIGGER IF EXISTS gym_programs_set_updated_at ON public.gym_programs;
CREATE TRIGGER gym_programs_set_updated_at
  BEFORE UPDATE ON public.gym_programs
  FOR EACH ROW EXECUTE FUNCTION public.gym_set_updated_at();

DROP TRIGGER IF EXISTS gym_sessions_set_updated_at ON public.gym_sessions;
CREATE TRIGGER gym_sessions_set_updated_at
  BEFORE UPDATE ON public.gym_sessions
  FOR EACH ROW EXECUTE FUNCTION public.gym_set_updated_at();

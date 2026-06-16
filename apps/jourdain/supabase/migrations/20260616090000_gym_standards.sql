-- Strength-standards benchmarks (sourced from strengthlevel.com), exercise
-- images, and a daily bodyweight log used to position lifts against the standards.

-- ── Reference: per-exercise strength standards ──────────────────────────────
-- Global reference data (not per-user). Each row keyed by the strengthlevel
-- slug; `male`/`female` are arrays of [bodyweight_kg, beginner, novice,
-- intermediate, advanced, elite] in kg.
CREATE TABLE IF NOT EXISTS public.gym_exercise_standards (
  strength_level_slug text PRIMARY KEY,
  male jsonb,
  female jsonb,
  image_path text,
  source_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gym_exercise_standards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gym_exercise_standards_read ON public.gym_exercise_standards;
CREATE POLICY gym_exercise_standards_read ON public.gym_exercise_standards
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

DROP TRIGGER IF EXISTS gym_exercise_standards_updated_at ON public.gym_exercise_standards;
CREATE TRIGGER gym_exercise_standards_updated_at
  BEFORE UPDATE ON public.gym_exercise_standards
  FOR EACH ROW EXECUTE FUNCTION public.gym_set_updated_at();

-- Link each exercise to its standards row.
ALTER TABLE public.gym_exercises
  ADD COLUMN IF NOT EXISTS strength_level_slug text;

-- ── Daily bodyweight log (owner-only) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gym_body_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  measured_on date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, measured_on)
);

CREATE INDEX IF NOT EXISTS gym_body_weights_user_date_idx
  ON public.gym_body_weights (user_id, measured_on DESC);

ALTER TABLE public.gym_body_weights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gym_body_weights_select_own ON public.gym_body_weights;
CREATE POLICY gym_body_weights_select_own ON public.gym_body_weights
  AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS gym_body_weights_insert_own ON public.gym_body_weights;
CREATE POLICY gym_body_weights_insert_own ON public.gym_body_weights
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS gym_body_weights_update_own ON public.gym_body_weights;
CREATE POLICY gym_body_weights_update_own ON public.gym_body_weights
  AS PERMISSIVE FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS gym_body_weights_delete_own ON public.gym_body_weights;
CREATE POLICY gym_body_weights_delete_own ON public.gym_body_weights
  AS PERMISSIVE FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS gym_body_weights_updated_at ON public.gym_body_weights;
CREATE TRIGGER gym_body_weights_updated_at
  BEFORE UPDATE ON public.gym_body_weights
  FOR EACH ROW EXECUTE FUNCTION public.gym_set_updated_at();

-- ── Public bucket for exercise demonstration images ─────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('gym-exercise-images', 'gym-exercise-images', true)
ON CONFLICT (id) DO NOTHING;

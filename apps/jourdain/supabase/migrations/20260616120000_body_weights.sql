-- Promote the bodyweight log to a first-class health/vitals table: precise
-- timestamp (date + time), optional smart-scale body-composition fields, and a
-- source. The latest entry feeds the gym strength-standards benchmarks.

ALTER TABLE public.gym_body_weights RENAME TO body_weights;

-- Move from one-per-day to timestamped weigh-ins (allow multiple per day).
ALTER TABLE public.body_weights
  DROP CONSTRAINT IF EXISTS gym_body_weights_user_id_measured_on_key;
DROP INDEX IF EXISTS public.gym_body_weights_user_date_idx;
ALTER TABLE public.body_weights DROP COLUMN IF EXISTS measured_on;

ALTER TABLE public.body_weights
  ADD COLUMN IF NOT EXISTS measured_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS body_fat_pct numeric(4,1) CHECK (body_fat_pct >= 0 AND body_fat_pct <= 100),
  ADD COLUMN IF NOT EXISTS muscle_mass_kg numeric(5,2) CHECK (muscle_mass_kg >= 0 AND muscle_mass_kg < 500),
  ADD COLUMN IF NOT EXISTS body_water_pct numeric(4,1) CHECK (body_water_pct >= 0 AND body_water_pct <= 100),
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS body_weights_user_at_idx
  ON public.body_weights (user_id, measured_at DESC);

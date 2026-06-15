-- Imported Apple Health data (from the iOS "Health Auto Export" JSON export).
-- User-owned data: RLS with own-row SELECT policies. Writes happen server-side
-- via the service role in the import route. Rows upsert on natural keys so
-- re-importing an overlapping export is idempotent.

-- Daily metric samples: one row per (user, metric, day). qty is the day value;
-- min/avg/max are only populated for range metrics (e.g. heart_rate).
CREATE TABLE IF NOT EXISTS public.health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  units text,
  measured_on date NOT NULL,
  qty numeric,
  qty_min numeric,
  qty_avg numeric,
  qty_max numeric,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name, measured_on)
);

CREATE INDEX IF NOT EXISTS health_metrics_user_name_date_idx
  ON public.health_metrics (user_id, name, measured_on);

-- One row per night, from the sleep_analysis metric. Stage durations in hours.
CREATE TABLE IF NOT EXISTS public.health_sleep (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_on date NOT NULL,
  in_bed_start timestamptz,
  in_bed_end timestamptz,
  sleep_start timestamptz,
  sleep_end timestamptz,
  total_sleep numeric,
  rem numeric,
  deep numeric,
  core numeric,
  awake numeric,
  asleep numeric,
  in_bed numeric,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, measured_on)
);

CREATE INDEX IF NOT EXISTS health_sleep_user_date_idx
  ON public.health_sleep (user_id, measured_on DESC);

-- Workout sessions: summary stats only (high-frequency nested series dropped).
CREATE TABLE IF NOT EXISTS public.health_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,
  duration numeric,
  total_energy numeric,
  active_energy numeric,
  distance numeric,
  step_count numeric,
  avg_heart_rate numeric,
  max_heart_rate numeric,
  min_heart_rate numeric,
  intensity numeric,
  is_indoor boolean,
  location text,
  temperature numeric,
  humidity numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, external_id)
);

CREATE INDEX IF NOT EXISTS health_workouts_user_start_idx
  ON public.health_workouts (user_id, started_at DESC);

ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_sleep ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS health_metrics_select_own ON public.health_metrics;
CREATE POLICY health_metrics_select_own ON public.health_metrics
  AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS health_sleep_select_own ON public.health_sleep;
CREATE POLICY health_sleep_select_own ON public.health_sleep
  AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS health_workouts_select_own ON public.health_workouts;
CREATE POLICY health_workouts_select_own ON public.health_workouts
  AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());

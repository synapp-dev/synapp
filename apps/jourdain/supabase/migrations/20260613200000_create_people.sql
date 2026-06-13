-- Personal CRM: people the user interacts with, grouped into circles.
-- Birthday is stored as separate month/day/year so the year can be unknown.

CREATE TABLE IF NOT EXISTS public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 200),
  nickname text,
  circles text[] NOT NULL DEFAULT '{}'::text[]
    CONSTRAINT people_circles_allowed CHECK (
      circles <@ ARRAY['work','friends','family']::text[]
    ),
  birthday_month smallint CHECK (birthday_month BETWEEN 1 AND 12),
  birthday_day smallint CHECK (birthday_day BETWEEN 1 AND 31),
  birthday_year smallint CHECK (birthday_year BETWEEN 1900 AND 2100),
  emails text[] NOT NULL DEFAULT '{}'::text[],
  phone text,
  company text,
  role text,
  interests text[] NOT NULL DEFAULT '{}'::text[],
  bio text,
  facts text[] NOT NULL DEFAULT '{}'::text[],
  touch_base_days integer CHECK (touch_base_days > 0),
  last_touch_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS people_user_name_idx
  ON public.people (user_id, full_name);

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS people_select_own ON public.people;
CREATE POLICY people_select_own ON public.people
  AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS people_insert_own ON public.people;
CREATE POLICY people_insert_own ON public.people
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS people_update_own ON public.people;
CREATE POLICY people_update_own ON public.people
  AS PERMISSIVE FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS people_delete_own ON public.people;
CREATE POLICY people_delete_own ON public.people
  AS PERMISSIVE FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Reuse the generic updated_at trigger function created for tasks.
DROP TRIGGER IF EXISTS people_set_updated_at ON public.people;
CREATE TRIGGER people_set_updated_at
  BEFORE UPDATE ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.tasks_set_updated_at();

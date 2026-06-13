-- Tasks module (Work > Tasks) — first real Jourdain domain.
-- Per-user tasks, RLS scoped directly to auth.uid().

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (status = ANY (ARRAY['open'::text, 'done'::text])),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_user_status_due_idx
  ON public.tasks (user_id, status, due_date NULLS LAST, created_at DESC);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasks_select_own ON public.tasks;
CREATE POLICY tasks_select_own ON public.tasks
  AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS tasks_insert_own ON public.tasks;
CREATE POLICY tasks_insert_own ON public.tasks
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS tasks_update_own ON public.tasks;
CREATE POLICY tasks_update_own ON public.tasks
  AS PERMISSIVE FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS tasks_delete_own ON public.tasks;
CREATE POLICY tasks_delete_own ON public.tasks
  AS PERMISSIVE FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Keep updated_at fresh on every update.
CREATE OR REPLACE FUNCTION public.tasks_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_set_updated_at ON public.tasks;
CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_set_updated_at();

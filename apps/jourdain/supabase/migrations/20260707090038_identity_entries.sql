-- Identity module: freeform entries per identity section (vision, values,
-- goals, ...). extras holds section-specific fields, e.g. goals' target date.

CREATE TABLE IF NOT EXISTS public.identity_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (char_length(section) BETWEEN 1 AND 50),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body text,
  extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS identity_entries_user_section_order_idx
  ON public.identity_entries (user_id, section, order_index);

ALTER TABLE public.identity_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS identity_entries_select_own ON public.identity_entries;
CREATE POLICY identity_entries_select_own ON public.identity_entries
  AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS identity_entries_insert_own ON public.identity_entries;
CREATE POLICY identity_entries_insert_own ON public.identity_entries
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS identity_entries_update_own ON public.identity_entries;
CREATE POLICY identity_entries_update_own ON public.identity_entries
  AS PERMISSIVE FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS identity_entries_delete_own ON public.identity_entries;
CREATE POLICY identity_entries_delete_own ON public.identity_entries
  AS PERMISSIVE FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Reuse the generic updated_at trigger function created for tasks.
DROP TRIGGER IF EXISTS identity_entries_set_updated_at ON public.identity_entries;
CREATE TRIGGER identity_entries_set_updated_at
  BEFORE UPDATE ON public.identity_entries
  FOR EACH ROW EXECUTE FUNCTION public.tasks_set_updated_at();

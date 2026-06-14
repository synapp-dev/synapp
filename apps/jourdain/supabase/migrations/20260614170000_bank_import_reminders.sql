-- Per-user state for the "your bank data is stale" push nudge.
-- Kept separate from notification_settings so creating a row here never
-- side-effects the daily digest. last_sent gates the nudge to once per UTC day.

CREATE TABLE IF NOT EXISTS public.bank_import_reminders (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  last_sent date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_import_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_import_reminders_select_own ON public.bank_import_reminders;
CREATE POLICY bank_import_reminders_select_own ON public.bank_import_reminders
  AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());

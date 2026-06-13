-- Web Push notifications: device subscriptions, per-user reminder settings,
-- and per-task reminder timestamps.

-- 1. Push subscriptions ------------------------------------------------------
-- One row per browser/device push endpoint. The user manages their own rows;
-- the server (service role) reads them when sending notifications.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_select_own ON public.push_subscriptions
  AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_insert_own ON public.push_subscriptions
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_delete_own ON public.push_subscriptions
  AS PERMISSIVE FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 2. Notification settings ---------------------------------------------------
-- Per-user daily-digest preferences. digest_hour is the local hour (0-23) at
-- which the digest should fire, interpreted in `timezone`.
CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_digest_enabled boolean NOT NULL DEFAULT true,
  digest_hour smallint NOT NULL DEFAULT 8 CHECK (digest_hour BETWEEN 0 AND 23),
  timezone text NOT NULL DEFAULT 'UTC',
  last_digest_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_settings_select_own ON public.notification_settings;
CREATE POLICY notification_settings_select_own ON public.notification_settings
  AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS notification_settings_insert_own ON public.notification_settings;
CREATE POLICY notification_settings_insert_own ON public.notification_settings
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notification_settings_update_own ON public.notification_settings;
CREATE POLICY notification_settings_update_own ON public.notification_settings
  AS PERMISSIVE FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notification_settings_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_settings_set_updated_at ON public.notification_settings;
CREATE TRIGGER notification_settings_set_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.notification_settings_set_updated_at();

-- 3. Per-task reminders ------------------------------------------------------
-- remind_at: when to push a reminder for this task. reminded_at: when we last
-- sent that push, so the runner never double-fires.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS remind_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminded_at timestamptz;

-- Lets the runner cheaply find due, not-yet-sent reminders.
CREATE INDEX IF NOT EXISTS tasks_remind_due_idx
  ON public.tasks (remind_at)
  WHERE remind_at IS NOT NULL AND reminded_at IS NULL AND status = 'open';

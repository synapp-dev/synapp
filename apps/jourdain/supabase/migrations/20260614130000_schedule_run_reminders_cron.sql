-- Drive per-task push reminders from Postgres instead of Vercel Cron.
--
-- Vercel Hobby crons run at most once/day, which is too coarse for "remind me
-- at 5:00pm" reminders. pg_cron fires every minute and pg_net calls the already
-- deployed /api/push/run-reminders endpoint, so reminders land within ~1 min of
-- their remind_at regardless of the Vercel plan.
--
-- ONE-TIME SETUP (NOT in this migration, to keep the secret out of git):
-- the cron command reads the run-reminders Bearer token from Supabase Vault.
-- Create it once with the same value as the deployment's CRON_SECRET env var:
--
--   select vault.create_secret(
--     '<CRON_SECRET>', 'jourdain_cron_secret',
--     'Bearer secret for the run-reminders pg_cron job (mirrors Vercel CRON_SECRET)'
--   );

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- cron.schedule upserts by jobname (pg_cron >= 1.4), so re-running is safe.
select cron.schedule(
  'jourdain-run-reminders',
  '* * * * *',
  $cron$
    select net.http_post(
      url     := 'https://www.jourdain.ai/api/push/run-reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'jourdain_cron_secret'),
        'Content-Type', 'application/json'
      ),
      body    := '{}'::jsonb,
      timeout_milliseconds := 8000
    );
  $cron$
);

-- Distinguish Xero vs Square catalog import jobs (shared progress table + Realtime)

ALTER TABLE public.inventory_setup_import_jobs
  ADD COLUMN IF NOT EXISTS job_type text NOT NULL DEFAULT 'xero'
    CHECK (job_type IN ('xero', 'square_catalog'));

CREATE INDEX IF NOT EXISTS inventory_setup_import_jobs_venue_type_active_idx
  ON public.inventory_setup_import_jobs (venue_id, job_type, created_at DESC)
  WHERE status IN ('pending', 'running');

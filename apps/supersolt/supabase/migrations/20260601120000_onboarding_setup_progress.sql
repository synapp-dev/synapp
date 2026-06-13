-- Onboarding Phase 1a: optional-step skips and future gate flags on organisations.

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS setup_progress jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organisations.setup_progress IS
  'Onboarding progress: xeroSkipped, teamSkipped, squareConnectedAt, etc.';

-- Onboarding Phase 1a: benchmark / sales-history start date per venue.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS data_starts_from date;

COMMENT ON COLUMN public.venues.data_starts_from IS
  'Earliest date to use for sales insights baseline; set during onboarding.';

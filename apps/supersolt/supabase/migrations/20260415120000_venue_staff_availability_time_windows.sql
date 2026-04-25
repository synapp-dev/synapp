-- Optional time window when `is_available` is true. NULL start/end = all day (no specific hours).

ALTER TABLE public.venue_staff_weekly_availability
  ADD COLUMN IF NOT EXISTS available_start_time time without time zone NULL,
  ADD COLUMN IF NOT EXISTS available_end_time time without time zone NULL;

ALTER TABLE public.venue_staff_week_instance_availability
  ADD COLUMN IF NOT EXISTS available_start_time time without time zone NULL,
  ADD COLUMN IF NOT EXISTS available_end_time time without time zone NULL;

-- "Ping" routines: high-frequency interval reminders (e.g. drink water every
-- 30 min, 8am–9pm) that are never "completed" — they fire on a schedule and you
-- just acknowledge them. Modelled on the routine row itself (no per-slot task
-- rows): next_fire_at drives firing, last_acked_at records acknowledgement.

ALTER TABLE public.routines DROP CONSTRAINT IF EXISTS routines_freq_check;
ALTER TABLE public.routines
  ADD CONSTRAINT routines_freq_check
  CHECK (freq = ANY (ARRAY['daily','weekly','monthly','interval']::text[]));

ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS interval_minutes smallint
    CHECK (interval_minutes BETWEEN 1 AND 1440),
  ADD COLUMN IF NOT EXISTS window_start time NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS window_end time NOT NULL DEFAULT '21:00',
  ADD COLUMN IF NOT EXISTS next_fire_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_acked_at timestamptz;

-- Next interval slot strictly after p_after, evaluated in the routine timezone.
CREATE OR REPLACE FUNCTION public.routine_next_fire(
  p_window_start time, p_window_end time, p_interval int, p_tz text, p_after timestamptz
) RETURNS timestamptz
LANGUAGE plpgsql STABLE AS $$
DECLARE
  local_after timestamp := p_after AT TIME ZONE p_tz;
  d date := (p_after AT TIME ZONE p_tz)::date;
  ws timestamp;
  we timestamp;
  next_local timestamp;
  k int;
BEGIN
  ws := d + p_window_start;
  we := d + p_window_end;
  IF local_after < ws THEN
    next_local := ws;                       -- before today's window
  ELSIF local_after >= we THEN
    next_local := (d + 1) + p_window_start;  -- past today's window → tomorrow
  ELSE
    k := floor(extract(epoch FROM (local_after - ws)) / 60.0 / p_interval)::int + 1;
    next_local := ws + make_interval(mins => k * p_interval);
    IF next_local > we THEN
      next_local := (d + 1) + p_window_start;
    END IF;
  END IF;
  RETURN next_local AT TIME ZONE p_tz;
END;
$$;

-- Advance a ping routine to its next future slot (after it fires or is acked).
CREATE OR REPLACE FUNCTION public.advance_ping(p_routine_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nf timestamptz;
BEGIN
  UPDATE public.routines r
    SET next_fire_at = public.routine_next_fire(
      r.window_start, r.window_end, r.interval_minutes, r.timezone, now()
    )
    WHERE r.id = p_routine_id AND r.freq = 'interval'
    RETURNING next_fire_at INTO nf;
  RETURN nf;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.advance_ping(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.advance_ping(uuid) TO service_role;

-- Each set has a role in the session structure: a warm-up, one of the working
-- sets, or the final drop/failure set. Drives the guided set-by-set flow and
-- labelling. Warm-ups stay excluded from volume/strength stats (is_warmup),
-- drop sets count as working volume.

ALTER TABLE public.gym_sets
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'working'
    CHECK (kind = ANY (ARRAY['warmup'::text, 'working'::text, 'drop'::text]));

-- Keep kind in step with any existing warm-up flags.
UPDATE public.gym_sets SET kind = 'warmup' WHERE is_warmup AND kind = 'working';

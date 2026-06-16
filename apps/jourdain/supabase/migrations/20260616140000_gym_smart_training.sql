-- Smart programs + session intensity.
--
-- A "smart" program stores only its target muscle_groups (column already exists)
-- and no fixed exercises; the session's exercise list is generated fresh each
-- start from what the lifter is most behind on (see lib/gym/smart-fill.ts).
--
-- Session intensity is chosen at start ('normal' | 'hard') and biases the load
-- suggestions (lib/gym/recommend.ts) — "hard" pushes bigger jumps / PR attempts.

ALTER TABLE public.gym_programs
  ADD COLUMN IF NOT EXISTS is_smart boolean NOT NULL DEFAULT false;

ALTER TABLE public.gym_sessions
  ADD COLUMN IF NOT EXISTS intensity text NOT NULL DEFAULT 'normal'
    CHECK (intensity = ANY (ARRAY['normal'::text, 'hard'::text]));

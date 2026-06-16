-- Programs target muscle *subgroups*, not just the 7 main groups — so a push day
-- can be chest + triceps and a pull day back + biceps (impossible when "Arms" is
-- one atom). muscle_groups stays as a derived rollup for compact badge displays;
-- the smart-fill generator reads muscle_subgroups. Old rows (no subgroups) are
-- handled at read-time by expanding their muscle_groups, so no backfill needed.

ALTER TABLE public.gym_programs
  ADD COLUMN IF NOT EXISTS muscle_subgroups text[] NOT NULL DEFAULT '{}';

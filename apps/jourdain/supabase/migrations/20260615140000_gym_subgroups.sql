-- Gym: move exercises from flat muscle_group to the two-level taxonomy.
-- Exercises now tag a specific subgroup (+ secondary subgroups); the main group
-- is derived in the app from the subgroup. Tables are empty, so this is a clean
-- column swap with no data migration.

DROP INDEX IF EXISTS public.gym_exercises_user_muscle_idx;

ALTER TABLE public.gym_exercises DROP COLUMN IF EXISTS muscle_group;
ALTER TABLE public.gym_exercises DROP COLUMN IF EXISTS secondary_muscles;

ALTER TABLE public.gym_exercises
  ADD COLUMN IF NOT EXISTS subgroup text NOT NULL DEFAULT 'chest_middle'
  CHECK (subgroup = ANY (ARRAY[
    'chest_upper','chest_middle','chest_lower',
    'back_lats','back_traps','back_lower',
    'delts_front','delts_side','delts_rear',
    'biceps','triceps','forearms',
    'abs','obliques','serratus',
    'quads','hamstrings','glutes','adductors',
    'calves','tibialis'
  ]));
ALTER TABLE public.gym_exercises ALTER COLUMN subgroup DROP DEFAULT;

ALTER TABLE public.gym_exercises
  ADD COLUMN IF NOT EXISTS secondary_subgroups text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS gym_exercises_user_subgroup_idx
  ON public.gym_exercises (user_id, subgroup, archived);

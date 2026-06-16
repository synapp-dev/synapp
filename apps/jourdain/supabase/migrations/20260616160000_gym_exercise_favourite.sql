-- "Staple" exercises the lifter prefers. Smart-fill weights favourites up when
-- choosing exercises for a subgroup (without overriding rotation), so the lifts
-- you like surface more often in generated sessions.

ALTER TABLE public.gym_exercises
  ADD COLUMN IF NOT EXISTS is_favourite boolean NOT NULL DEFAULT false;

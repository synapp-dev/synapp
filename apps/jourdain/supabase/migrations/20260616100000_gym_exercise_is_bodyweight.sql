-- Flag bodyweight exercises (pull-up, chin-up, dip, hanging leg raise). Their
-- strength standards are total-weight (bodyweight + added) 1RMs, so the logged
-- est-1RM must add the lifter's bodyweight to the (possibly zero/negative) plate
-- load before it can be positioned against the standards.
ALTER TABLE public.gym_exercises
  ADD COLUMN IF NOT EXISTS is_bodyweight boolean NOT NULL DEFAULT false;

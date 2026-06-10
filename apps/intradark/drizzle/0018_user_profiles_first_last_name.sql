-- Add optional given/family name columns to user_profiles. Rendered as the
-- secondary line ("First Last") on the player profile header; left blank when
-- both are null.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);

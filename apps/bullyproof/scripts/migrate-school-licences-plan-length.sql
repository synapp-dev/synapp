-- Migration: Replace plan with plan_length in school_licences table
-- This migration changes the plan field from text to plan_length (integer 1-5)
-- and removes the ability to manually set start/end dates in favor of plan length selection

BEGIN;

-- Step 1: Add the new plan_length column
ALTER TABLE public.school_licences
ADD COLUMN IF NOT EXISTS plan_length INTEGER;

-- Step 2: Migrate existing data
-- Set plan_length to 3 for existing records (since default ends_at was 3 years)
-- If ends_at exists, calculate plan_length based on the difference
UPDATE public.school_licences
SET plan_length = CASE
  WHEN ends_at IS NOT NULL AND starts_at IS NOT NULL THEN
    EXTRACT(YEAR FROM AGE(ends_at, starts_at))::INTEGER
  ELSE
    3 -- Default to 3 years for existing records
END
WHERE plan_length IS NULL;

-- Step 3: Update ends_at for existing records based on plan_length
-- This ensures consistency: ends_at = starts_at + plan_length years
UPDATE public.school_licences
SET ends_at = starts_at + (plan_length || ' years')::INTERVAL
WHERE starts_at IS NOT NULL 
  AND plan_length IS NOT NULL
  AND (ends_at IS NULL OR ends_at != starts_at + (plan_length || ' years')::INTERVAL);

-- Step 4: Set plan_length as NOT NULL with default value of 3
ALTER TABLE public.school_licences
ALTER COLUMN plan_length SET DEFAULT 3,
ALTER COLUMN plan_length SET NOT NULL;

-- Step 5: Add check constraint to ensure plan_length is between 1 and 5
ALTER TABLE public.school_licences
ADD CONSTRAINT school_licences_plan_length_check 
CHECK (plan_length >= 1 AND plan_length <= 5);

-- Step 6: Drop the old plan column
ALTER TABLE public.school_licences
DROP COLUMN IF EXISTS plan;

-- Step 7: Update the default for ends_at to be calculated from starts_at + plan_length
-- Note: Since PostgreSQL defaults can't reference other columns, we'll keep the default
-- as CURRENT_DATE + 3 years (matching plan_length default). Application logic should
-- calculate ends_at = starts_at + plan_length years when creating new records.
ALTER TABLE public.school_licences
ALTER COLUMN ends_at SET DEFAULT (CURRENT_DATE + '3 years'::INTERVAL);

COMMIT;

-- Optional: Add a comment to document the change
COMMENT ON COLUMN public.school_licences.plan_length IS 'Licence duration in years (1-5). Determines ends_at as starts_at + plan_length years.';


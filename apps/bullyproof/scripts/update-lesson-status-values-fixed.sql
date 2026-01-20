-- Update lesson status values and constraint (FIXED VERSION)
-- Run this script in Supabase SQL Editor
-- This script updates the lessons table to use the new status flow:
-- preparing -> ready -> in_progress -> feedback -> completed (with cancelled as exception)

BEGIN;

-- Step 1: Update existing lessons with old status values to new values
UPDATE lessons
SET status = 'feedback'
WHERE status = 'pending_review';

UPDATE lessons
SET status = 'preparing'
WHERE status = 'draft';

UPDATE lessons
SET status = 'ready'
WHERE status = 'scheduled';

-- Step 2: Drop ALL possible constraint variations
DO $$ 
BEGIN
    -- Try to drop the constraint, ignore if it doesn't exist
    ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_status_check;
    ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_status_chk;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Step 3: Add the new constraint with updated status values
ALTER TABLE lessons ADD CONSTRAINT lessons_status_check 
  CHECK (status = ANY (ARRAY['preparing'::text, 'ready'::text, 'in_progress'::text, 'feedback'::text, 'completed'::text, 'cancelled'::text]));

-- Step 4: Update the default value for new lessons
ALTER TABLE lessons ALTER COLUMN status SET DEFAULT 'preparing';

COMMIT;

-- Verification: Check that the constraint was created correctly
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'lessons'::regclass 
  AND contype = 'c'
  AND conname = 'lessons_status_check';

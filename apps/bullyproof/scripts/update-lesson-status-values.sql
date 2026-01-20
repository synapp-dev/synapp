-- Update lesson status values and constraint
-- This script updates the lessons table to use the new status flow:
-- preparing -> ready -> in_progress -> feedback -> completed (with cancelled as exception)

-- Step 1: First, let's check what constraints exist (for debugging)
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'lessons'::regclass AND contype = 'c';

-- Step 2: Update existing lessons with old status values to new values
UPDATE lessons
SET status = 'feedback'
WHERE status = 'pending_review';

UPDATE lessons
SET status = 'preparing'
WHERE status = 'draft';

UPDATE lessons
SET status = 'ready'
WHERE status = 'scheduled';

-- Step 3: Drop ALL possible constraint names (in case there are variations)
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_status_check;
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_status_chk;

-- Step 4: Add the new constraint with updated status values
ALTER TABLE lessons ADD CONSTRAINT lessons_status_check 
  CHECK (status = ANY (ARRAY['preparing'::text, 'ready'::text, 'in_progress'::text, 'feedback'::text, 'completed'::text, 'cancelled'::text]));

-- Step 5: Update the default value for new lessons
ALTER TABLE lessons ALTER COLUMN status SET DEFAULT 'preparing';

-- Verification queries (run these to check the results)
-- Check constraint exists and is correct:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'lessons'::regclass AND contype = 'c' AND conname = 'lessons_status_check';

-- Check status distribution:
-- SELECT status, COUNT(*) as count FROM lessons GROUP BY status ORDER BY status;

-- Test that the constraint works (should return no rows if constraint is correct):
-- SELECT * FROM lessons WHERE status NOT IN ('preparing', 'ready', 'in_progress', 'feedback', 'completed', 'cancelled');

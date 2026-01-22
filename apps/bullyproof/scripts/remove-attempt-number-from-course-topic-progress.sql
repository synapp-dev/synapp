-- Migration: Remove attempt_number from course_topic_progress
-- Since we now only track one progress record per user/topic (no multiple attempts),
-- the attempt_number column is redundant and can be removed.

-- Step 1: Ensure all records have attempt_number=1 (or delete duplicates if any exist)
-- First, check for any duplicates and handle them
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Count duplicates (same user_id, course_id, topic_id with different attempt_number)
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT user_id, course_id, topic_id, COUNT(*) as cnt
        FROM course_topic_progress
        GROUP BY user_id, course_id, topic_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        -- Keep only the record with attempt_number=1, delete others
        -- If no attempt_number=1 exists, keep the one with highest attempt_number
        DELETE FROM course_topic_progress
        WHERE id IN (
            SELECT id
            FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY user_id, course_id, topic_id 
                           ORDER BY 
                               CASE WHEN attempt_number = 1 THEN 0 ELSE 1 END,
                               attempt_number DESC
                       ) as rn
                FROM course_topic_progress
            ) ranked
            WHERE rn > 1
        );
        
        RAISE NOTICE 'Deleted % duplicate progress records', duplicate_count;
    END IF;
END $$;

-- Step 2: Drop the unique constraint that includes attempt_number
ALTER TABLE course_topic_progress 
DROP CONSTRAINT IF EXISTS course_topic_progress_user_course_topic_attempt_unique;

-- Step 3: Create new unique constraint without attempt_number
ALTER TABLE course_topic_progress
ADD CONSTRAINT course_topic_progress_user_course_topic_unique 
UNIQUE(user_id, course_id, topic_id);

-- Step 4: Drop the old index that includes attempt_number
DROP INDEX IF EXISTS idx_course_topic_progress_user_topic;

-- Step 5: Create new index without attempt_number
CREATE INDEX idx_course_topic_progress_user_topic 
ON course_topic_progress(user_id, topic_id);

-- Step 6: Remove the attempt_number column
ALTER TABLE course_topic_progress
DROP COLUMN IF EXISTS attempt_number;

-- Step 7: Update any existing records to ensure they're valid
-- (This is a no-op since we already handled duplicates above)
UPDATE course_topic_progress
SET updated_at = updated_at
WHERE TRUE; -- No-op, just ensures all records are valid

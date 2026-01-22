-- Migration: Refactor quiz_attempt_answers to use JSONB for multiple answers
-- This changes from one row per answer to one row per question with JSONB array of answer IDs
-- Also adds metadata column to track answer changes

-- Step 1: Add new columns (nullable initially)
ALTER TABLE quiz_attempt_answers 
ADD COLUMN IF NOT EXISTS answer_ids jsonb,
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Step 2: Migrate existing data - aggregate answer_id values into JSONB array per question
-- Group by (attempt_id, question_id) and create JSONB array of answer_ids
DO $$
DECLARE
  answer_group RECORD;
  answer_ids_array jsonb;
BEGIN
  -- For each unique (attempt_id, question_id) combination
  FOR answer_group IN 
    SELECT DISTINCT attempt_id, question_id
    FROM quiz_attempt_answers
    WHERE answer_ids IS NULL
  LOOP
    -- Aggregate all answer_ids for this question into a JSONB array
    SELECT jsonb_agg(answer_id ORDER BY answered_at)
    INTO answer_ids_array
    FROM quiz_attempt_answers
    WHERE attempt_id = answer_group.attempt_id
      AND question_id = answer_group.question_id;
    
    -- Update the first row (we'll keep this one) with the aggregated answer_ids
    UPDATE quiz_attempt_answers
    SET answer_ids = answer_ids_array,
        metadata = jsonb_build_object(
          'migrated', true,
          'migratedAt', now()
        )
    WHERE id = (
      SELECT id 
      FROM quiz_attempt_answers
      WHERE attempt_id = answer_group.attempt_id
        AND question_id = answer_group.question_id
      ORDER BY answered_at ASC
      LIMIT 1
    );
    
    -- Delete the duplicate rows (keep only the first one)
    DELETE FROM quiz_attempt_answers
    WHERE attempt_id = answer_group.attempt_id
      AND question_id = answer_group.question_id
      AND answer_ids IS NULL;
  END LOOP;
END $$;

-- Step 3: Make answer_ids NOT NULL (now that all rows have been migrated)
ALTER TABLE quiz_attempt_answers 
ALTER COLUMN answer_ids SET NOT NULL;

-- Step 4: Drop the old unique constraint on (attempt_id, question_id, answer_id)
ALTER TABLE quiz_attempt_answers 
DROP CONSTRAINT IF EXISTS quiz_attempt_answers_attempt_question_answer_unique;

-- Step 5: Create new unique constraint on (attempt_id, question_id) - one row per question
CREATE UNIQUE INDEX IF NOT EXISTS quiz_attempt_answers_attempt_question_unique 
ON quiz_attempt_answers(attempt_id, question_id);

-- Step 6: Make answer_id nullable (no longer required, stored in answer_ids JSONB)
-- This allows new inserts to work without providing answer_id
ALTER TABLE quiz_attempt_answers 
ALTER COLUMN answer_id DROP NOT NULL;

-- Step 7: For existing rows, set answer_id to the first answer from answer_ids array
-- This maintains backward compatibility
UPDATE quiz_attempt_answers
SET answer_id = (answer_ids->>0)::uuid
WHERE answer_id IS NULL AND answer_ids IS NOT NULL AND jsonb_array_length(answer_ids) > 0;

-- Note: We keep answer_id column for backward compatibility during transition
-- It can be dropped later once all code is migrated to use answer_ids

-- Step 8: Create index on answer_ids for efficient queries
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_answer_ids 
ON quiz_attempt_answers USING gin(answer_ids);

-- Step 9: Create index on metadata for efficient queries
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_metadata 
ON quiz_attempt_answers USING gin(metadata);

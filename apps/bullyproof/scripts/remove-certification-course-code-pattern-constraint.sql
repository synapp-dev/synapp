-- Remove certification_courses code pattern constraint
-- This removes any CHECK constraint on the code field to allow any string value
-- The code field will still have a UNIQUE constraint

-- Drop the existing constraint if it exists (using IF EXISTS to avoid errors)
ALTER TABLE certification_courses 
DROP CONSTRAINT IF EXISTS certification_courses_code_chk;

-- Note: The UNIQUE constraint on code (certification_courses_code_key) remains intact
-- This ensures codes are still unique but allows any string format

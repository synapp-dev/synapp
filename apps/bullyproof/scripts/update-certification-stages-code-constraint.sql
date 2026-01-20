-- Remove certification_stages code constraint
-- Remove the pattern constraint to allow any code value

-- Drop the existing constraint
ALTER TABLE certification_stages DROP CONSTRAINT IF EXISTS certification_stages_code_chk;


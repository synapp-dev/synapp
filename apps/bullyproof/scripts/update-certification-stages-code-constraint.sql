-- Update certification_stages code constraint
-- Change from CS1, CS2 pattern to C, C1, C2 pattern
-- This allows just "C" or "C" followed by numbers

-- Drop the existing constraint
ALTER TABLE certification_stages DROP CONSTRAINT IF EXISTS certification_stages_code_chk;

-- Create new constraint that allows C or C followed by numbers
ALTER TABLE certification_stages ADD CONSTRAINT certification_stages_code_chk 
CHECK (code ~ '^C[0-9]*$'::text);


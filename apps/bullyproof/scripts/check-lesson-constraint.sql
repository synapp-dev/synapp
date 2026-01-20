-- Diagnostic query to check the current constraint on lessons.status
-- Run this first to see what constraint currently exists

SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'lessons'::regclass 
  AND contype = 'c'
  AND conname LIKE '%status%'
ORDER BY conname;

-- Also check the default value
SELECT 
    column_name,
    column_default,
    data_type
FROM information_schema.columns
WHERE table_name = 'lessons' 
  AND column_name = 'status';

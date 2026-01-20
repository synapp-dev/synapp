-- Remove Enforce_lesson_stage_min_requirement constraint
-- This constraint prevents certain year levels from engaging in certain topics
-- The logic no longer applies, so we need to remove this constraint

BEGIN;

-- Step 0: Direct drop attempt (most common case - CHECK constraint on lessons table)
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS Enforce_lesson_stage_min_requirement;

-- Step 1: Check if the constraint exists as a CHECK constraint on the lessons table
-- This query will help identify the constraint if it exists
DO $$
DECLARE
    constraint_exists BOOLEAN;
    constraint_type TEXT;
BEGIN
    -- Check for CHECK constraint
    SELECT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'Enforce_lesson_stage_min_requirement'
          AND conrelid = 'lessons'::regclass
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'Found CHECK constraint: Enforce_lesson_stage_min_requirement';
        ALTER TABLE lessons DROP CONSTRAINT IF EXISTS Enforce_lesson_stage_min_requirement;
        RAISE NOTICE 'Dropped CHECK constraint: Enforce_lesson_stage_min_requirement';
    ELSE
        RAISE NOTICE 'CHECK constraint not found, checking for trigger function...';
    END IF;
END $$;

-- Step 2: Check if it exists as a trigger function and drop the trigger
DO $$
DECLARE
    trigger_exists BOOLEAN;
BEGIN
    -- Check if trigger exists
    SELECT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'Enforce_lesson_stage_min_requirement'
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        RAISE NOTICE 'Found trigger: Enforce_lesson_stage_min_requirement';
        DROP TRIGGER IF EXISTS Enforce_lesson_stage_min_requirement ON lessons;
        RAISE NOTICE 'Dropped trigger: Enforce_lesson_stage_min_requirement';
    ELSE
        RAISE NOTICE 'Trigger not found';
    END IF;
END $$;

-- Step 3: Drop the function if it exists (in case it's a trigger function)
-- Common naming patterns for such functions
DROP FUNCTION IF EXISTS enforce_lesson_stage_min_requirement() CASCADE;
DROP FUNCTION IF EXISTS Enforce_lesson_stage_min_requirement() CASCADE;

-- Step 4: Also check for variations in naming (case-insensitive search)
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Search for any constraint with similar name pattern
    FOR constraint_record IN 
        SELECT conname, contype
        FROM pg_constraint 
        WHERE conrelid = 'lessons'::regclass
          AND LOWER(conname) LIKE '%enforce%lesson%stage%min%requirement%'
    LOOP
        RAISE NOTICE 'Found constraint: % (type: %)', constraint_record.conname, constraint_record.contype;
        EXECUTE format('ALTER TABLE lessons DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
        RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    END LOOP;
END $$;

COMMIT;

-- Verification queries (run these after the script to confirm removal)
-- Check for any remaining constraints with similar names
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'lessons'::regclass 
  AND (
    LOWER(conname) LIKE '%enforce%lesson%stage%min%requirement%'
    OR LOWER(conname) LIKE '%lesson%stage%min%'
  )
ORDER BY conname;

-- Check for any remaining triggers with similar names
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    tgenabled AS enabled
FROM pg_trigger 
WHERE tgrelid = 'lessons'::regclass
  AND LOWER(tgname) LIKE '%enforce%lesson%stage%min%requirement%'
ORDER BY tgname;

-- Check for any remaining functions with similar names
SELECT 
    proname AS function_name,
    pg_get_functiondef(oid) AS function_definition
FROM pg_proc 
WHERE LOWER(proname) LIKE '%enforce%lesson%stage%min%requirement%'
ORDER BY proname;

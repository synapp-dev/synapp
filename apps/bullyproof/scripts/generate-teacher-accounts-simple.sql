-- Generate teacher accounts for all schools in the database
-- This script creates teacher emails from the first two words of school names
-- and calls the create_user function for each school

-- Create teacher accounts for all schools
DO $$
DECLARE
    school_record RECORD;
    teacher_email TEXT;
    first_word TEXT;
    second_word TEXT;
BEGIN
    -- Loop through all schools
    FOR school_record IN 
        SELECT name, id 
        FROM schools 
        ORDER BY name
    LOOP
        -- Extract first two words from school name
        SELECT 
            LOWER(TRIM(SPLIT_PART(school_record.name, ' ', 1))),
            LOWER(TRIM(SPLIT_PART(school_record.name, ' ', 2)))
        INTO first_word, second_word;
        
        -- Clean up the words (remove common school suffixes)
        first_word := REGEXP_REPLACE(first_word, '(state|school|college|high|primary|secondary|grammar|central|east|west|north|south)$', '', 'gi');
        second_word := REGEXP_REPLACE(second_word, '(state|school|college|high|primary|secondary|grammar|central|east|west|north|south)$', '', 'gi');
        
        -- Remove any non-alphabetic characters
        first_word := REGEXP_REPLACE(first_word, '[^a-z]', '', 'g');
        second_word := REGEXP_REPLACE(second_word, '[^a-z]', '', 'g');
        
        -- Create email from first two words
        IF second_word != '' AND second_word IS NOT NULL THEN
            teacher_email := 'teacher@' || first_word || second_word || '.edu.au';
        ELSE
            teacher_email := 'teacher@' || first_word || '.edu.au';
        END IF;
        
        -- Create the user account
        BEGIN
            PERFORM create_user(teacher_email, 'bullyproof');
            RAISE NOTICE 'Created teacher account: % for school: %', teacher_email, school_record.name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to create account for %: %', teacher_email, SQLERRM;
        END;
    END LOOP;
END $$;

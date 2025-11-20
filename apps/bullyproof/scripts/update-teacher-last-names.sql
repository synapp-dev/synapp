-- Update user_profiles to capitalize first_name to 'Teacher' and set last_name to null
-- This query will find all rows where first_name is 'teacher' (case-insensitive)
-- and set their first_name to 'Teacher' and last_name to null

UPDATE public.user_profiles 
SET 
    first_name = 'Teacher',
    last_name = NULL,
    updated_at = NOW()
WHERE 
    LOWER(first_name) = 'teacher' AND last_name IS NULL;

-- Optional: Show how many rows were affected
-- You can run this query after the UPDATE to see the results
-- SELECT COUNT(*) as affected_rows 
-- FROM public.user_profiles 
-- WHERE LOWER(first_name) = 'teacher' AND last_name IS NULL;

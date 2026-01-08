-- Cleanup script: Remove class-year assignments that don't match the school's level
-- 
-- This script removes any class_years records where:
-- - A primary school has classes assigned to secondary year levels (7-12)
-- - A secondary school has classes assigned to primary year levels (Prep-6)
-- - P-12 schools are unaffected (they can have all year levels)
--
-- Run this in Supabase SQL Editor

-- First, let's see what we're about to delete (for review)
SELECT 
    c.id AS class_id,
    c.name AS class_name,
    s.id AS school_id,
    s.name AS school_name,
    sy.id AS school_year_id,
    sy.code AS year_code,
    sy.display_name AS year_display_name,
    sl.key AS year_level_key,
    sl.name AS year_level_name,
    array_agg(DISTINCT sla.level_id) AS school_level_ids,
    array_agg(DISTINCT sl_assigned.key) AS school_level_keys
FROM class_years cy
INNER JOIN classes c ON c.id = cy.class_id
INNER JOIN schools s ON s.id = c.school_id
INNER JOIN school_years sy ON sy.id = cy.school_year_id
INNER JOIN school_levels sl ON sl.id = sy.level_id
LEFT JOIN school_level_assignments sla ON sla.school_id = s.id
LEFT JOIN school_levels sl_assigned ON sl_assigned.id = sla.level_id
WHERE NOT EXISTS (
    -- Check if the school has this level assigned
    SELECT 1
    FROM school_level_assignments sla_check
    WHERE sla_check.school_id = s.id
    AND sla_check.level_id = sy.level_id
)
GROUP BY 
    c.id, c.name, s.id, s.name, sy.id, sy.code, sy.display_name, sl.key, sl.name
ORDER BY s.name, c.name, sy.sort_index;

-- Now delete the invalid assignments
-- This will remove class-year links where the year's level doesn't match the school's assigned levels
DELETE FROM class_years
WHERE (class_id, school_year_id) IN (
    SELECT 
        cy.class_id,
        cy.school_year_id
    FROM class_years cy
    INNER JOIN classes c ON c.id = cy.class_id
    INNER JOIN school_years sy ON sy.id = cy.school_year_id
    WHERE NOT EXISTS (
        -- Check if the school has this level assigned
        SELECT 1
        FROM school_level_assignments sla
        WHERE sla.school_id = c.school_id
        AND sla.level_id = sy.level_id
    )
);

-- Verify the cleanup: Check if there are any remaining invalid assignments
SELECT 
    COUNT(*) AS remaining_invalid_assignments
FROM class_years cy
INNER JOIN classes c ON c.id = cy.class_id
INNER JOIN school_years sy ON sy.id = cy.school_year_id
WHERE NOT EXISTS (
    SELECT 1
    FROM school_level_assignments sla
    WHERE sla.school_id = c.school_id
    AND sla.level_id = sy.level_id
);

-- If the count above is 0, the cleanup was successful!

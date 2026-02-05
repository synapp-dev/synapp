-- Fix: Enable lessons feature for a specific school
-- This will enable the school-level permission, which takes precedence over role-level

-- Replace @school_id with the actual school UUID
-- From the CSV: school_id = 'bf90df17-daf9-4f07-b4ef-d4be6355145d'
-- Feature ID for 'lessons': '4fd75d84-54a9-46d0-bc10-bfc807248bd9'

-- Option 1: Update the existing school-level permission to enabled
UPDATE feature_permissions
SET 
  enabled = true,
  updated_at = NOW()
WHERE 
  feature_id = '4fd75d84-54a9-46d0-bc10-bfc807248bd9'
  AND level = 'school'
  AND target_id = 'bf90df17-daf9-4f07-b4ef-d4be6355145d';

-- Option 2: If the permission doesn't exist, create it
-- (This uses ON CONFLICT to update if it exists, insert if it doesn't)
INSERT INTO feature_permissions (
  feature_id,
  level,
  target_id,
  enabled,
  created_at,
  updated_at
)
VALUES (
  '4fd75d84-54a9-46d0-bc10-bfc807248bd9', -- lessons feature ID
  'school',
  'bf90df17-daf9-4f07-b4ef-d4be6355145d', -- school ID
  true,
  NOW(),
  NOW()
)
ON CONFLICT (feature_id, level, target_id)
DO UPDATE SET
  enabled = true,
  updated_at = NOW();

-- Verify the fix
SELECT 
  feature_key,
  feature_name,
  level,
  target_name,
  target_type,
  enabled,
  updated_at
FROM v_feature_permissions_readable
WHERE 
  feature_key = 'lessons'
  AND (
    (level = 'school' AND target_id = 'bf90df17-daf9-4f07-b4ef-d4be6355145d')
    OR (level = 'role' AND target_id = '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4')
    OR (level = 'global')
  )
ORDER BY 
  CASE level
    WHEN 'school' THEN 1
    WHEN 'role' THEN 2
    WHEN 'global' THEN 3
  END;

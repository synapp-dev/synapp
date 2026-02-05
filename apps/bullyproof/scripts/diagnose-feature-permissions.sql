-- Diagnostic query to see feature permissions for a specific user/school/role combination
-- This uses the v_feature_permissions_readable view we just created

-- Replace these values with your actual IDs:
-- @school_id: The school UUID (e.g., 'bf90df17-daf9-4f07-b4ef-d4be6355145d')
-- @role_id: The role UUID (e.g., '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4' for TEACHER)
-- @feature_key: The feature key (e.g., 'lessons')

-- Example: Check all permissions for the 'lessons' feature
SELECT 
  feature_key,
  feature_name,
  level,
  target_name,
  target_type,
  enabled,
  created_at,
  updated_at
FROM v_feature_permissions_readable
WHERE feature_key = 'lessons'
ORDER BY 
  CASE level
    WHEN 'user' THEN 1
    WHEN 'school' THEN 2
    WHEN 'role' THEN 3
    WHEN 'global' THEN 4
  END,
  target_name;

-- To see which permission would win for a specific school:
-- (This shows school-level and role-level permissions that would apply)
SELECT 
  feature_key,
  feature_name,
  level,
  target_name,
  target_type,
  enabled,
  CASE 
    WHEN level = 'school' AND target_id = 'bf90df17-daf9-4f07-b4ef-d4be6355145d' THEN 'APPLIES (school-level)'
    WHEN level = 'role' AND target_id = '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4' THEN 'APPLIES (role-level)'
    WHEN level = 'global' THEN 'APPLIES (global-level)'
    ELSE 'DOES NOT APPLY'
  END AS applies_to_user
FROM v_feature_permissions_readable
WHERE feature_key = 'lessons'
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

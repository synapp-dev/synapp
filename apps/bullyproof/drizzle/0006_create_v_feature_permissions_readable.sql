-- Migration: Create v_feature_permissions_readable view
-- This view provides a human-readable representation of feature permissions,
-- showing school names, role names, user names, or 'Global' instead of UUIDs

CREATE OR REPLACE VIEW v_feature_permissions_readable AS
SELECT 
  fp.id,
  fp.feature_id,
  f.key AS feature_key,
  f.name AS feature_name,
  f.category AS feature_category,
  f.description AS feature_description,
  fp.level,
  fp.target_id,
  CASE 
    WHEN fp.level = 'global' THEN 'Global'
    WHEN fp.level = 'school' THEN s.name
    WHEN fp.level = 'role' THEN r.name
    WHEN fp.level = 'user' THEN COALESCE(TRIM(BOTH ' ' FROM up.first_name || ' ' || up.last_name), up.email)
  END AS target_name,
  CASE 
    WHEN fp.level = 'global' THEN 'Global'
    WHEN fp.level = 'school' THEN 'School'
    WHEN fp.level = 'role' THEN 'Role'
    WHEN fp.level = 'user' THEN 'User'
  END AS target_type,
  fp.enabled,
  fp.created_at,
  fp.updated_at,
  fp.created_by,
  COALESCE(TRIM(BOTH ' ' FROM creator.first_name || ' ' || creator.last_name), creator.email) AS created_by_name
FROM feature_permissions fp
JOIN features f ON f.id = fp.feature_id
LEFT JOIN schools s ON fp.level = 'school' AND s.id = fp.target_id
LEFT JOIN roles r ON fp.level = 'role' AND r.id = fp.target_id
LEFT JOIN user_profile up ON fp.level = 'user' AND up.id = fp.target_id
LEFT JOIN user_profile creator ON creator.id = fp.created_by;

-- Add comment to the view
COMMENT ON VIEW v_feature_permissions_readable IS 'Human-readable view of feature permissions showing target names (school names, role names, user names/emails, or Global) instead of UUIDs for easier visualization and querying.';

-- Grant access to authenticated users
GRANT SELECT ON v_feature_permissions_readable TO authenticated;

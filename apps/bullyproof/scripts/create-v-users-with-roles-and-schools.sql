-- Create a view that aggregates users with their platform roles and school roles (including school names)
-- This view optimizes the users table query by pre-aggregating role data
-- Each row represents one user with all their roles pre-aggregated

CREATE OR REPLACE VIEW v_users_with_roles_and_schools AS
SELECT 
  up.id,
  up.first_name,
  up.last_name,
  up.email,
  up.avatar_url,
  up.created_at,
  up.updated_at,
  up.metadata,
  -- Platform roles as text array
  COALESCE(
    array_agg(DISTINCT r.key) FILTER (WHERE ur.role_scope = 'platform'::text),
    ARRAY[]::text[]
  ) AS platform_roles,
  -- School roles as JSONB array with school names and role names
  COALESCE(
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'schoolId', ur.school_id,
        'schoolName', s.name,
        'roleKey', r.key,
        'roleName', r.name
      )
    ) FILTER (WHERE ur.role_scope = 'school'::text AND ur.school_id IS NOT NULL),
    '[]'::jsonb
  ) AS school_roles
FROM user_profile up
LEFT JOIN user_roles ur ON ur.user_id = up.id
LEFT JOIN roles r ON r.id = ur.role_id
LEFT JOIN schools s ON s.id = ur.school_id
GROUP BY 
  up.id, 
  up.first_name, 
  up.last_name, 
  up.email, 
  up.avatar_url, 
  up.created_at, 
  up.updated_at, 
  up.metadata;

-- Add comment to the view
COMMENT ON VIEW v_users_with_roles_and_schools IS 'View aggregating users with their platform roles and school roles (including school names). Optimized for users table queries.';

-- Enable RLS on the view (inherits from underlying tables)
ALTER VIEW v_users_with_roles_and_schools SET (security_invoker = true);

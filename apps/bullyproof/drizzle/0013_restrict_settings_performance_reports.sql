-- Restrict Settings, Performance, and Reports to intradark_dev, platform_admin, and school_admin (at their school only).
-- By default these are hidden; role-level and school_role-level permissions grant access.

-- 1. Disable global permissions for these three features (hidden for everyone by default)
UPDATE feature_permissions fp
SET enabled = false, visible = false, updated_at = NOW()
FROM features f
WHERE fp.feature_id = f.id
  AND fp.level = 'global'
  AND f.key IN ('/settings', '/school/performance', '/school/reports');

-- 2. Grant role-level access to INTRADARK_DEV and PLATFORM_ADMIN (all schools)
INSERT INTO feature_permissions (feature_id, level, target_id, enabled, visible, created_at, updated_at)
SELECT f.id, 'role'::feature_permission_level, r.id, true, true, NOW(), NOW()
FROM features f
CROSS JOIN roles r
WHERE f.key IN ('/settings', '/school/performance', '/school/reports')
  AND r.key IN ('INTRADARK_DEV', 'PLATFORM_ADMIN')
  AND NOT EXISTS (
    SELECT 1 FROM feature_permissions fp2
    WHERE fp2.feature_id = f.id
      AND fp2.level = 'role'
      AND fp2.target_id = r.id
      AND fp2.school_id IS NULL
  );

-- Update existing role permissions to enabled/visible if they exist
UPDATE feature_permissions fp
SET enabled = true, visible = true, updated_at = NOW()
FROM features f, roles r
WHERE fp.feature_id = f.id
  AND fp.target_id = r.id
  AND fp.level = 'role'
  AND fp.school_id IS NULL
  AND f.key IN ('/settings', '/school/performance', '/school/reports')
  AND r.key IN ('INTRADARK_DEV', 'PLATFORM_ADMIN');

-- 3. Grant school_role-level access to SCHOOL_ADMIN for each school
INSERT INTO feature_permissions (feature_id, level, target_id, school_id, enabled, visible, created_at, updated_at)
SELECT f.id, 'school_role'::feature_permission_level, r.id, s.id, true, true, NOW(), NOW()
FROM features f
CROSS JOIN roles r
CROSS JOIN schools s
WHERE f.key IN ('/settings', '/school/performance', '/school/reports')
  AND r.key = 'SCHOOL_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM feature_permissions fp2
    WHERE fp2.feature_id = f.id
      AND fp2.level = 'school_role'
      AND fp2.target_id = r.id
      AND fp2.school_id = s.id
  );

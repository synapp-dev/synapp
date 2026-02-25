-- Ensure admin reports/migrations feature keys exist and grant INTRADARK_DEV access.
-- This grants both visibility and access at role level for:
--   - /admin/reports
--   - /admin/migrations

-- 1) Ensure features exist (safe upsert by key)
INSERT INTO features (key, name, description, category, section, created_at, updated_at)
VALUES
  (
    '/admin/reports',
    'Admin: Reports',
    'View platform reporting dashboards',
    'page',
    'admin',
    NOW(),
    NOW()
  ),
  (
    '/admin/migrations',
    'Admin: Migrations',
    'Run one-off database migrations',
    'page',
    'admin',
    NOW(),
    NOW()
  )
ON CONFLICT (key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  section = EXCLUDED.section,
  updated_at = NOW();

-- 2) Update existing INTRADARK_DEV role permissions to enabled + visible
UPDATE feature_permissions fp
SET enabled = true, visible = true, updated_at = NOW()
FROM features f, roles r
WHERE fp.feature_id = f.id
  AND fp.target_id = r.id
  AND fp.level = 'role'
  AND fp.school_id IS NULL
  AND f.key IN ('/admin/reports', '/admin/migrations')
  AND r.key = 'INTRADARK_DEV';

-- 3) Insert missing INTRADARK_DEV role permissions
INSERT INTO feature_permissions (feature_id, level, target_id, enabled, visible, created_at, updated_at)
SELECT f.id, 'role'::feature_permission_level, r.id, true, true, NOW(), NOW()
FROM features f
CROSS JOIN roles r
WHERE f.key IN ('/admin/reports', '/admin/migrations')
  AND r.key = 'INTRADARK_DEV'
  AND NOT EXISTS (
    SELECT 1
    FROM feature_permissions fp2
    WHERE fp2.feature_id = f.id
      AND fp2.level = 'role'
      AND fp2.target_id = r.id
      AND fp2.school_id IS NULL
  );

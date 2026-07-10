-- Register the Content Type management feature (module M1) and grant it to
-- INTRADARK_DEV only, so the whole feature ships dark: disabled-by-default for
-- every other role (school admins keep /admin/content unchanged and never see
-- the Content Type surfaces). Reveal later by granting this key to more roles.

-- 1) Ensure the feature exists (safe upsert by key)
INSERT INTO features (key, name, description, category, section, created_at, updated_at)
VALUES
  (
    '/admin/content-types',
    'Admin: Content Types',
    'Create and manage configurable content types (curricula)',
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

-- 2) Enable + make visible for any pre-existing INTRADARK_DEV role permission
UPDATE feature_permissions fp
SET enabled = true, visible = true, updated_at = NOW()
FROM features f, roles r
WHERE fp.feature_id = f.id
  AND fp.target_id = r.id
  AND fp.level = 'role'
  AND fp.school_id IS NULL
  AND f.key = '/admin/content-types'
  AND r.key = 'INTRADARK_DEV';

-- 3) Insert the INTRADARK_DEV role grant if it is missing
INSERT INTO feature_permissions (feature_id, level, target_id, enabled, visible, created_at, updated_at)
SELECT f.id, 'role'::feature_permission_level, r.id, true, true, NOW(), NOW()
FROM features f
CROSS JOIN roles r
WHERE f.key = '/admin/content-types'
  AND r.key = 'INTRADARK_DEV'
  AND NOT EXISTS (
    SELECT 1
    FROM feature_permissions fp2
    WHERE fp2.feature_id = f.id
      AND fp2.level = 'role'
      AND fp2.target_id = r.id
      AND fp2.school_id IS NULL
  );

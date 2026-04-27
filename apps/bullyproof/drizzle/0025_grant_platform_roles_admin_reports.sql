-- Grant /admin/reports to platform roles (PLATFORM_ADMIN, PLATFORM_STAFF).
-- Migration 0024 only ensured INTRADARK_DEV; production admins need explicit role rows.

INSERT INTO feature_permissions (feature_id, level, target_id, enabled, visible, created_at, updated_at)
SELECT f.id, 'role'::feature_permission_level, r.id, true, true, NOW(), NOW()
FROM features f
CROSS JOIN roles r
WHERE f.key = '/admin/reports'
  AND r.key IN ('PLATFORM_ADMIN', 'PLATFORM_STAFF')
  AND NOT EXISTS (
    SELECT 1
    FROM feature_permissions fp2
    WHERE fp2.feature_id = f.id
      AND fp2.level = 'role'
      AND fp2.target_id = r.id
      AND fp2.school_id IS NULL
  );

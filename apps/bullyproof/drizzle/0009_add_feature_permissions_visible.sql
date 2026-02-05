-- Add visible column to feature_permissions.
-- null = "follow enabled" (resolved visible = enabled). true = show in UI; false = hide.
ALTER TABLE feature_permissions
ADD COLUMN visible boolean;

COMMENT ON COLUMN feature_permissions.visible IS 'When true, show in nav/sidebar; when false, hide. When null, follow enabled (backward compatible).';

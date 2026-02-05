-- Seed features and feature permissions
-- This script creates initial features and sets up default permissions
-- Run this after applying the migration 0005_create_feature_access_control.sql

-- ============================================================================
-- 1. Insert Features
-- ============================================================================

-- Navigation features
INSERT INTO features (key, name, description, category) VALUES
  ('lessons', 'Lessons Page', 'Access to the lessons page', 'navigation'),
  ('content', 'Content Page', 'Access to the content page', 'navigation'),
  ('resources', 'Resources Page', 'Access to the resources page', 'navigation'),
  ('dashboard', 'Dashboard', 'Access to the dashboard', 'navigation'),
  ('admin', 'Admin Panel', 'Access to the admin panel', 'navigation'),
  ('ap_certification', 'AP Certification', 'Access to AP Certification', 'navigation'),
  ('welcome', 'Welcome Page', 'Access to the welcome page', 'navigation'),
  ('support', 'Support Page', 'Access to the support page', 'navigation'),
  ('teachers', 'Teachers Page', 'Access to the teachers page', 'navigation'),
  ('classes', 'Classes Page', 'Access to the classes page', 'navigation'),
  ('performance', 'Performance Page', 'Access to the performance page', 'navigation'),
  ('settings', 'Settings Page', 'Access to the settings page', 'navigation'),
  ('reports', 'Reports Page', 'Access to the reports page', 'navigation'),
  ('home', 'Home Page', 'Access to the home page', 'navigation')
ON CONFLICT (key) DO NOTHING;

-- Role-based access features
INSERT INTO features (key, name, description, category) VALUES
  ('admin_access', 'Admin Access', 'General admin functionality access', 'role'),
  ('teacher_access', 'Teacher Access', 'General teacher functionality access', 'role'),
  ('school_admin_access', 'School Admin Access', 'School admin functionality access', 'role')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 2. Set up Global Permissions (only non-admin navigation features enabled)
-- ============================================================================
-- Enable general navigation features globally by default for backward compatibility
-- Admin features are NOT enabled globally - they require role-based permissions

INSERT INTO feature_permissions (feature_id, level, target_id, enabled)
SELECT 
  f.id,
  'global'::feature_permission_level,
  NULL,
  true
FROM features f
WHERE f.category = 'navigation'
  AND f.key NOT IN ('admin', 'admin_access')  -- Exclude admin features from global enable
ON CONFLICT (feature_id, level, target_id) DO NOTHING;

-- ============================================================================
-- 3. Set up Role-based Permissions
-- ============================================================================

-- Platform Admin gets admin_access and admin feature
INSERT INTO feature_permissions (feature_id, level, target_id, enabled)
SELECT 
  f.id,
  'role'::feature_permission_level,
  r.id,
  true
FROM features f
CROSS JOIN roles r
WHERE f.key IN ('admin_access', 'admin')
  AND r.key = 'PLATFORM_ADMIN'
ON CONFLICT (feature_id, level, target_id) DO NOTHING;

-- Teacher gets teacher_access and lessons feature
INSERT INTO feature_permissions (feature_id, level, target_id, enabled)
SELECT 
  f.id,
  'role'::feature_permission_level,
  r.id,
  true
FROM features f
CROSS JOIN roles r
WHERE f.key IN ('teacher_access', 'lessons')
  AND r.key = 'TEACHER'
ON CONFLICT (feature_id, level, target_id) DO NOTHING;

-- School Admin gets school_admin_access
INSERT INTO feature_permissions (feature_id, level, target_id, enabled)
SELECT 
  f.id,
  'role'::feature_permission_level,
  r.id,
  true
FROM features f
CROSS JOIN roles r
WHERE f.key = 'school_admin_access'
  AND r.key = 'SCHOOL_ADMIN'
ON CONFLICT (feature_id, level, target_id) DO NOTHING;

-- ============================================================================
-- Summary
-- ============================================================================
-- This seed script:
-- 1. Creates 17 features (14 navigation + 3 role-based)
-- 2. Enables non-admin navigation features globally by default (for backward compatibility)
--    - Admin features (admin, admin_access) are NOT enabled globally
--    - Only PLATFORM_ADMIN role gets admin features via role-based permissions
-- 3. Sets up role-based permissions:
--    - PLATFORM_ADMIN: admin_access, admin (role-level only, not global)
--    - TEACHER: teacher_access, lessons
--    - SCHOOL_ADMIN: school_admin_access
--
-- Security Notes:
-- - Admin features are DENIED by default (only PLATFORM_ADMIN can access)
-- - School access is controlled by the school service layer (users only see schools
--   they're assigned roles to via user_roles table)
-- - Feature permissions work hierarchically: User > School > Role > Global
-- - You can override permissions at role, school, or user levels as needed

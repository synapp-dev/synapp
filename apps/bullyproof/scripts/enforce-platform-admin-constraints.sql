-- Migration: Enforce PLATFORM_ADMIN role constraints
-- 
-- This script enforces the following constraints on the user_roles table:
-- 
-- 1. If a user has PLATFORM_ADMIN role, they cannot have any other roles
--    - Users with PLATFORM_ADMIN role cannot have platform roles or school roles
--    - Enforced via trigger: prevent_other_roles_for_platform_admin_users()
-- 
-- 2. If a user has other roles, they cannot be assigned PLATFORM_ADMIN
--    - Users with any existing roles cannot be assigned PLATFORM_ADMIN
--    - Enforced via trigger: prevent_other_roles_for_platform_admin_users()
-- 
-- The script:
-- - Cleans up any existing violations (users with PLATFORM_ADMIN + other roles)
-- - Creates helper functions to check role types
-- - Creates triggers to enforce constraints going forward
-- 
-- Run this script in a transaction to ensure atomicity.

BEGIN;

-- Step 1: Clean up any existing violations
-- Remove any other roles from users who have PLATFORM_ADMIN role
-- Keep only the PLATFORM_ADMIN role for those users
WITH platform_admin_users AS (
  SELECT DISTINCT ur.user_id
  FROM user_roles ur
  INNER JOIN roles r ON r.id = ur.role_id
  WHERE r.key = 'PLATFORM_ADMIN'
    AND ur.school_id IS NULL  -- PLATFORM_ADMIN is a platform role
)
DELETE FROM user_roles ur
WHERE ur.user_id IN (SELECT user_id FROM platform_admin_users)
  AND ur.id NOT IN (
    SELECT ur2.id
    FROM user_roles ur2
    INNER JOIN roles r2 ON r2.id = ur2.role_id
    WHERE r2.key = 'PLATFORM_ADMIN'
      AND ur2.school_id IS NULL
      AND ur2.user_id = ur.user_id
  );

-- Step 2: Create a function to check if a role is PLATFORM_ADMIN
CREATE OR REPLACE FUNCTION is_platform_admin_role(role_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM roles WHERE id = role_id_param AND key = 'PLATFORM_ADMIN'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Create a function to check if user has PLATFORM_ADMIN role
CREATE OR REPLACE FUNCTION user_has_platform_admin(user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = user_id_param
      AND r.key = 'PLATFORM_ADMIN'
      AND ur.school_id IS NULL  -- PLATFORM_ADMIN is a platform role
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 4: Create a trigger function to prevent users with PLATFORM_ADMIN from having other roles
CREATE OR REPLACE FUNCTION prevent_other_roles_for_platform_admin_users()
RETURNS TRIGGER AS $$
DECLARE
  is_platform_admin_role boolean;
  has_platform_admin_role boolean;
  old_id uuid;
BEGIN
  -- Get the old id if this is an UPDATE
  IF TG_OP = 'UPDATE' THEN
    old_id := OLD.id;
  ELSE
    old_id := NULL;
  END IF;

  -- Check if the role being inserted/updated is PLATFORM_ADMIN
  SELECT EXISTS (
    SELECT 1 FROM roles WHERE id = NEW.role_id AND key = 'PLATFORM_ADMIN'
  ) INTO is_platform_admin_role;

  -- Check if user already has PLATFORM_ADMIN role (excluding the current row if updating)
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = NEW.user_id
      AND r.key = 'PLATFORM_ADMIN'
      AND ur.school_id IS NULL  -- PLATFORM_ADMIN is a platform role
      AND (old_id IS NULL OR ur.id != old_id)
  ) INTO has_platform_admin_role;

  -- If inserting/updating a PLATFORM_ADMIN role
  IF is_platform_admin_role THEN
    -- Ensure PLATFORM_ADMIN is a platform role (school_id must be NULL)
    IF NEW.school_id IS NOT NULL THEN
      RAISE EXCEPTION 'PLATFORM_ADMIN role must be a platform role (school_id must be NULL)';
    END IF;
    
    -- Check if user has any other roles (excluding the current row)
    IF EXISTS (
      SELECT 1 
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = NEW.user_id
        AND (old_id IS NULL OR ur.id != old_id)
        AND r.key != 'PLATFORM_ADMIN'
    ) THEN
      RAISE EXCEPTION 'User with PLATFORM_ADMIN role cannot have any other roles. Please remove all other roles first.';
    END IF;
  -- If inserting/updating a non-PLATFORM_ADMIN role
  ELSE
    -- Check if user already has PLATFORM_ADMIN role
    IF has_platform_admin_role THEN
      RAISE EXCEPTION 'User with PLATFORM_ADMIN role cannot have any other roles. Please remove PLATFORM_ADMIN role first.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to enforce the constraints
DROP TRIGGER IF EXISTS check_platform_admin_user_roles ON user_roles;
CREATE TRIGGER check_platform_admin_user_roles
  BEFORE INSERT OR UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_other_roles_for_platform_admin_users();

-- Step 6: Add comments explaining the constraints
COMMENT ON FUNCTION prevent_other_roles_for_platform_admin_users() IS 
  'Prevents users with PLATFORM_ADMIN role from having any other roles, and prevents assigning other roles to users who already have PLATFORM_ADMIN';

COMMENT ON FUNCTION is_platform_admin_role(uuid) IS 
  'Checks if a role is PLATFORM_ADMIN';

COMMENT ON FUNCTION user_has_platform_admin(uuid) IS 
  'Checks if a user has PLATFORM_ADMIN role';

COMMIT;

-- Migration: Enforce SCHOOL_LICENCE role constraints
-- 
-- This script enforces the following constraints on the user_roles table:
-- 
-- 1. Only one SCHOOL_LICENCE role per school
--    - Ensures that each school can have only one user with SCHOOL_LICENCE role
--    - Enforced via trigger: ensure_one_licence_per_school()
-- 
-- 2. Only one email/user tied to that SCHOOL_LICENCE per school
--    - Already enforced by existing unique constraint on (user_id, role_id, school_id)
-- 
-- 3. If an email is tied to a SCHOOL_LICENCE role, it cannot have any other roles
--    - Users with SCHOOL_LICENCE role cannot have platform roles or other school roles
--    - Enforced via trigger: prevent_other_roles_for_licence_users()
-- 
-- The script:
-- - Cleans up any existing violations (duplicate licences, users with licence + other roles)
-- - Creates helper functions to check role types
-- - Creates triggers to enforce constraints going forward
-- 
-- Run this script in a transaction to ensure atomicity.

BEGIN;

-- Step 1: Clean up any existing violations
-- Remove duplicate SCHOOL_LICENCE roles per school (keep the oldest one)
WITH duplicate_licences AS (
  SELECT 
    ur.id,
    ur.school_id,
    ur.user_id,
    ur.assigned_at,
    ROW_NUMBER() OVER (
      PARTITION BY ur.school_id 
      ORDER BY ur.assigned_at ASC
    ) as rn
  FROM user_roles ur
  INNER JOIN roles r ON r.id = ur.role_id
  WHERE r.key = 'SCHOOL_LICENCE'
    AND ur.school_id IS NOT NULL
)
DELETE FROM user_roles
WHERE id IN (
  SELECT id FROM duplicate_licences WHERE rn > 1
);

-- Step 2: Remove any other roles from users who have SCHOOL_LICENCE role
-- Keep only the SCHOOL_LICENCE role for those users
WITH licence_users AS (
  SELECT DISTINCT ur.user_id
  FROM user_roles ur
  INNER JOIN roles r ON r.id = ur.role_id
  WHERE r.key = 'SCHOOL_LICENCE'
    AND ur.school_id IS NOT NULL
)
DELETE FROM user_roles ur
WHERE ur.user_id IN (SELECT user_id FROM licence_users)
  AND ur.id NOT IN (
    SELECT ur2.id
    FROM user_roles ur2
    INNER JOIN roles r2 ON r2.id = ur2.role_id
    WHERE r2.key = 'SCHOOL_LICENCE'
      AND ur2.school_id IS NOT NULL
      AND ur2.user_id = ur.user_id
  );

-- Step 3: Create a function to check if a role is SCHOOL_LICENCE
CREATE OR REPLACE FUNCTION is_school_licence_role(role_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM roles WHERE id = role_id_param AND key = 'SCHOOL_LICENCE'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 4: Create a trigger function to ensure only one SCHOOL_LICENCE per school
CREATE OR REPLACE FUNCTION ensure_one_licence_per_school()
RETURNS TRIGGER AS $$
DECLARE
  is_licence_role boolean;
  old_id uuid;
BEGIN
  -- Get the old id if this is an UPDATE
  IF TG_OP = 'UPDATE' THEN
    old_id := OLD.id;
  ELSE
    old_id := NULL;
  END IF;

  -- Check if the role being inserted/updated is SCHOOL_LICENCE
  SELECT is_school_licence_role(NEW.role_id) INTO is_licence_role;

  -- Only check if this is a SCHOOL_LICENCE role
  IF is_licence_role AND NEW.school_id IS NOT NULL THEN
    -- Check if there's already a SCHOOL_LICENCE role for this school (excluding current row)
    IF EXISTS (
      SELECT 1 
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE ur.school_id = NEW.school_id
        AND r.key = 'SCHOOL_LICENCE'
        AND (old_id IS NULL OR ur.id != old_id)
    ) THEN
      RAISE EXCEPTION 'Only one SCHOOL_LICENCE role is allowed per school. School % already has a SCHOOL_LICENCE role.', NEW.school_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a function to check if user has SCHOOL_LICENCE role
CREATE OR REPLACE FUNCTION user_has_school_licence(user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = user_id_param
      AND r.key = 'SCHOOL_LICENCE'
      AND ur.school_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 6: Create a trigger function to prevent users with SCHOOL_LICENCE from having other roles
CREATE OR REPLACE FUNCTION prevent_other_roles_for_licence_users()
RETURNS TRIGGER AS $$
DECLARE
  is_licence_role boolean;
  has_licence_role boolean;
  old_id uuid;
BEGIN
  -- Get the old id if this is an UPDATE
  IF TG_OP = 'UPDATE' THEN
    old_id := OLD.id;
  ELSE
    old_id := NULL;
  END IF;

  -- Check if the role being inserted/updated is SCHOOL_LICENCE
  SELECT EXISTS (
    SELECT 1 FROM roles WHERE id = NEW.role_id AND key = 'SCHOOL_LICENCE'
  ) INTO is_licence_role;

  -- Check if user already has SCHOOL_LICENCE role (excluding the current row if updating)
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = NEW.user_id
      AND r.key = 'SCHOOL_LICENCE'
      AND ur.school_id IS NOT NULL
      AND (old_id IS NULL OR ur.id != old_id)
  ) INTO has_licence_role;

  -- If inserting/updating a SCHOOL_LICENCE role
  IF is_licence_role THEN
    -- Check if user has any other roles (excluding the current row)
    IF EXISTS (
      SELECT 1 
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = NEW.user_id
        AND (old_id IS NULL OR ur.id != old_id)
        AND r.key != 'SCHOOL_LICENCE'
    ) THEN
      RAISE EXCEPTION 'User with SCHOOL_LICENCE role cannot have any other roles. Please remove all other roles first.';
    END IF;
  -- If inserting/updating a non-SCHOOL_LICENCE role
  ELSE
    -- Check if user already has SCHOOL_LICENCE role
    IF has_licence_role THEN
      RAISE EXCEPTION 'User with SCHOOL_LICENCE role cannot have any other roles. Please remove SCHOOL_LICENCE role first.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create triggers to enforce the constraints
DROP TRIGGER IF EXISTS check_licence_user_roles ON user_roles;
CREATE TRIGGER check_licence_user_roles
  BEFORE INSERT OR UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_other_roles_for_licence_users();

DROP TRIGGER IF EXISTS check_one_licence_per_school ON user_roles;
CREATE TRIGGER check_one_licence_per_school
  BEFORE INSERT OR UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_one_licence_per_school();

-- Step 8: Add comments explaining the constraints
COMMENT ON FUNCTION prevent_other_roles_for_licence_users() IS 
  'Prevents users with SCHOOL_LICENCE role from having any other roles, and prevents assigning other roles to users who already have SCHOOL_LICENCE';

COMMENT ON FUNCTION ensure_one_licence_per_school() IS 
  'Ensures only one SCHOOL_LICENCE role per school';

COMMIT;

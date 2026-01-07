-- Migration: Enforce Platform Role Constraints
-- 
-- This script enforces the following constraints on the user_roles table:
-- 
-- 1. Platform roles (PLATFORM_ADMIN, GOVERNMENT_VIEWER, PLATFORM_STAFF) are exclusive
--    - Users with any platform role can only have ONE role total (that platform role)
--    - Users with platform roles cannot have school roles
--    - Enforced via trigger: prevent_other_roles_for_platform_users()
-- 
-- 2. School roles and platform roles are mutually exclusive
--    - Users with school roles cannot have platform roles
--    - Users with platform roles cannot have school roles
--    - Enforced via trigger: prevent_other_roles_for_platform_users()
-- 
-- 3. School roles can coexist across different schools
--    - Users can have multiple school roles (TEACHER, SCHOOL_ADMIN, SCHOOL_STAFF)
--    - But only one role per school (enforced by unique constraint)
--    - Users with school roles cannot have platform roles
-- 
-- 4. SCHOOL_LICENCE is exclusive with other school roles
--    - Users with SCHOOL_LICENCE cannot have other school roles (TEACHER, SCHOOL_ADMIN, SCHOOL_STAFF)
--    - Users with other school roles cannot have SCHOOL_LICENCE
--    - Enforced via trigger: prevent_platform_school_role_mixing()
-- 
-- The script:
-- - Cleans up any existing violations (users with platform + school roles)
-- - Creates helper functions to check role types
-- - Creates triggers to enforce constraints going forward
-- 
-- Run this script in a transaction to ensure atomicity.

BEGIN;

-- Step 1: Clean up any existing violations
-- Remove school roles from users who have platform roles
WITH platform_role_users AS (
  SELECT DISTINCT ur.user_id
  FROM user_roles ur
  INNER JOIN roles r ON r.id = ur.role_id
  WHERE r.key IN ('PLATFORM_ADMIN', 'GOVERNMENT_VIEWER', 'PLATFORM_STAFF')
    AND ur.school_id IS NULL  -- Platform roles have NULL school_id
)
DELETE FROM user_roles ur
WHERE ur.user_id IN (SELECT user_id FROM platform_role_users)
  AND ur.id NOT IN (
    SELECT ur2.id
    FROM user_roles ur2
    INNER JOIN roles r2 ON r2.id = ur2.role_id
    WHERE r2.key IN ('PLATFORM_ADMIN', 'GOVERNMENT_VIEWER', 'PLATFORM_STAFF')
      AND ur2.school_id IS NULL
      AND ur2.user_id = ur.user_id
  );

-- Remove platform roles from users who have school roles
WITH school_role_users AS (
  SELECT DISTINCT ur.user_id
  FROM user_roles ur
  INNER JOIN roles r ON r.id = ur.role_id
  WHERE ur.school_id IS NOT NULL  -- School roles have a school_id
)
DELETE FROM user_roles ur
WHERE ur.user_id IN (SELECT user_id FROM school_role_users)
  AND ur.id IN (
    SELECT ur2.id
    FROM user_roles ur2
    INNER JOIN roles r2 ON r2.id = ur2.role_id
    WHERE r2.key IN ('PLATFORM_ADMIN', 'GOVERNMENT_VIEWER', 'PLATFORM_STAFF')
      AND ur2.school_id IS NULL
      AND ur2.user_id = ur.user_id
  );

-- Step 2: Remove duplicate platform roles (users should only have one platform role)
WITH duplicate_platform_roles AS (
  SELECT 
    ur.id,
    ur.user_id,
    ur.assigned_at,
    ROW_NUMBER() OVER (
      PARTITION BY ur.user_id 
      ORDER BY ur.assigned_at ASC
    ) as rn
  FROM user_roles ur
  INNER JOIN roles r ON r.id = ur.role_id
  WHERE r.key IN ('PLATFORM_ADMIN', 'GOVERNMENT_VIEWER', 'PLATFORM_STAFF')
    AND ur.school_id IS NULL
)
DELETE FROM user_roles
WHERE id IN (
  SELECT id FROM duplicate_platform_roles WHERE rn > 1
);

-- Step 3: Create a function to check if a role is a platform role
CREATE OR REPLACE FUNCTION is_platform_role(role_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM roles 
    WHERE id = role_id_param 
      AND key IN ('PLATFORM_ADMIN', 'GOVERNMENT_VIEWER', 'PLATFORM_STAFF')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 4: Create a function to check if a role is a school role
CREATE OR REPLACE FUNCTION is_school_role(role_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM roles 
    WHERE id = role_id_param 
      AND key IN ('TEACHER', 'SCHOOL_ADMIN', 'SCHOOL_STAFF', 'SCHOOL_LICENCE')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 5: Create a function to check if user has any platform role
CREATE OR REPLACE FUNCTION user_has_platform_role(user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = user_id_param
      AND r.key IN ('PLATFORM_ADMIN', 'GOVERNMENT_VIEWER', 'PLATFORM_STAFF')
      AND ur.school_id IS NULL
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 6: Create a function to check if user has any school role
CREATE OR REPLACE FUNCTION user_has_school_role(user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    WHERE ur.user_id = user_id_param
      AND ur.school_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 6a: Create a function to check if a role is SCHOOL_LICENCE
CREATE OR REPLACE FUNCTION is_school_licence_role(role_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM roles 
    WHERE id = role_id_param 
      AND key = 'SCHOOL_LICENCE'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 6b: Create a function to check if user has SCHOOL_LICENCE role
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

-- Step 6c: Create a function to check if user has any non-SCHOOL_LICENCE school roles
CREATE OR REPLACE FUNCTION user_has_non_licence_school_role(user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = user_id_param
      AND ur.school_id IS NOT NULL
      AND r.key != 'SCHOOL_LICENCE'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 7: Create a trigger function to enforce platform/school role exclusivity
CREATE OR REPLACE FUNCTION prevent_platform_school_role_mixing()
RETURNS TRIGGER AS $$
DECLARE
  is_platform_role_val boolean;
  is_school_role_val boolean;
  has_platform_role boolean;
  has_school_role boolean;
  old_id uuid;
  existing_platform_role_count integer;
BEGIN
  -- Get the old id if this is an UPDATE
  IF TG_OP = 'UPDATE' THEN
    old_id := OLD.id;
  ELSE
    old_id := NULL;
  END IF;

  -- Check if the role being inserted/updated is a platform role
  SELECT is_platform_role(NEW.role_id) INTO is_platform_role_val;
  
  -- Check if the role being inserted/updated is a school role
  SELECT is_school_role(NEW.role_id) INTO is_school_role_val;

  -- Check if user already has platform roles (excluding the current row if updating)
  SELECT user_has_platform_role(NEW.user_id) INTO has_platform_role;
  IF old_id IS NOT NULL AND is_platform_role_val THEN
    -- If updating a platform role, check if user has other platform roles
    SELECT COUNT(*) INTO existing_platform_role_count
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = NEW.user_id
      AND r.key IN ('PLATFORM_ADMIN', 'GOVERNMENT_VIEWER', 'PLATFORM_STAFF')
      AND ur.school_id IS NULL
      AND ur.id != old_id;
    has_platform_role := existing_platform_role_count > 0;
  END IF;

  -- Check if user already has school roles (excluding the current row if updating)
  SELECT user_has_school_role(NEW.user_id) INTO has_school_role;
  IF old_id IS NOT NULL AND is_school_role_val THEN
    -- If updating a school role, check if user has other school roles
    SELECT EXISTS (
      SELECT 1 
      FROM user_roles ur
      WHERE ur.user_id = NEW.user_id
        AND ur.school_id IS NOT NULL
        AND ur.id != old_id
    ) INTO has_school_role;
  END IF;

  -- If inserting/updating a platform role
  IF is_platform_role_val THEN
    -- Ensure platform role has NULL school_id
    IF NEW.school_id IS NOT NULL THEN
      RAISE EXCEPTION 'Platform roles must have school_id set to NULL';
    END IF;
    
    -- Check if user has any other roles (excluding the current row)
    IF EXISTS (
      SELECT 1 
      FROM user_roles ur
      WHERE ur.user_id = NEW.user_id
        AND (old_id IS NULL OR ur.id != old_id)
    ) THEN
      RAISE EXCEPTION 'Users with platform roles can only have one role. Please remove all other roles first.';
    END IF;
  END IF;

  -- If inserting/updating a school role
  IF is_school_role_val THEN
    -- Ensure school role has a school_id
    IF NEW.school_id IS NULL THEN
      RAISE EXCEPTION 'School roles must have a school_id';
    END IF;
    
    -- Check if user has any platform roles
    IF has_platform_role THEN
      RAISE EXCEPTION 'Users with platform roles cannot have school roles. Please remove platform roles first.';
    END IF;
    
    -- Check if assigning SCHOOL_LICENCE and user has other school roles
    IF is_school_licence_role(NEW.role_id) THEN
      IF EXISTS (
        SELECT 1 
        FROM user_roles ur
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = NEW.user_id
          AND ur.school_id IS NOT NULL
          AND r.key != 'SCHOOL_LICENCE'
          AND (old_id IS NULL OR ur.id != old_id)
      ) THEN
        RAISE EXCEPTION 'Users with school roles cannot have SCHOOL_LICENCE. Please remove all other school roles first.';
      END IF;
    END IF;
    
    -- Check if assigning non-SCHOOL_LICENCE school role and user has SCHOOL_LICENCE
    IF NOT is_school_licence_role(NEW.role_id) THEN
      IF EXISTS (
        SELECT 1 
        FROM user_roles ur
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = NEW.user_id
          AND r.key = 'SCHOOL_LICENCE'
          AND ur.school_id IS NOT NULL
          AND (old_id IS NULL OR ur.id != old_id)
      ) THEN
        RAISE EXCEPTION 'Users with SCHOOL_LICENCE cannot have other school roles. Please remove SCHOOL_LICENCE first.';
      END IF;
    END IF;
  END IF;

  -- If user has platform roles, prevent assigning school roles
  IF has_platform_role AND is_school_role_val THEN
    RAISE EXCEPTION 'Users with platform roles cannot have school roles. Please remove platform roles first.';
  END IF;

  -- If user has school roles, prevent assigning platform roles
  IF has_school_role AND is_platform_role_val THEN
    RAISE EXCEPTION 'Users with school roles cannot have platform roles. Please remove school roles first.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to enforce the constraints
DROP TRIGGER IF EXISTS check_platform_school_role_mixing ON user_roles;
CREATE TRIGGER check_platform_school_role_mixing
  BEFORE INSERT OR UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_platform_school_role_mixing();

-- Step 9: Add comments explaining the constraints
COMMENT ON FUNCTION prevent_platform_school_role_mixing() IS 
  'Enforces that platform roles (PLATFORM_ADMIN, GOVERNMENT_VIEWER, PLATFORM_STAFF) are exclusive - users can only have one role total if they have a platform role. Also enforces that platform roles and school roles cannot coexist. Additionally enforces that SCHOOL_LICENCE cannot coexist with other school roles (TEACHER, SCHOOL_ADMIN, SCHOOL_STAFF).';

COMMENT ON FUNCTION is_platform_role(uuid) IS 
  'Checks if a role is a platform role (PLATFORM_ADMIN, GOVERNMENT_VIEWER, PLATFORM_STAFF)';

COMMENT ON FUNCTION is_school_role(uuid) IS 
  'Checks if a role is a school role (TEACHER, SCHOOL_ADMIN, SCHOOL_STAFF, SCHOOL_LICENCE)';

COMMENT ON FUNCTION user_has_platform_role(uuid) IS 
  'Checks if a user has any platform role';

COMMENT ON FUNCTION user_has_school_role(uuid) IS 
  'Checks if a user has any school role';

COMMIT;

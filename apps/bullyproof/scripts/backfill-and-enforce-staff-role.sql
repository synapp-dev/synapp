-- Migration: Backfill and enforce SCHOOL_STAFF role assignment
-- 
-- This script:
-- 1. Backfills SCHOOL_STAFF role for all users who have TEACHER or SCHOOL_ADMIN roles
-- 2. Creates a trigger to automatically assign SCHOOL_STAFF when TEACHER or SCHOOL_ADMIN is assigned
-- 3. Ensures SCHOOL_LICENCE users are excluded (they can only have that role)
--
-- Rules:
-- - When a user gets TEACHER or SCHOOL_ADMIN role at a school, they automatically get SCHOOL_STAFF role
-- - SCHOOL_STAFF is the minimum role - users can have TEACHER and/or SCHOOL_ADMIN in addition
-- - SCHOOL_LICENCE users cannot have any other roles (already enforced by existing constraints)
--
-- Run this script in a transaction to ensure atomicity.

BEGIN;

-- Step 1: Backfill SCHOOL_STAFF role for existing users
-- Find all users with TEACHER or SCHOOL_ADMIN roles who don't have SCHOOL_STAFF for that school
-- Exclude users with SCHOOL_LICENCE role (they can't have other roles)

INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT DISTINCT
    ur.user_id,
    staff_role.id AS role_id,
    ur.school_id,
    'school' AS role_scope,
    NOW() AS assigned_at
FROM user_roles ur
INNER JOIN roles teacher_or_admin_role ON teacher_or_admin_role.id = ur.role_id
INNER JOIN roles staff_role ON staff_role.key = 'SCHOOL_STAFF'
-- Only for TEACHER or SCHOOL_ADMIN roles
WHERE teacher_or_admin_role.key IN ('TEACHER', 'SCHOOL_ADMIN')
    AND ur.school_id IS NOT NULL
    AND ur.role_scope = 'school'
    -- Exclude users who already have SCHOOL_STAFF for this school
    AND NOT EXISTS (
        SELECT 1
        FROM user_roles ur2
        INNER JOIN roles r2 ON r2.id = ur2.role_id
        WHERE ur2.user_id = ur.user_id
            AND ur2.school_id = ur.school_id
            AND r2.key = 'SCHOOL_STAFF'
    )
    -- Exclude users who have SCHOOL_LICENCE role (they can't have other roles)
    AND NOT EXISTS (
        SELECT 1
        FROM user_roles ur3
        INNER JOIN roles r3 ON r3.id = ur3.role_id
        WHERE ur3.user_id = ur.user_id
            AND r3.key = 'SCHOOL_LICENCE'
            AND ur3.school_id IS NOT NULL
    )
-- Use ON CONFLICT to handle race conditions (unique constraint on user_id, role_id, school_id)
ON CONFLICT (user_id, role_id, school_id) DO NOTHING;

-- Report how many roles were added
DO $$
DECLARE
    roles_added INTEGER;
BEGIN
    GET DIAGNOSTICS roles_added = ROW_COUNT;
    RAISE NOTICE 'Backfilled % SCHOOL_STAFF role(s)', roles_added;
END $$;

-- Step 2: Create helper function to check if a role is TEACHER or SCHOOL_ADMIN
CREATE OR REPLACE FUNCTION is_teacher_or_admin_role(role_id_param uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM roles 
        WHERE id = role_id_param 
            AND key IN ('TEACHER', 'SCHOOL_ADMIN')
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Create helper function to get SCHOOL_STAFF role ID
CREATE OR REPLACE FUNCTION get_staff_role_id()
RETURNS uuid AS $$
DECLARE
    staff_role_id uuid;
BEGIN
    SELECT id INTO staff_role_id
    FROM roles
    WHERE key = 'SCHOOL_STAFF'
    LIMIT 1;
    
    IF staff_role_id IS NULL THEN
        RAISE EXCEPTION 'SCHOOL_STAFF role not found in roles table';
    END IF;
    
    RETURN staff_role_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 4: Create trigger function to automatically assign SCHOOL_STAFF role
CREATE OR REPLACE FUNCTION auto_assign_staff_role()
RETURNS TRIGGER AS $$
DECLARE
    is_teacher_or_admin boolean;
    is_licence_role boolean;
    staff_role_id uuid;
    old_id uuid;
BEGIN
    -- Get the old id if this is an UPDATE
    IF TG_OP = 'UPDATE' THEN
        old_id := OLD.id;
    ELSE
        old_id := NULL;
    END IF;

    -- Only process school roles (school_id IS NOT NULL)
    IF NEW.school_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Check if the role being inserted/updated is TEACHER or SCHOOL_ADMIN
    SELECT is_teacher_or_admin_role(NEW.role_id) INTO is_teacher_or_admin;

    -- Check if the role is SCHOOL_LICENCE (these users can't have other roles)
    SELECT EXISTS (
        SELECT 1 FROM roles WHERE id = NEW.role_id AND key = 'SCHOOL_LICENCE'
    ) INTO is_licence_role;

    -- If inserting/updating TEACHER or SCHOOL_ADMIN role
    IF is_teacher_or_admin AND NOT is_licence_role THEN
        -- Get SCHOOL_STAFF role ID
        SELECT get_staff_role_id() INTO staff_role_id;

        -- Check if user already has SCHOOL_STAFF for this school
        IF NOT EXISTS (
            SELECT 1
            FROM user_roles ur
            INNER JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = NEW.user_id
                AND ur.school_id = NEW.school_id
                AND r.key = 'SCHOOL_STAFF'
        ) THEN
            -- Insert SCHOOL_STAFF role
            INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
            VALUES (NEW.user_id, staff_role_id, NEW.school_id, 'school', NOW())
            ON CONFLICT (user_id, role_id, school_id) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to automatically assign SCHOOL_STAFF
DROP TRIGGER IF EXISTS auto_assign_staff_role_trigger ON user_roles;
CREATE TRIGGER auto_assign_staff_role_trigger
    AFTER INSERT OR UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_staff_role();

-- Step 6: Add comments explaining the functionality
COMMENT ON FUNCTION auto_assign_staff_role() IS 
    'Automatically assigns SCHOOL_STAFF role when a user is assigned TEACHER or SCHOOL_ADMIN role at a school. SCHOOL_LICENCE users are excluded.';

COMMENT ON FUNCTION is_teacher_or_admin_role(uuid) IS 
    'Checks if a role is TEACHER or SCHOOL_ADMIN';

COMMENT ON FUNCTION get_staff_role_id() IS 
    'Returns the UUID of the SCHOOL_STAFF role';

COMMIT;

-- Summary message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'All users with TEACHER or SCHOOL_ADMIN roles now have SCHOOL_STAFF role';
    RAISE NOTICE 'Future assignments will automatically include SCHOOL_STAFF role';
END $$;

-- Migration: Add staff_count to v_schools_statistics view
-- This migration updates the view to include the number of users with SCHOOL_STAFF role per school

BEGIN;

-- Drop the existing view
DROP VIEW IF EXISTS public.v_schools_statistics;

-- Recreate the view with staff_count added
CREATE VIEW public.v_schools_statistics AS
SELECT
  s.id,
  s.name,
  COALESCE(
    (
      SELECT
        count(*) AS count
      FROM
        user_roles ur
        JOIN roles r ON r.id = ur.role_id
      WHERE
        ur.school_id = s.id
        AND r.key = 'TEACHER'::text
    ),
    0::bigint
  ) AS teacher_count,
  COALESCE(
    (
      SELECT
        count(*) AS count
      FROM
        classes c
      WHERE
        c.school_id = s.id
    ),
    0::bigint
  ) AS class_count,
  COALESCE(
    (
      SELECT
        count(*) AS count
      FROM
        user_roles ur
        JOIN roles r ON r.id = ur.role_id
      WHERE
        ur.school_id = s.id
        AND r.key = 'SCHOOL_ADMIN'::text
    ),
    0::bigint
  ) AS school_admin_count,
  COALESCE(
    (
      SELECT
        count(*) AS count
      FROM
        user_roles ur
        JOIN roles r ON r.id = ur.role_id
      WHERE
        ur.school_id = s.id
        AND r.key = 'SCHOOL_LICENCE'::text
    ),
    0::bigint
  ) AS school_licence_count,
  EXISTS(
    SELECT
      1
    FROM
      school_licences sl
    WHERE
      sl.school_id = s.id
      AND sl.status = 'ACTIVE'::licence_status
  ) AS active_licence,
  COALESCE(
    (
      SELECT
        count(*) AS count
      FROM
        user_roles ur
        JOIN roles r ON r.id = ur.role_id
      WHERE
        ur.school_id = s.id
        AND r.key = 'SCHOOL_STAFF'::text
    ),
    0::bigint
  ) AS staff_count
FROM
  schools s;

-- Add comment to the view
COMMENT ON VIEW public.v_schools_statistics IS 'Statistics view for schools including teacher count, class count, admin count, licence count, active licence status, and staff count';

COMMIT;

-- Enable Row Level Security on lessons table
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "lessons_select" ON lessons;
DROP POLICY IF EXISTS "lessons_insert" ON lessons;
DROP POLICY IF EXISTS "lessons_update" ON lessons;
DROP POLICY IF EXISTS "lessons_delete" ON lessons;

-- SELECT Policy: Users can read lessons if:
-- 1. They are platform admins/staff (can read all lessons)
-- 2. They are school admins in the school that owns the lesson
-- 3. They are teachers in the school that owns the lesson (can read ALL lessons from that school)
CREATE POLICY "lessons_select"
ON lessons
FOR SELECT
TO authenticated
USING (
  -- Platform admins can read all lessons
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
  OR
  -- School admins can read lessons in their schools
  has_any_role(ARRAY['SCHOOL_ADMIN'::text], school_id)
  OR
  -- Teachers can read ALL lessons from schools where they have a TEACHER role
  -- They can only read lessons where the school_id matches a school they're a member of
  has_any_role(ARRAY['TEACHER'::text], school_id)
);

-- INSERT Policy: Users can create lessons if:
-- 1. They are platform admins/staff
-- 2. They are school admins in the school
-- 3. They are teachers in the school
CREATE POLICY "lessons_insert"
ON lessons
FOR INSERT
TO authenticated
WITH CHECK (
  -- Platform admins can create lessons in any school
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
  OR
  -- School admins can create lessons in their schools
  has_any_role(ARRAY['SCHOOL_ADMIN'::text], school_id)
  OR
  -- Teachers can create lessons in their schools
  has_any_role(ARRAY['TEACHER'::text], school_id)
);

-- UPDATE Policy: Users can update lessons if:
-- 1. They are platform admins/staff
-- 2. They are school admins in the school that owns the lesson
-- 3. They are teachers in the school that owns the lesson AND they created the lesson
CREATE POLICY "lessons_update"
ON lessons
FOR UPDATE
TO authenticated
USING (
  -- Platform admins can update all lessons
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
  OR
  -- School admins can update lessons in their schools
  has_any_role(ARRAY['SCHOOL_ADMIN'::text], school_id)
  OR
  -- Teachers can update lessons they created in their schools
  (
    has_any_role(ARRAY['TEACHER'::text], school_id)
    AND created_by_user_id = auth.uid()
  )
)
WITH CHECK (
  -- Same conditions for the updated row
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
  OR
  has_any_role(ARRAY['SCHOOL_ADMIN'::text], school_id)
  OR
  (
    has_any_role(ARRAY['TEACHER'::text], school_id)
    AND created_by_user_id = auth.uid()
  )
);

-- DELETE Policy: Users can delete lessons if:
-- 1. They are platform admins/staff
-- 2. They are school admins in the school that owns the lesson
-- 3. They are teachers in the school that owns the lesson AND they created the lesson
CREATE POLICY "lessons_delete"
ON lessons
FOR DELETE
TO authenticated
USING (
  -- Platform admins can delete all lessons
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
  OR
  -- School admins can delete lessons in their schools
  has_any_role(ARRAY['SCHOOL_ADMIN'::text], school_id)
  OR
  -- Teachers can delete lessons they created in their schools
  (
    has_any_role(ARRAY['TEACHER'::text], school_id)
    AND created_by_user_id = auth.uid()
  )
);


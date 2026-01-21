-- Step 1: Create Base Tables
-- This step creates the certification_courses table which has no dependencies.
-- Run this step first before any other steps.

-- ============================================================================
-- CERTIFICATION COURSES (renamed from certification_stages)
-- ============================================================================
CREATE TABLE certification_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  sort_index smallint NOT NULL,
  certificate_type text CHECK (certificate_type IN ('none', 'completion', 'achievement', 'custom')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT certification_courses_code_key UNIQUE(code),
  CONSTRAINT certification_courses_name_key UNIQUE(name),
  CONSTRAINT certification_courses_sort_index_key UNIQUE(sort_index)
);

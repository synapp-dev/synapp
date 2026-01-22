-- Migration: Create course_ratings table
-- This table stores user ratings for courses (1-5 stars with optional comments)

-- ============================================================================
-- COURSE RATINGS TABLE
-- ============================================================================
CREATE TABLE course_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES certification_courses(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT course_ratings_user_course_unique UNIQUE(user_id, course_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_course_ratings_user_id ON course_ratings(user_id);
CREATE INDEX idx_course_ratings_course_id ON course_ratings(course_id);
CREATE INDEX idx_course_ratings_user_course ON course_ratings(user_id, course_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================
ALTER TABLE course_ratings ENABLE ROW LEVEL SECURITY;

-- Users can view all ratings (for displaying average ratings)
CREATE POLICY course_ratings_select ON course_ratings
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own ratings
CREATE POLICY course_ratings_insert ON course_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own ratings
CREATE POLICY course_ratings_update ON course_ratings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own ratings
CREATE POLICY course_ratings_delete ON course_ratings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

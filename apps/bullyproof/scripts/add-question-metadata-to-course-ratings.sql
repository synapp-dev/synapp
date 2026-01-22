-- Migration: Add question_metadata JSONB column to course_ratings table
-- This allows storing flexible additional questions and answers per rating
-- Also adds rating_questions JSONB column to certification_courses for question definitions

-- ============================================================================
-- COURSE RATINGS: Add question_metadata column
-- ============================================================================
ALTER TABLE course_ratings
ADD COLUMN IF NOT EXISTS question_metadata jsonb;

-- Add GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_course_ratings_question_metadata 
ON course_ratings USING gin(question_metadata);

-- Add comment to document the column structure
COMMENT ON COLUMN course_ratings.question_metadata IS 
'JSONB object storing user answers to additional questions. Structure: {"questions": [{"id": "string", "type": "text"|"rating"|"multiple_choice", "label": "string", "required": boolean, "options": ["option1"], "min": number, "max": number, "value": "string"|number|string[]}]}';

-- ============================================================================
-- CERTIFICATION COURSES: Add rating_questions column
-- ============================================================================
ALTER TABLE certification_courses
ADD COLUMN IF NOT EXISTS rating_questions jsonb;

-- Add GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_certification_courses_rating_questions 
ON certification_courses USING gin(rating_questions);

-- Add comment to document the column structure
COMMENT ON COLUMN certification_courses.rating_questions IS 
'JSONB array storing question definitions for course ratings. Structure: [{"id": "string", "type": "text"|"rating"|"multiple_choice", "label": "string", "required": boolean, "options": ["option1", "option2"], "min": number, "max": number}]. Questions defined here are shown when users rate the course.';

-- Create lesson_feedback table for storing lesson feedback/ratings
-- This table stores feedback given by teachers after completing a lesson

CREATE TABLE IF NOT EXISTS lesson_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  teacher_user_id UUID NOT NULL REFERENCES user_profile(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lesson_feedback_lesson_id_unique UNIQUE (lesson_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lesson_feedback_lesson_id ON lesson_feedback(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_feedback_teacher_user_id ON lesson_feedback(teacher_user_id);

-- Update lessons table status check constraint to include 'pending_review'
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_status_check;
ALTER TABLE lessons ADD CONSTRAINT lessons_status_check 
  CHECK (status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'in_progress'::text, 'pending_review'::text, 'completed'::text, 'cancelled'::text]));

-- Add comment to the table
COMMENT ON TABLE lesson_feedback IS 'Stores feedback and ratings given by teachers for completed lessons';
COMMENT ON COLUMN lesson_feedback.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN lesson_feedback.comments IS 'Optional text comments from the teacher';


-- Migration: Create v_quiz_attempts_enriched view
-- This view pre-computes all quiz attempt data for easy querying and efficient lookups

CREATE OR REPLACE VIEW v_quiz_attempts_enriched AS
SELECT 
  qa.id AS attempt_id,
  qa.user_id,
  qa.quiz_id,
  qa.topic_id,
  qa.course_id,
  qa.attempt_number,
  qa.total_questions,
  qa.correct_answers,
  qa.score_percentage,
  ctq.passing_score_percentage,
  qa.is_passed,
  qa.started_at,
  qa.completed_at
FROM quiz_attempts qa
JOIN course_topic_quizzes ctq ON ctq.id = qa.quiz_id
WHERE qa.completed_at IS NOT NULL;

-- Add comment to the view
COMMENT ON VIEW v_quiz_attempts_enriched IS 'View combining quiz attempts with quiz settings for efficient querying. Each row represents one completed quiz attempt with pre-computed score and pass status.';

-- Grant access to authenticated users
GRANT SELECT ON v_quiz_attempts_enriched TO authenticated;

-- Create indexes on the underlying tables for better view performance
-- (These indexes may already exist, but ensuring they're there)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_topic ON quiz_attempts(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_topic_passed ON quiz_attempts(topic_id, is_passed) WHERE is_passed = true;
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed ON quiz_attempts(completed_at) WHERE completed_at IS NOT NULL;

-- Migration: Create v_course_topics_enriched view
-- This view aggregates course topics with slide counts, quiz existence, and user quiz completion status

CREATE OR REPLACE VIEW v_course_topics_enriched AS
SELECT 
  ct.id AS topic_id,
  ct.course_id,
  ct.title AS topic_title,
  ct.course_order,
  ct.status AS topic_status,
  ct.created_at AS topic_created_at,
  
  -- Slide count
  COALESCE(slide_counts.slide_count, 0) AS slide_count,
  
  -- Has quiz flag (whether topic has any published quizzes with questions)
  COALESCE(quiz_exists.has_quiz, false) AS has_quiz,
  
  -- User quiz completion status (user-scoped)
  COALESCE(user_quiz_status.quiz_completed, false) AS quiz_completed,
  
  -- Latest quiz score percentage (from most recent passed attempt, or latest attempt if none passed)
  user_quiz_status.quiz_score_percentage

FROM course_topics ct

-- Count slides per topic
LEFT JOIN (
  SELECT 
    topic_id,
    COUNT(*) AS slide_count
  FROM course_topic_slides
  GROUP BY topic_id
) slide_counts ON slide_counts.topic_id = ct.id

-- Check if topic has quizzes with questions (any status, as long as quiz has questions)
LEFT JOIN (
  SELECT DISTINCT
    ctq.topic_id,
    true AS has_quiz
  FROM course_topic_quizzes ctq
  INNER JOIN quiz_questions qq ON qq.quiz_id = ctq.id
  GROUP BY ctq.topic_id
  HAVING COUNT(qq.id) > 0
) quiz_exists ON quiz_exists.topic_id = ct.id

-- Get user quiz completion status and score (user-scoped via auth.uid())
LEFT JOIN (
  SELECT 
    qa.topic_id,
    -- Quiz is completed if user has any passed attempt
    bool_or(qa.is_passed = true) AS quiz_completed,
    -- Get score from most recent passed attempt, or latest attempt if none passed
    (
      SELECT qa2.score_percentage
      FROM quiz_attempts qa2
      WHERE qa2.topic_id = qa.topic_id
        AND qa2.user_id = auth.uid()
        AND (
          -- Prefer passed attempts
          (qa2.is_passed = true AND qa2.score_percentage IS NOT NULL)
          OR
          -- Fallback to latest attempt if no passed attempts
          (NOT EXISTS (
            SELECT 1 FROM quiz_attempts qa3
            WHERE qa3.topic_id = qa.topic_id
              AND qa3.user_id = auth.uid()
              AND qa3.is_passed = true
          ) AND qa2.score_percentage IS NOT NULL)
        )
      ORDER BY 
        CASE WHEN qa2.is_passed = true THEN 0 ELSE 1 END,
        qa2.completed_at DESC NULLS LAST,
        qa2.started_at DESC
      LIMIT 1
    ) AS quiz_score_percentage
  FROM quiz_attempts qa
  WHERE qa.user_id = auth.uid()
  GROUP BY qa.topic_id
) user_quiz_status ON user_quiz_status.topic_id = ct.id

ORDER BY ct.course_id, ct.course_order;

-- Add comment to the view
COMMENT ON VIEW v_course_topics_enriched IS 'View combining course topics with slide counts, quiz existence, and user quiz completion status (user-scoped)';

-- Grant access to authenticated users
GRANT SELECT ON v_course_topics_enriched TO authenticated;

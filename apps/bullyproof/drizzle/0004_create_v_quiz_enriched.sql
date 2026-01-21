-- Migration: Create v_quiz_enriched view
-- This view aggregates quiz data with all questions and answers in a JSONB column
-- for efficient single-query retrieval

CREATE OR REPLACE VIEW v_quiz_enriched AS
SELECT 
  ctq.id,
  ctq.topic_id,
  ctq.title,
  ctq.description,
  ctq.passing_score_percentage,
  ctq.time_limit_minutes,
  ctq.max_attempts,
  ctq.is_required,
  ctq.sequence_type,
  ctq.sort_order,
  ctq.status,
  ctq.created_at,
  ctq.updated_at,
  
  -- JSONB column containing all questions with nested answers
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', qq.id,
          'quiz_id', qq.quiz_id,
          'question_text', qq.question_text,
          'question_type', qq.question_type,
          'allow_multiple_selections', qq.allow_multiple_selections,
          'explanation', qq.explanation,
          'points', qq.points,
          'order_index', qq.order_index,
          'question_urls', qq.question_urls,
          'created_at', qq.created_at,
          'updated_at', qq.updated_at,
          'answers', COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', qa.id,
                  'question_id', qa.question_id,
                  'answer_text', qa.answer_text,
                  'is_correct', qa.is_correct,
                  'order_index', qa.order_index,
                  'created_at', qa.created_at,
                  'updated_at', qa.updated_at
                ) ORDER BY qa.order_index
              )
              FROM quiz_answers qa
              WHERE qa.question_id = qq.id
            ),
            '[]'::jsonb
          )
        ) ORDER BY qq.order_index
      )
      FROM quiz_questions qq
      WHERE qq.quiz_id = ctq.id
    ),
    '[]'::jsonb
  ) AS questions

FROM course_topic_quizzes ctq;

-- Add comment to the view
COMMENT ON VIEW v_quiz_enriched IS 'View combining quiz data with all questions and nested answers in a JSONB column for efficient single-query retrieval';

-- Grant access to authenticated users
GRANT SELECT ON v_quiz_enriched TO authenticated;

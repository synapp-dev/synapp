-- Step 7: Create Helper Functions
-- This step creates utility functions for the certification system.
-- Prerequisites: Steps 1 and 2 must be completed first.

-- ============================================================================
-- Function to cleanup stale slide viewing sessions (run periodically)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_stale_slide_sessions()
RETURNS void AS $$
BEGIN
  -- End sessions with no activity for > 10 minutes
  UPDATE slide_viewing_sessions
  SET 
    session_ended_at = last_activity_at + INTERVAL '1 minute',
    duration_seconds = EXTRACT(EPOCH FROM (last_activity_at + INTERVAL '1 minute' - session_started_at))::integer
  WHERE 
    session_ended_at IS NULL
    AND last_activity_at < now() - INTERVAL '10 minutes';
    
  -- Update total_time_seconds for affected slides
  UPDATE user_slide_views usv
  SET total_time_seconds = (
    SELECT COALESCE(SUM(duration_seconds), 0)
    FROM slide_viewing_sessions svs
    WHERE svs.user_id = usv.user_id 
      AND svs.slide_id = usv.slide_id
      AND svs.session_ended_at IS NOT NULL
  )
  WHERE EXISTS (
    SELECT 1 FROM slide_viewing_sessions svs
    WHERE svs.user_id = usv.user_id 
      AND svs.slide_id = usv.slide_id
      AND svs.session_ended_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function to calculate quiz score and update attempt
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_quiz_score(attempt_uuid uuid)
RETURNS void AS $$
DECLARE
  quiz_record course_topic_quizzes%ROWTYPE;
  total_questions_count integer;
  correct_answers_count integer;
  calculated_score integer;
  passed boolean;
BEGIN
  -- Get quiz and attempt details
  SELECT q.* INTO quiz_record
  FROM course_topic_quizzes q
  JOIN quiz_attempts qa ON qa.quiz_id = q.id
  WHERE qa.id = attempt_uuid;
  
  -- Get total questions
  SELECT COUNT(*) INTO total_questions_count
  FROM quiz_questions
  WHERE quiz_id = quiz_record.id;
  
  -- Get correct answers count
  SELECT COUNT(*) INTO correct_answers_count
  FROM quiz_attempt_answers qaa
  JOIN quiz_answers qa ON qa.id = qaa.answer_id
  WHERE qaa.attempt_id = attempt_uuid AND qaa.is_correct = true;
  
  -- Calculate score
  IF total_questions_count > 0 THEN
    calculated_score := (correct_answers_count::numeric / total_questions_count::numeric * 100)::integer;
    passed := calculated_score >= quiz_record.passing_score_percentage;
  ELSE
    calculated_score := 0;
    passed := false;
  END IF;
  
  -- Update attempt
  UPDATE quiz_attempts
  SET 
    total_questions = total_questions_count,
    correct_answers = correct_answers_count,
    score_percentage = calculated_score,
    is_passed = passed,
    completed_at = now()
  WHERE id = attempt_uuid;
END;
$$ LANGUAGE plpgsql;

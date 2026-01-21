-- Step 4: Enable Row Level Security
-- This step enables RLS on all tables.
-- Prerequisites: Steps 1 and 2 must be completed first.

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================
ALTER TABLE certification_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_topic_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_slide_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE slide_viewing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_topic_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_topic_quiz_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;

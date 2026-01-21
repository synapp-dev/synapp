-- Step 3: Create Indexes
-- This step creates all indexes including the fixed unique index for lower(title).
-- Prerequisites: Steps 1 and 2 must be completed first.

-- ============================================================================
-- Indexes for certification_courses
-- ============================================================================
CREATE INDEX idx_certification_courses_sort_index ON certification_courses(sort_index);

-- ============================================================================
-- Indexes for course_topics
-- ============================================================================
CREATE INDEX idx_course_topics_course_id ON course_topics(course_id);
CREATE INDEX idx_course_topics_course_order ON course_topics(course_id, course_order);
CREATE INDEX idx_course_topics_status ON course_topics(status);

-- Fixed: Create unique index for (course_id, lower(title)) instead of constraint
-- PostgreSQL doesn't allow function calls directly in UNIQUE constraints
CREATE UNIQUE INDEX course_topics_course_title_unique ON course_topics(course_id, lower(title));

-- ============================================================================
-- Indexes for course_topic_slides
-- ============================================================================
CREATE INDEX idx_course_topic_slides_topic_order ON course_topic_slides(topic_id, order_index);
CREATE INDEX idx_course_topic_slides_topic_id ON course_topic_slides(topic_id);

-- ============================================================================
-- Indexes for user_slide_views
-- ============================================================================
CREATE INDEX idx_user_slide_views_user_topic ON user_slide_views(user_id, topic_id);
CREATE INDEX idx_user_slide_views_slide ON user_slide_views(slide_id);
CREATE INDEX idx_user_slide_views_viewed_at ON user_slide_views(user_id, topic_id, last_viewed_at);

-- ============================================================================
-- Indexes for slide_viewing_sessions
-- ============================================================================
CREATE INDEX idx_slide_sessions_user_slide ON slide_viewing_sessions(user_id, slide_id);
CREATE INDEX idx_slide_sessions_active ON slide_viewing_sessions(user_id, slide_id) WHERE session_ended_at IS NULL;
CREATE INDEX idx_slide_sessions_started ON slide_viewing_sessions(session_started_at);

-- ============================================================================
-- Indexes for course_topic_quizzes
-- ============================================================================
CREATE INDEX idx_course_topic_quizzes_topic_id ON course_topic_quizzes(topic_id);
CREATE INDEX idx_course_topic_quizzes_status ON course_topic_quizzes(status);
CREATE INDEX idx_course_topic_quizzes_sequence ON course_topic_quizzes(topic_id, sequence_type, sort_order);

-- ============================================================================
-- Indexes for quiz_questions
-- ============================================================================
CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_order ON quiz_questions(quiz_id, order_index);
CREATE INDEX idx_quiz_questions_text_search ON quiz_questions USING gin(to_tsvector('english', question_text));

-- ============================================================================
-- Indexes for quiz_answers
-- ============================================================================
CREATE INDEX idx_quiz_answers_question_id ON quiz_answers(question_id);
CREATE INDEX idx_quiz_answers_correct ON quiz_answers(question_id, is_correct);

-- ============================================================================
-- Indexes for course_topic_progress
-- ============================================================================
CREATE INDEX idx_course_topic_progress_user_course ON course_topic_progress(user_id, course_id);
CREATE INDEX idx_course_topic_progress_user_topic ON course_topic_progress(user_id, topic_id, attempt_number DESC);
CREATE INDEX idx_course_topic_progress_current_slide ON course_topic_progress(current_slide_id);
CREATE INDEX idx_course_topic_progress_status ON course_topic_progress(status) WHERE status IN ('not_started', 'viewing_slides', 'quiz_unlocked');
CREATE INDEX idx_course_topic_progress_slide_progress ON course_topic_progress USING gin(slide_progress);

-- ============================================================================
-- Indexes for quiz_attempts
-- ============================================================================
CREATE INDEX idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_course_topic_progress ON quiz_attempts(topic_progress_id);
CREATE INDEX idx_quiz_attempts_in_progress ON quiz_attempts(user_id, quiz_id) WHERE completed_at IS NULL;
CREATE INDEX idx_quiz_attempts_completed ON quiz_attempts(completed_at) WHERE completed_at IS NOT NULL;

-- ============================================================================
-- Indexes for quiz_attempt_answers
-- ============================================================================
CREATE INDEX idx_quiz_attempt_answers_attempt ON quiz_attempt_answers(attempt_id);
CREATE INDEX idx_quiz_attempt_answers_question ON quiz_attempt_answers(question_id);
CREATE INDEX idx_quiz_attempt_answers_correct ON quiz_attempt_answers(is_correct);
CREATE INDEX idx_quiz_attempt_answers_pending ON quiz_attempt_answers(attempt_id, question_id) WHERE is_correct IS NULL;

-- ============================================================================
-- Indexes for course_topic_quiz_completions
-- ============================================================================
CREATE INDEX idx_course_topic_quiz_completions_user_topic ON course_topic_quiz_completions(user_id, topic_id);
CREATE INDEX idx_course_topic_quiz_completions_quiz ON course_topic_quiz_completions(quiz_id);

-- ============================================================================
-- Indexes for course_progress
-- ============================================================================
CREATE INDEX idx_course_progress_user_course ON course_progress(user_id, course_id);
CREATE INDEX idx_course_progress_status ON course_progress(status) WHERE status IN ('not_started', 'in_progress');

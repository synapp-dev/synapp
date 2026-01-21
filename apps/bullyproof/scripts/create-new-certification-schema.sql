-- Migration: Create new certification system schema
-- This creates the restructured certification system:
-- certification_courses -> course_topics -> topic_slides
-- course_topics -> course_topic_quizzes -> quiz_questions -> quiz_answers
-- With granular slide viewing tracking and session-based time tracking

-- ============================================================================
-- 1. CERTIFICATION COURSES (renamed from certification_stages)
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

CREATE INDEX idx_certification_courses_sort_index ON certification_courses(sort_index);

-- ============================================================================
-- 2. COURSE TOPICS (renamed from certification_topics, FK changed)
-- ============================================================================
CREATE TABLE course_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  course_id uuid NOT NULL REFERENCES certification_courses(id) ON DELETE RESTRICT,
  title text NOT NULL,
  status text DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  course_order smallint NOT NULL,
  is_sequential boolean DEFAULT true NOT NULL,
  quiz_completion_percentage integer DEFAULT 100 NOT NULL CHECK (quiz_completion_percentage >= 0 AND quiz_completion_percentage <= 100),
  official_notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT course_topics_course_title_unique UNIQUE(course_id, lower(title)),
  CONSTRAINT course_topics_course_order_unique UNIQUE(course_id, course_order)
);

CREATE INDEX idx_course_topics_course_id ON course_topics(course_id);
CREATE INDEX idx_course_topics_course_order ON course_topics(course_id, course_order);
CREATE INDEX idx_course_topics_status ON course_topics(status);

-- ============================================================================
-- 3. TOPIC SLIDES (renamed from certification_slides, quiz/test kinds removed)
-- ============================================================================
CREATE TABLE topic_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  topic_id uuid NOT NULL REFERENCES course_topics(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('image', 'video', 'text')),
  text_html text,
  image_url text,
  video_url text,
  video_start_s integer,
  video_end_s integer,
  official_notes text,
  duration_sec integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT topic_slides_topic_order_unique UNIQUE(topic_id, order_index)
);

CREATE INDEX idx_topic_slides_topic_order ON topic_slides(topic_id, order_index);
CREATE INDEX idx_topic_slides_topic_id ON topic_slides(topic_id);

-- ============================================================================
-- 4. USER SLIDE VIEWS (granular tracking - one row per user per slide)
-- ============================================================================
CREATE TABLE user_slide_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slide_id uuid NOT NULL REFERENCES topic_slides(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES course_topics(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES certification_courses(id) ON DELETE CASCADE,
  first_viewed_at timestamp with time zone DEFAULT now() NOT NULL,
  last_viewed_at timestamp with time zone DEFAULT now() NOT NULL,
  total_time_seconds integer DEFAULT 0 NOT NULL,
  view_count integer DEFAULT 1 NOT NULL,
  CONSTRAINT user_slide_views_user_slide_unique UNIQUE(user_id, slide_id)
);

CREATE INDEX idx_user_slide_views_user_topic ON user_slide_views(user_id, topic_id);
CREATE INDEX idx_user_slide_views_slide ON user_slide_views(slide_id);
CREATE INDEX idx_user_slide_views_viewed_at ON user_slide_views(user_id, topic_id, last_viewed_at);

-- ============================================================================
-- 5. SLIDE VIEWING SESSIONS (time tracking)
-- ============================================================================
CREATE TABLE slide_viewing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slide_id uuid NOT NULL REFERENCES topic_slides(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES course_topics(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES certification_courses(id) ON DELETE CASCADE,
  session_started_at timestamp with time zone DEFAULT now() NOT NULL,
  session_ended_at timestamp with time zone,
  duration_seconds integer,
  is_completed boolean DEFAULT false NOT NULL,
  interaction_count integer DEFAULT 0 NOT NULL,
  last_activity_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX idx_slide_sessions_user_slide ON slide_viewing_sessions(user_id, slide_id);
CREATE INDEX idx_slide_sessions_active ON slide_viewing_sessions(user_id, slide_id) WHERE session_ended_at IS NULL;
CREATE INDEX idx_slide_sessions_started ON slide_viewing_sessions(session_started_at);

-- ============================================================================
-- 6. COURSE TOPIC QUIZZES (separate quiz module)
-- ============================================================================
CREATE TABLE course_topic_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  topic_id uuid NOT NULL REFERENCES course_topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  passing_score_percentage integer DEFAULT 70 NOT NULL CHECK (passing_score_percentage >= 0 AND passing_score_percentage <= 100),
  time_limit_minutes integer,
  max_attempts integer,
  is_required boolean DEFAULT true NOT NULL,
  sequence_type text DEFAULT 'sequential' NOT NULL CHECK (sequence_type IN ('sequential', 'user_choice')),
  sort_order integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT course_topic_quizzes_topic_sort_unique UNIQUE(topic_id, sort_order)
);

CREATE INDEX idx_course_topic_quizzes_topic_id ON course_topic_quizzes(topic_id);
CREATE INDEX idx_course_topic_quizzes_status ON course_topic_quizzes(status);
CREATE INDEX idx_course_topic_quizzes_sequence ON course_topic_quizzes(topic_id, sequence_type, sort_order);

-- ============================================================================
-- 7. QUIZ QUESTIONS (normalized)
-- ============================================================================
CREATE TABLE quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  quiz_id uuid NOT NULL REFERENCES topic_quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text DEFAULT 'multiple_choice' NOT NULL CHECK (question_type IN ('multiple_choice', 'single_choice', 'true_false')),
  allow_multiple_selections boolean DEFAULT false NOT NULL,
  explanation text,
  points integer DEFAULT 1 NOT NULL,
  order_index integer NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT quiz_questions_quiz_order_unique UNIQUE(quiz_id, order_index)
);

CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_order ON quiz_questions(quiz_id, order_index);
CREATE INDEX idx_quiz_questions_text_search ON quiz_questions USING gin(to_tsvector('english', question_text));

-- ============================================================================
-- 8. QUIZ ANSWERS (normalized)
-- ============================================================================
CREATE TABLE quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  question_id uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  answer_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT quiz_answers_question_order_unique UNIQUE(question_id, order_index)
);

CREATE INDEX idx_quiz_answers_question_id ON quiz_answers(question_id);
CREATE INDEX idx_quiz_answers_correct ON quiz_answers(question_id, is_correct);

-- ============================================================================
-- 9. COURSE TOPIC PROGRESS (simplified status flow)
-- ============================================================================
CREATE TABLE course_topic_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES certification_courses(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES course_topics(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  current_slide_id uuid REFERENCES course_topic_slides(id) ON DELETE SET NULL,
  current_slide_index integer,
  status text DEFAULT 'not_started' NOT NULL CHECK (status IN ('not_started', 'viewing_slides', 'quiz_unlocked', 'completed')),
  slides_completed_at timestamp with time zone,
  quiz_unlocked_at timestamp with time zone,
  completed_at timestamp with time zone,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  slide_progress jsonb DEFAULT '{}' NOT NULL,
  CONSTRAINT course_topic_progress_user_course_topic_attempt_unique UNIQUE(user_id, course_id, topic_id, attempt_number)
);

CREATE INDEX idx_course_topic_progress_user_course ON course_topic_progress(user_id, course_id);
CREATE INDEX idx_course_topic_progress_user_topic ON course_topic_progress(user_id, topic_id, attempt_number DESC);
CREATE INDEX idx_course_topic_progress_current_slide ON course_topic_progress(current_slide_id);
CREATE INDEX idx_course_topic_progress_status ON course_topic_progress(status) WHERE status IN ('not_started', 'viewing_slides', 'quiz_unlocked');
CREATE INDEX idx_course_topic_progress_slide_progress ON course_topic_progress USING gin(slide_progress);

-- ============================================================================
-- 10. QUIZ ATTEMPTS (with resume capability)
-- ============================================================================
CREATE TABLE quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES course_topic_quizzes(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES course_topics(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES certification_courses(id) ON DELETE CASCADE,
  topic_progress_id uuid REFERENCES course_topic_progress(id) ON DELETE SET NULL,
  attempt_number integer NOT NULL DEFAULT 1,
  total_questions integer NOT NULL,
  correct_answers integer NOT NULL DEFAULT 0,
  score_percentage integer,
  is_passed boolean,
  time_limit_started_at timestamp with time zone,
  time_taken_seconds integer,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  CONSTRAINT quiz_attempts_user_quiz_attempt_unique UNIQUE(user_id, quiz_id, attempt_number)
);

CREATE INDEX idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_course_topic_progress ON quiz_attempts(topic_progress_id);
CREATE INDEX idx_quiz_attempts_in_progress ON quiz_attempts(user_id, quiz_id) WHERE completed_at IS NULL;
CREATE INDEX idx_quiz_attempts_completed ON quiz_attempts(completed_at) WHERE completed_at IS NOT NULL;

-- ============================================================================
-- 11. QUIZ ATTEMPT ANSWERS (with partial save support)
-- ============================================================================
CREATE TABLE quiz_attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  attempt_id uuid NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  answer_id uuid NOT NULL REFERENCES quiz_answers(id) ON DELETE CASCADE,
  is_correct boolean,
  time_taken_seconds integer,
  answered_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT quiz_attempt_answers_attempt_question_answer_unique UNIQUE(attempt_id, question_id, answer_id)
);

CREATE INDEX idx_quiz_attempt_answers_attempt ON quiz_attempt_answers(attempt_id);
CREATE INDEX idx_quiz_attempt_answers_question ON quiz_attempt_answers(question_id);
CREATE INDEX idx_quiz_attempt_answers_correct ON quiz_attempt_answers(is_correct);
CREATE INDEX idx_quiz_attempt_answers_pending ON quiz_attempt_answers(attempt_id, question_id) WHERE is_correct IS NULL;

-- ============================================================================
-- 12. COURSE TOPIC QUIZ COMPLETIONS (track passed quizzes)
-- ============================================================================
CREATE TABLE course_topic_quiz_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES course_topics(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES course_topic_quizzes(id) ON DELETE CASCADE,
  passed_attempt_id uuid REFERENCES quiz_attempts(id) ON DELETE SET NULL,
  first_passed_at timestamp with time zone NOT NULL,
  last_passed_at timestamp with time zone NOT NULL,
  total_attempts integer DEFAULT 1 NOT NULL,
  CONSTRAINT course_topic_quiz_completions_user_quiz_unique UNIQUE(user_id, quiz_id)
);

CREATE INDEX idx_course_topic_quiz_completions_user_topic ON course_topic_quiz_completions(user_id, topic_id);
CREATE INDEX idx_course_topic_quiz_completions_quiz ON course_topic_quiz_completions(quiz_id);

-- ============================================================================
-- 13. COURSE PROGRESS (sequential topic unlocking)
-- ============================================================================
CREATE TABLE course_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES certification_courses(id) ON DELETE CASCADE,
  current_topic_id uuid REFERENCES course_topics(id) ON DELETE SET NULL,
  current_topic_order integer,
  last_completed_topic_order integer DEFAULT 0 NOT NULL,
  total_topics integer NOT NULL,
  completed_topics integer DEFAULT 0 NOT NULL,
  progress_percentage integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'not_started' NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
  certificate_issued_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT course_progress_user_course_unique UNIQUE(user_id, course_id)
);

CREATE INDEX idx_course_progress_user_course ON course_progress(user_id, course_id);
CREATE INDEX idx_course_progress_status ON course_progress(status) WHERE status IN ('not_started', 'in_progress');

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE certification_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_slides ENABLE ROW LEVEL SECURITY;
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

-- RLS Policies for certification_courses
CREATE POLICY "certification_courses_select"
ON certification_courses FOR SELECT
TO authenticated USING (true);

CREATE POLICY "certification_courses_insert"
ON certification_courses FOR INSERT
TO authenticated WITH CHECK (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "certification_courses_update"
ON certification_courses FOR UPDATE
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
) WITH CHECK (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "certification_courses_delete"
ON certification_courses FOR DELETE
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- RLS Policies for course_topics
CREATE POLICY "course_topics_select"
ON course_topics FOR SELECT
TO authenticated USING (true);

CREATE POLICY "course_topics_insert"
ON course_topics FOR INSERT
TO authenticated WITH CHECK (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "course_topics_update"
ON course_topics FOR UPDATE
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
) WITH CHECK (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "course_topics_delete"
ON course_topics FOR DELETE
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- RLS Policies for topic_slides
CREATE POLICY "topic_slides_select"
ON topic_slides FOR SELECT
TO authenticated USING (true);

CREATE POLICY "topic_slides_insert"
ON topic_slides FOR INSERT
TO authenticated WITH CHECK (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "topic_slides_update"
ON topic_slides FOR UPDATE
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
) WITH CHECK (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "topic_slides_delete"
ON topic_slides FOR DELETE
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- RLS Policies for user_slide_views
CREATE POLICY "user_slide_views_select"
ON user_slide_views FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_slide_views_insert"
ON user_slide_views FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_slide_views_update"
ON user_slide_views FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_slide_views_admin_select"
ON user_slide_views FOR SELECT
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- RLS Policies for slide_viewing_sessions
CREATE POLICY "slide_viewing_sessions_select"
ON slide_viewing_sessions FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "slide_viewing_sessions_insert"
ON slide_viewing_sessions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "slide_viewing_sessions_update"
ON slide_viewing_sessions FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "slide_viewing_sessions_admin_select"
ON slide_viewing_sessions FOR SELECT
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- RLS Policies for course_topic_quizzes
CREATE POLICY "course_topic_quizzes_select"
ON course_topic_quizzes FOR SELECT
TO authenticated USING (true);

CREATE POLICY "course_topic_quizzes_insert"
ON course_topic_quizzes FOR INSERT
TO authenticated WITH CHECK (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "course_topic_quizzes_update"
ON course_topic_quizzes FOR UPDATE
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
) WITH CHECK (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "course_topic_quizzes_delete"
ON course_topic_quizzes FOR DELETE
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- RLS Policies for quiz_questions
CREATE POLICY "quiz_questions_select"
ON quiz_questions FOR SELECT
TO authenticated USING (true);

CREATE POLICY "quiz_questions_insert"
ON quiz_questions FOR INSERT
TO authenticated WITH CHECK (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "quiz_questions_update"
ON quiz_questions FOR UPDATE
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
) WITH CHECK (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "quiz_questions_delete"
ON quiz_questions FOR DELETE
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- RLS Policies for quiz_answers
CREATE POLICY "quiz_answers_select"
ON quiz_answers FOR SELECT
TO authenticated USING (true);

CREATE POLICY "quiz_answers_insert"
ON quiz_answers FOR INSERT
TO authenticated WITH CHECK (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "quiz_answers_update"
ON quiz_answers FOR UPDATE
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
) WITH CHECK (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "quiz_answers_delete"
ON quiz_answers FOR DELETE
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- RLS Policies for course_topic_progress
CREATE POLICY "course_topic_progress_select"
ON course_topic_progress FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "course_topic_progress_insert"
ON course_topic_progress FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "course_topic_progress_update"
ON course_topic_progress FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "course_topic_progress_admin_select"
ON course_topic_progress FOR SELECT
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- RLS Policies for quiz_attempts
CREATE POLICY "quiz_attempts_select"
ON quiz_attempts FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "quiz_attempts_insert"
ON quiz_attempts FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quiz_attempts_update"
ON quiz_attempts FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quiz_attempts_admin_select"
ON quiz_attempts FOR SELECT
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- RLS Policies for quiz_attempt_answers
CREATE POLICY "quiz_attempt_answers_select"
ON quiz_attempt_answers FOR SELECT
TO authenticated USING (auth.uid() = (SELECT user_id FROM quiz_attempts WHERE id = attempt_id));

CREATE POLICY "quiz_attempt_answers_insert"
ON quiz_attempt_answers FOR INSERT
TO authenticated WITH CHECK (auth.uid() = (SELECT user_id FROM quiz_attempts WHERE id = attempt_id));

CREATE POLICY "quiz_attempt_answers_update"
ON quiz_attempt_answers FOR UPDATE
TO authenticated USING (auth.uid() = (SELECT user_id FROM quiz_attempts WHERE id = attempt_id))
WITH CHECK (auth.uid() = (SELECT user_id FROM quiz_attempts WHERE id = attempt_id));

CREATE POLICY "quiz_attempt_answers_admin_select"
ON quiz_attempt_answers FOR SELECT
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- RLS Policies for course_topic_quiz_completions
CREATE POLICY "course_topic_quiz_completions_select"
ON course_topic_quiz_completions FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "course_topic_quiz_completions_insert"
ON course_topic_quiz_completions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "course_topic_quiz_completions_update"
ON course_topic_quiz_completions FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "course_topic_quiz_completions_admin_select"
ON course_topic_quiz_completions FOR SELECT
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- RLS Policies for course_progress
CREATE POLICY "course_progress_select"
ON course_progress FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "course_progress_insert"
ON course_progress FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "course_progress_update"
ON course_progress FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "course_progress_admin_select"
ON course_progress FOR SELECT
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp on certification_courses
CREATE OR REPLACE FUNCTION update_certification_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER certification_courses_updated_at_trigger
BEFORE UPDATE ON certification_courses
FOR EACH ROW
EXECUTE FUNCTION update_certification_courses_updated_at();

-- Trigger to update updated_at timestamp on topic_slides
CREATE OR REPLACE FUNCTION update_topic_slides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER topic_slides_updated_at_trigger
BEFORE UPDATE ON topic_slides
FOR EACH ROW
EXECUTE FUNCTION update_topic_slides_updated_at();

-- Trigger to update updated_at timestamp on course_topic_quizzes
CREATE OR REPLACE FUNCTION update_course_topic_quizzes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER course_topic_quizzes_updated_at_trigger
BEFORE UPDATE ON course_topic_quizzes
FOR EACH ROW
EXECUTE FUNCTION update_course_topic_quizzes_updated_at();

-- Trigger to update updated_at timestamp on quiz_questions
CREATE OR REPLACE FUNCTION update_quiz_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quiz_questions_updated_at_trigger
BEFORE UPDATE ON quiz_questions
FOR EACH ROW
EXECUTE FUNCTION update_quiz_questions_updated_at();

-- Trigger to update updated_at timestamp on quiz_answers
CREATE OR REPLACE FUNCTION update_quiz_answers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quiz_answers_updated_at_trigger
BEFORE UPDATE ON quiz_answers
FOR EACH ROW
EXECUTE FUNCTION update_quiz_answers_updated_at();

-- Function to cleanup stale slide viewing sessions (run periodically)
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

-- Function to calculate quiz score and update attempt
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

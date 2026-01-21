-- Step 2: Create Dependent Tables
-- This step creates all tables that have foreign key dependencies.
-- Prerequisites: Step 1 must be completed first.

-- ============================================================================
-- COURSE TOPICS (renamed from certification_topics, FK changed)
-- Note: The unique constraint on (course_id, lower(title)) will be created
-- as a unique index in Step 3, as PostgreSQL doesn't allow function calls
-- directly in UNIQUE constraints.
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
  CONSTRAINT course_topics_course_order_unique UNIQUE(course_id, course_order)
);

-- ============================================================================
-- COURSE TOPIC SLIDES (renamed from certification_slides, quiz/test kinds removed)
-- Note: Named course_topic_slides to avoid conflict with existing topic_slides
-- table used for curriculum topics
-- ============================================================================
CREATE TABLE course_topic_slides (
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
  CONSTRAINT course_topic_slides_topic_order_unique UNIQUE(topic_id, order_index)
);

-- ============================================================================
-- USER SLIDE VIEWS (granular tracking - one row per user per slide)
-- ============================================================================
CREATE TABLE user_slide_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slide_id uuid NOT NULL REFERENCES course_topic_slides(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES course_topics(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES certification_courses(id) ON DELETE CASCADE,
  first_viewed_at timestamp with time zone DEFAULT now() NOT NULL,
  last_viewed_at timestamp with time zone DEFAULT now() NOT NULL,
  total_time_seconds integer DEFAULT 0 NOT NULL,
  view_count integer DEFAULT 1 NOT NULL,
  CONSTRAINT user_slide_views_user_slide_unique UNIQUE(user_id, slide_id)
);

-- ============================================================================
-- SLIDE VIEWING SESSIONS (time tracking)
-- ============================================================================
CREATE TABLE slide_viewing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slide_id uuid NOT NULL REFERENCES course_topic_slides(id) ON DELETE CASCADE,
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

-- ============================================================================
-- COURSE TOPIC QUIZZES (separate quiz module)
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

-- ============================================================================
-- QUIZ QUESTIONS (normalized)
-- ============================================================================
CREATE TABLE quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  quiz_id uuid NOT NULL REFERENCES course_topic_quizzes(id) ON DELETE CASCADE,
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

-- ============================================================================
-- QUIZ ANSWERS (normalized)
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

-- ============================================================================
-- COURSE TOPIC PROGRESS (simplified status flow)
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

-- ============================================================================
-- QUIZ ATTEMPTS (with resume capability)
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

-- ============================================================================
-- QUIZ ATTEMPT ANSWERS (with partial save support)
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

-- ============================================================================
-- COURSE TOPIC QUIZ COMPLETIONS (track passed quizzes)
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

-- ============================================================================
-- COURSE PROGRESS (sequential topic unlocking)
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

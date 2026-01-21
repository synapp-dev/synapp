-- Step 5: Create RLS Policies
-- This step creates all Row Level Security policies.
-- Prerequisites: Step 4 must be completed first.

-- ============================================================================
-- RLS Policies for certification_courses
-- ============================================================================
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

-- ============================================================================
-- RLS Policies for course_topics
-- ============================================================================
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

-- ============================================================================
-- RLS Policies for course_topic_slides
-- ============================================================================
CREATE POLICY "course_topic_slides_select"
ON course_topic_slides FOR SELECT
TO authenticated USING (true);

CREATE POLICY "course_topic_slides_insert"
ON course_topic_slides FOR INSERT
TO authenticated WITH CHECK (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "course_topic_slides_update"
ON course_topic_slides FOR UPDATE
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
) WITH CHECK (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "course_topic_slides_delete"
ON course_topic_slides FOR DELETE
TO authenticated USING (
  has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- ============================================================================
-- RLS Policies for user_slide_views
-- ============================================================================
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

-- ============================================================================
-- RLS Policies for slide_viewing_sessions
-- ============================================================================
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

-- ============================================================================
-- RLS Policies for course_topic_quizzes
-- ============================================================================
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

-- ============================================================================
-- RLS Policies for quiz_questions
-- ============================================================================
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

-- ============================================================================
-- RLS Policies for quiz_answers
-- ============================================================================
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

-- ============================================================================
-- RLS Policies for course_topic_progress
-- ============================================================================
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

-- ============================================================================
-- RLS Policies for quiz_attempts
-- ============================================================================
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

-- ============================================================================
-- RLS Policies for quiz_attempt_answers
-- ============================================================================
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

-- ============================================================================
-- RLS Policies for course_topic_quiz_completions
-- ============================================================================
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

-- ============================================================================
-- RLS Policies for course_progress
-- ============================================================================
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

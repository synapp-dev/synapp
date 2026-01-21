-- Step 6: Create Triggers
-- This step creates all trigger functions and triggers for updated_at timestamps.
-- Prerequisites: Steps 1 and 2 must be completed first.

-- ============================================================================
-- Trigger to update updated_at timestamp on certification_courses
-- ============================================================================
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

-- ============================================================================
-- Trigger to update updated_at timestamp on course_topic_slides
-- ============================================================================
CREATE OR REPLACE FUNCTION update_course_topic_slides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER course_topic_slides_updated_at_trigger
BEFORE UPDATE ON course_topic_slides
FOR EACH ROW
EXECUTE FUNCTION update_course_topic_slides_updated_at();

-- ============================================================================
-- Trigger to update updated_at timestamp on course_topic_quizzes
-- ============================================================================
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

-- ============================================================================
-- Trigger to update updated_at timestamp on quiz_questions
-- ============================================================================
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

-- ============================================================================
-- Trigger to update updated_at timestamp on quiz_answers
-- ============================================================================
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

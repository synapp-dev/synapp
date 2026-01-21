-- Migration: Rename course topic tables to use "course_topic_" prefix
-- This migration renames tables to clearly distinguish course-related topics from curriculum topics
-- Renamed tables:
--   topic_quizzes → course_topic_quizzes
--   topic_progress → course_topic_progress
--   topic_quiz_completions → course_topic_quiz_completions

-- ============================================================================
-- 1. Rename tables
-- ============================================================================
ALTER TABLE topic_quizzes RENAME TO course_topic_quizzes;
ALTER TABLE topic_progress RENAME TO course_topic_progress;
ALTER TABLE topic_quiz_completions RENAME TO course_topic_quiz_completions;

-- ============================================================================
-- 2. Rename foreign key constraints
-- ============================================================================
ALTER TABLE course_topic_quizzes RENAME CONSTRAINT topic_quizzes_topic_id_fkey TO course_topic_quizzes_topic_id_fkey;

ALTER TABLE course_topic_progress RENAME CONSTRAINT topic_progress_course_id_fkey TO course_topic_progress_course_id_fkey;
ALTER TABLE course_topic_progress RENAME CONSTRAINT topic_progress_current_slide_id_fkey TO course_topic_progress_current_slide_id_fkey;
ALTER TABLE course_topic_progress RENAME CONSTRAINT topic_progress_topic_id_fkey TO course_topic_progress_topic_id_fkey;
ALTER TABLE course_topic_progress RENAME CONSTRAINT topic_progress_user_id_fkey TO course_topic_progress_user_id_fkey;

ALTER TABLE course_topic_quiz_completions RENAME CONSTRAINT topic_quiz_completions_passed_attempt_id_fkey TO course_topic_quiz_completions_passed_attempt_id_fkey;
ALTER TABLE course_topic_quiz_completions RENAME CONSTRAINT topic_quiz_completions_quiz_id_fkey TO course_topic_quiz_completions_quiz_id_fkey;
ALTER TABLE course_topic_quiz_completions RENAME CONSTRAINT topic_quiz_completions_topic_id_fkey TO course_topic_quiz_completions_topic_id_fkey;
ALTER TABLE course_topic_quiz_completions RENAME CONSTRAINT topic_quiz_completions_user_id_fkey TO course_topic_quiz_completions_user_id_fkey;

-- Note: quiz_questions.quiz_id_fkey and quiz_attempts.topic_progress_id_fkey constraint names 
-- don't need to change - they will automatically reference the renamed tables

-- ============================================================================
-- 3. Rename unique constraints
-- ============================================================================
ALTER TABLE course_topic_quizzes RENAME CONSTRAINT topic_quizzes_topic_sort_unique TO course_topic_quizzes_topic_sort_unique;

ALTER TABLE course_topic_progress RENAME CONSTRAINT topic_progress_user_course_topic_attempt_unique TO course_topic_progress_user_course_topic_attempt_unique;

ALTER TABLE course_topic_quiz_completions RENAME CONSTRAINT topic_quiz_completions_user_quiz_unique TO course_topic_quiz_completions_user_quiz_unique;

-- ============================================================================
-- 4. Rename check constraints
-- ============================================================================
ALTER TABLE course_topic_quizzes RENAME CONSTRAINT topic_quizzes_passing_score_percentage_check TO course_topic_quizzes_passing_score_percentage_check;
ALTER TABLE course_topic_quizzes RENAME CONSTRAINT topic_quizzes_sequence_type_check TO course_topic_quizzes_sequence_type_check;
ALTER TABLE course_topic_quizzes RENAME CONSTRAINT topic_quizzes_status_check TO course_topic_quizzes_status_check;

ALTER TABLE course_topic_progress RENAME CONSTRAINT topic_progress_status_check TO course_topic_progress_status_check;

-- ============================================================================
-- 5. Rename indexes
-- ============================================================================
ALTER INDEX idx_topic_quizzes_sequence RENAME TO idx_course_topic_quizzes_sequence;
ALTER INDEX idx_topic_quizzes_status RENAME TO idx_course_topic_quizzes_status;
ALTER INDEX idx_topic_quizzes_topic_id RENAME TO idx_course_topic_quizzes_topic_id;

ALTER INDEX idx_topic_progress_current_slide RENAME TO idx_course_topic_progress_current_slide;
ALTER INDEX idx_topic_progress_slide_progress RENAME TO idx_course_topic_progress_slide_progress;
ALTER INDEX idx_topic_progress_status RENAME TO idx_course_topic_progress_status;
ALTER INDEX idx_topic_progress_user_course RENAME TO idx_course_topic_progress_user_course;
ALTER INDEX idx_topic_progress_user_topic RENAME TO idx_course_topic_progress_user_topic;

ALTER INDEX idx_topic_quiz_completions_quiz RENAME TO idx_course_topic_quiz_completions_quiz;
ALTER INDEX idx_topic_quiz_completions_user_topic RENAME TO idx_course_topic_quiz_completions_user_topic;

ALTER INDEX idx_quiz_attempts_topic_progress RENAME TO idx_quiz_attempts_course_topic_progress;

-- ============================================================================
-- 6. Rename RLS policies
-- ============================================================================
ALTER POLICY topic_quizzes_select ON course_topic_quizzes RENAME TO course_topic_quizzes_select;
ALTER POLICY topic_quizzes_insert ON course_topic_quizzes RENAME TO course_topic_quizzes_insert;
ALTER POLICY topic_quizzes_update ON course_topic_quizzes RENAME TO course_topic_quizzes_update;
ALTER POLICY topic_quizzes_delete ON course_topic_quizzes RENAME TO course_topic_quizzes_delete;

ALTER POLICY topic_progress_select ON course_topic_progress RENAME TO course_topic_progress_select;
ALTER POLICY topic_progress_insert ON course_topic_progress RENAME TO course_topic_progress_insert;
ALTER POLICY topic_progress_update ON course_topic_progress RENAME TO course_topic_progress_update;
ALTER POLICY topic_progress_admin_select ON course_topic_progress RENAME TO course_topic_progress_admin_select;

ALTER POLICY topic_quiz_completions_select ON course_topic_quiz_completions RENAME TO course_topic_quiz_completions_select;
ALTER POLICY topic_quiz_completions_insert ON course_topic_quiz_completions RENAME TO course_topic_quiz_completions_insert;
ALTER POLICY topic_quiz_completions_update ON course_topic_quiz_completions RENAME TO course_topic_quiz_completions_update;
ALTER POLICY topic_quiz_completions_admin_select ON course_topic_quiz_completions RENAME TO course_topic_quiz_completions_admin_select;

-- ============================================================================
-- 7. Rename functions and triggers (if they exist)
-- ============================================================================
-- Rename function
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_topic_quizzes_updated_at') THEN
        EXECUTE 'ALTER FUNCTION update_topic_quizzes_updated_at() RENAME TO update_course_topic_quizzes_updated_at';
    END IF;
END $$;

-- Rename trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'topic_quizzes_updated_at_trigger') THEN
        ALTER TRIGGER topic_quizzes_updated_at_trigger ON course_topic_quizzes RENAME TO course_topic_quizzes_updated_at_trigger;
    END IF;
END $$;

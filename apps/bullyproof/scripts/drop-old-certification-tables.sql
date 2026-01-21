-- Migration: Drop all old certification tables and related structures
-- This removes the old certification_stages, certification_topics, certification_slides structure
-- and all related user tracking tables

-- Drop foreign key constraints first (in reverse dependency order)

-- Drop constraints on certification_user_answers
ALTER TABLE IF EXISTS certification_user_answers 
  DROP CONSTRAINT IF EXISTS certification_user_answers_attempt_id_fkey,
  DROP CONSTRAINT IF EXISTS certification_user_answers_slide_id_fkey,
  DROP CONSTRAINT IF EXISTS certification_user_answers_stage_id_fkey,
  DROP CONSTRAINT IF EXISTS certification_user_answers_topic_id_fkey,
  DROP CONSTRAINT IF EXISTS certification_user_answers_user_id_fkey;

-- Drop constraints on certification_user_topic_progress
ALTER TABLE IF EXISTS certification_user_topic_progress
  DROP CONSTRAINT IF EXISTS certification_user_topic_progress_current_slide_id_fkey,
  DROP CONSTRAINT IF EXISTS certification_user_topic_progress_stage_id_fkey,
  DROP CONSTRAINT IF EXISTS certification_user_topic_progress_topic_id_fkey,
  DROP CONSTRAINT IF EXISTS certification_user_topic_progress_user_id_fkey;

-- Drop constraints on certification_user_progress
ALTER TABLE IF EXISTS certification_user_progress
  DROP CONSTRAINT IF EXISTS certification_user_progress_last_topic_id_fkey,
  DROP CONSTRAINT IF EXISTS certification_user_progress_stage_id_fkey,
  DROP CONSTRAINT IF EXISTS certification_user_progress_user_id_fkey;

-- Drop constraints on certification_slides
ALTER TABLE IF EXISTS certification_slides
  DROP CONSTRAINT IF EXISTS certification_slides_topic_id_fkey;

-- Drop constraints on certification_topics
ALTER TABLE IF EXISTS certification_topics
  DROP CONSTRAINT IF EXISTS certification_topics_stage_id_fkey;

-- Drop triggers
DROP TRIGGER IF EXISTS certification_stages_updated_at_trigger ON certification_stages;
DROP TRIGGER IF EXISTS certification_slides_updated_at_trigger ON certification_slides;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_certification_stages_updated_at();
DROP FUNCTION IF EXISTS update_certification_slides_updated_at();

-- Drop RLS policies (they'll be dropped with tables, but explicit for safety)
DROP POLICY IF EXISTS certification_user_answers_select ON certification_user_answers;
DROP POLICY IF EXISTS certification_user_answers_insert ON certification_user_answers;
DROP POLICY IF EXISTS certification_user_answers_update ON certification_user_answers;
DROP POLICY IF EXISTS certification_user_answers_admin_select ON certification_user_answers;

DROP POLICY IF EXISTS certification_user_topic_progress_select ON certification_user_topic_progress;
DROP POLICY IF EXISTS certification_user_topic_progress_insert ON certification_user_topic_progress;
DROP POLICY IF EXISTS certification_user_topic_progress_update ON certification_user_topic_progress;
DROP POLICY IF EXISTS certification_user_topic_progress_admin_select ON certification_user_topic_progress;

DROP POLICY IF EXISTS certification_user_progress_select ON certification_user_progress;
DROP POLICY IF EXISTS certification_user_progress_insert ON certification_user_progress;
DROP POLICY IF EXISTS certification_user_progress_update ON certification_user_progress;
DROP POLICY IF EXISTS certification_user_progress_admin_select ON certification_user_progress;

DROP POLICY IF EXISTS certification_stages_select ON certification_stages;
DROP POLICY IF EXISTS certification_stages_insert ON certification_stages;
DROP POLICY IF EXISTS certification_stages_update ON certification_stages;
DROP POLICY IF EXISTS certification_stages_delete ON certification_stages;

DROP POLICY IF EXISTS certification_topics_select ON certification_topics;
DROP POLICY IF EXISTS certification_topics_insert ON certification_topics;
DROP POLICY IF EXISTS certification_topics_update ON certification_topics;
DROP POLICY IF EXISTS certification_topics_delete ON certification_topics;

DROP POLICY IF EXISTS certification_slides_select ON certification_slides;
DROP POLICY IF EXISTS certification_slides_insert ON certification_slides;
DROP POLICY IF EXISTS certification_slides_update ON certification_slides;
DROP POLICY IF EXISTS certification_slides_delete ON certification_slides;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS certification_user_answers CASCADE;
DROP TABLE IF EXISTS certification_user_topic_progress CASCADE;
DROP TABLE IF EXISTS certification_user_progress CASCADE;
DROP TABLE IF EXISTS certification_slides CASCADE;
DROP TABLE IF EXISTS certification_topics CASCADE;
DROP TABLE IF EXISTS certification_stages CASCADE;

-- Drop indexes (they'll be dropped with tables, but explicit for safety)
DROP INDEX IF EXISTS idx_certification_user_answers_user_stage;
DROP INDEX IF EXISTS idx_certification_user_answers_slide;
DROP INDEX IF EXISTS idx_certification_user_answers_attempt;
DROP INDEX IF EXISTS idx_certification_user_topic_progress_user_topic;
DROP INDEX IF EXISTS idx_certification_user_topic_progress_user_stage;
DROP INDEX IF EXISTS idx_certification_user_topic_progress_current_slide;
DROP INDEX IF EXISTS idx_certification_user_topic_progress_status;
DROP INDEX IF EXISTS idx_certification_user_topic_progress_slide_progress;
DROP INDEX IF EXISTS idx_certification_slides_topic_order;
DROP INDEX IF EXISTS certification_slides_topic_order_uniq;
DROP INDEX IF EXISTS ux_certification_topics_stage_title;

-- Migration: Add slide progress tracking with JSONB column
-- This adds granular tracking of which slides have been viewed/answered
-- to enforce sequential slide unlocking

-- Add slide_progress JSONB column to certification_user_topic_progress
ALTER TABLE certification_user_topic_progress 
ADD COLUMN IF NOT EXISTS slide_progress jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Create GIN index on slide_progress for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_certification_user_topic_progress_slide_progress 
ON certification_user_topic_progress USING gin (slide_progress);

-- Add comment explaining the structure
COMMENT ON COLUMN certification_user_topic_progress.slide_progress IS 
'JSONB object tracking slide progress: { "slideId": { "viewed": boolean, "answered": boolean, "viewedAt": "ISO timestamp" } }';


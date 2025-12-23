-- Migration: Add topic-level progress tracking with multiple attempts support
-- This adds granular tracking of user progress through certification topics,
-- including current slide position and support for multiple attempts per topic

-- Create certification_user_topic_progress table
-- Tracks individual topic attempts with current slide position
CREATE TABLE IF NOT EXISTS certification_user_topic_progress (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	stage_id uuid NOT NULL,
	topic_id uuid NOT NULL,
	attempt_number integer NOT NULL DEFAULT 1,
	current_slide_id uuid NULL,
	status text NOT NULL DEFAULT 'started',
	score_percentage integer NULL,
	started_at timestamp with time zone DEFAULT now() NOT NULL,
	completed_at timestamp with time zone NULL,
	passed_at timestamp with time zone NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT certification_user_topic_progress_user_stage_topic_attempt 
		UNIQUE(user_id, stage_id, topic_id, attempt_number),
	CONSTRAINT certification_user_topic_progress_status_check 
		CHECK (status = ANY (ARRAY['started'::text, 'in_progress'::text, 'completed'::text, 'passed'::text, 'failed'::text])),
	CONSTRAINT certification_user_topic_progress_user_id_fkey 
		FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
	CONSTRAINT certification_user_topic_progress_stage_id_fkey 
		FOREIGN KEY (stage_id) REFERENCES certification_stages(id) ON DELETE CASCADE,
	CONSTRAINT certification_user_topic_progress_topic_id_fkey 
		FOREIGN KEY (topic_id) REFERENCES certification_topics(id) ON DELETE CASCADE,
	CONSTRAINT certification_user_topic_progress_current_slide_id_fkey 
		FOREIGN KEY (current_slide_id) REFERENCES certification_slides(id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Create indexes on certification_user_topic_progress
-- Index for finding latest attempt for a user/topic
CREATE INDEX IF NOT EXISTS idx_certification_user_topic_progress_user_topic 
	ON certification_user_topic_progress USING btree (user_id ASC NULLS LAST, topic_id ASC NULLS LAST, attempt_number DESC NULLS LAST);

-- Index for stage-level queries
CREATE INDEX IF NOT EXISTS idx_certification_user_topic_progress_user_stage 
	ON certification_user_topic_progress USING btree (user_id ASC NULLS LAST, stage_id ASC NULLS LAST);

-- Index for current slide position queries
CREATE INDEX IF NOT EXISTS idx_certification_user_topic_progress_current_slide 
	ON certification_user_topic_progress USING btree (current_slide_id ASC NULLS LAST);

-- Index for finding in-progress attempts
CREATE INDEX IF NOT EXISTS idx_certification_user_topic_progress_status 
	ON certification_user_topic_progress USING btree (status ASC NULLS LAST) 
	WHERE status IN ('started', 'in_progress');

-- Add attempt_id column to certification_user_answers
-- Links answers to specific topic attempts
ALTER TABLE certification_user_answers 
ADD COLUMN IF NOT EXISTS attempt_id uuid NULL;

-- Add foreign key constraint for attempt_id
ALTER TABLE certification_user_answers 
ADD CONSTRAINT certification_user_answers_attempt_id_fkey 
	FOREIGN KEY (attempt_id) REFERENCES certification_user_topic_progress(id) ON DELETE CASCADE;

-- Create index on attempt_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_certification_user_answers_attempt 
	ON certification_user_answers USING btree (attempt_id ASC NULLS LAST);

-- Optional: Add last_updated_topic_id to stage-level progress for resume functionality
ALTER TABLE certification_user_progress 
ADD COLUMN IF NOT EXISTS last_updated_topic_id uuid NULL;

ALTER TABLE certification_user_progress 
ADD CONSTRAINT certification_user_progress_last_topic_id_fkey 
	FOREIGN KEY (last_updated_topic_id) REFERENCES certification_topics(id) ON DELETE SET NULL;

-- Enable Row Level Security on new table
ALTER TABLE certification_user_topic_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for certification_user_topic_progress
-- Users can only see their own topic progress
CREATE POLICY "certification_user_topic_progress_select"
ON certification_user_topic_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "certification_user_topic_progress_insert"
ON certification_user_topic_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "certification_user_topic_progress_update"
ON certification_user_topic_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Platform admins can view all topic progress
CREATE POLICY "certification_user_topic_progress_admin_select"
ON certification_user_topic_progress
FOR SELECT
TO authenticated
USING (
	has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- Note: RLS policies for certification_user_answers already exist
-- The attempt_id column will inherit the same access patterns
-- Users can only insert/update answers linked to their own attempts


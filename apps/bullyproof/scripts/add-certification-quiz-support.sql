-- Migration: Add quiz support to certification_slides and create user tracking tables
-- This adds quiz_data column and updates constraints, plus creates user answer/progress tracking

-- Add quiz_data column to certification_slides
ALTER TABLE certification_slides 
ADD COLUMN IF NOT EXISTS quiz_data jsonb;

-- Drop existing constraint
ALTER TABLE certification_slides DROP CONSTRAINT IF EXISTS certification_slides_payload_chk;

-- Create new constraint that allows quiz_data for quiz slides
ALTER TABLE certification_slides 
ADD CONSTRAINT certification_slides_payload_chk 
CHECK (
	((kind = 'image'::text) AND (image_url IS NOT NULL) AND (video_url IS NULL) AND (text_html IS NULL) AND (quiz_data IS NULL)) OR
	((kind = 'video'::text) AND (video_url IS NOT NULL) AND (image_url IS NULL) AND (text_html IS NULL) AND (quiz_data IS NULL)) OR
	((kind = 'quiz'::text) AND (quiz_data IS NOT NULL) AND (image_url IS NULL) AND (video_url IS NULL) AND (text_html IS NULL)) OR
	((kind = 'test'::text) AND (image_url IS NULL) AND (video_url IS NULL))
);

-- Create certification_user_answers table
CREATE TABLE IF NOT EXISTS certification_user_answers (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	stage_id uuid NOT NULL,
	topic_id uuid NOT NULL,
	slide_id uuid NOT NULL,
	answer_id text,
	is_correct boolean NOT NULL,
	time_taken integer,
	answered_at timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT certification_user_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
	CONSTRAINT certification_user_answers_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES certification_stages(id) ON DELETE CASCADE,
	CONSTRAINT certification_user_answers_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES certification_topics(id) ON DELETE CASCADE,
	CONSTRAINT certification_user_answers_slide_id_fkey FOREIGN KEY (slide_id) REFERENCES certification_slides(id) ON DELETE CASCADE
);

-- Create indexes on certification_user_answers
CREATE INDEX IF NOT EXISTS idx_certification_user_answers_user_stage 
ON certification_user_answers USING btree (user_id ASC NULLS LAST, stage_id ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_certification_user_answers_slide 
ON certification_user_answers USING btree (slide_id ASC NULLS LAST);

-- Create certification_user_progress table
CREATE TABLE IF NOT EXISTS certification_user_progress (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	stage_id uuid NOT NULL,
	status text NOT NULL DEFAULT 'started',
	progress_percentage integer NOT NULL DEFAULT 0,
	started_at timestamp with time zone DEFAULT now() NOT NULL,
	completed_at timestamp with time zone,
	updated_at timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT certification_user_progress_user_stage UNIQUE(user_id, stage_id),
	CONSTRAINT certification_user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
	CONSTRAINT certification_user_progress_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES certification_stages(id) ON DELETE CASCADE,
	CONSTRAINT certification_user_progress_status_check CHECK (status = ANY (ARRAY['started'::text, 'in_progress'::text, 'completed'::text]))
);

-- Enable RLS on new tables
ALTER TABLE certification_user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for certification_user_answers
-- Users can only see their own answers
CREATE POLICY "certification_user_answers_select"
ON certification_user_answers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "certification_user_answers_insert"
ON certification_user_answers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "certification_user_answers_update"
ON certification_user_answers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Platform admins can view all answers
CREATE POLICY "certification_user_answers_admin_select"
ON certification_user_answers
FOR SELECT
TO authenticated
USING (
	has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- RLS Policies for certification_user_progress
-- Users can only see their own progress
CREATE POLICY "certification_user_progress_select"
ON certification_user_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "certification_user_progress_insert"
ON certification_user_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "certification_user_progress_update"
ON certification_user_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Platform admins can view all progress
CREATE POLICY "certification_user_progress_admin_select"
ON certification_user_progress
FOR SELECT
TO authenticated
USING (
	has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);


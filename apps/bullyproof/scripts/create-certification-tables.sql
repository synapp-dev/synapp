-- Migration: Create certification tables
-- This creates a parallel structure to curriculum content for certification courses
-- Certification stages -> Certification topics -> Certification slides
-- Certification slides support: image, video, quiz, and test slide types

-- Create certification_stages table (similar to curriculum_stages)
CREATE TABLE IF NOT EXISTS "certification_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sort_index" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certification_stages_code_key" UNIQUE("code"),
	CONSTRAINT "certification_stages_name_key" UNIQUE("name"),
	CONSTRAINT "certification_stages_sort_index_key" UNIQUE("sort_index"),
	CONSTRAINT "certification_stages_code_chk" CHECK (code ~ '^C[0-9]*$'::text)
);

-- Create certification_topics table (similar to topics)
CREATE TABLE IF NOT EXISTS "certification_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"official_notes" text,
	"stage_order" smallint,
	CONSTRAINT "certification_topics_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])),
	CONSTRAINT "certification_topics_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "certification_stages"("id") ON DELETE RESTRICT
);

-- Create unique index on certification_topics (stage_id, lower(title))
CREATE UNIQUE INDEX IF NOT EXISTS "ux_certification_topics_stage_title" 
ON "certification_topics" USING btree ("stage_id", lower("title"));

-- Create certification_slides table (similar to topic_slides but with additional slide types)
CREATE TABLE IF NOT EXISTS "certification_slides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"kind" text NOT NULL,
	"text_html" text,
	"image_url" text,
	"video_url" text,
	"video_start_s" integer,
	"video_end_s" integer,
	"official_notes" text,
	"duration_sec" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certification_slides_unique_order" UNIQUE("topic_id","order_index"),
	CONSTRAINT "certification_slides_kind_check" CHECK (kind = ANY (ARRAY['image'::text, 'video'::text, 'quiz'::text, 'test'::text])),
	CONSTRAINT "certification_slides_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "certification_topics"("id") ON DELETE CASCADE
);

-- Create indexes on certification_slides
CREATE INDEX IF NOT EXISTS "idx_certification_slides_topic_order" 
ON "certification_slides" USING btree ("topic_id" ASC NULLS LAST, "order_index" ASC NULLS LAST);

CREATE UNIQUE INDEX IF NOT EXISTS "certification_slides_topic_order_uniq" 
ON "certification_slides" USING btree ("topic_id" ASC NULLS LAST, "order_index" ASC NULLS LAST);

-- Add payload validation check for certification_slides
-- Image slides require image_url
-- Video slides require video_url
-- Quiz and test slides may have text_html for content/instructions
ALTER TABLE "certification_slides" 
ADD CONSTRAINT "certification_slides_payload_chk" 
CHECK (
	((kind = 'image'::text) AND (image_url IS NOT NULL) AND (video_url IS NULL) AND (text_html IS NULL)) OR
	((kind = 'video'::text) AND (video_url IS NOT NULL) AND (image_url IS NULL) AND (text_html IS NULL)) OR
	((kind = 'quiz'::text) AND (image_url IS NULL) AND (video_url IS NULL)) OR
	((kind = 'test'::text) AND (image_url IS NULL) AND (video_url IS NULL))
);

-- Enable Row Level Security on certification tables
ALTER TABLE "certification_stages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "certification_topics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "certification_slides" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for certification_stages
-- Platform admins can do everything
-- Authenticated users can read published stages
CREATE POLICY "certification_stages_select"
ON "certification_stages"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "certification_stages_insert"
ON "certification_stages"
FOR INSERT
TO authenticated
WITH CHECK (
	has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "certification_stages_update"
ON "certification_stages"
FOR UPDATE
TO authenticated
USING (
	has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
)
WITH CHECK (
	has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "certification_stages_delete"
ON "certification_stages"
FOR DELETE
TO authenticated
USING (
	has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- RLS Policies for certification_topics
-- Platform admins can do everything
-- Authenticated users can read published topics
CREATE POLICY "certification_topics_select"
ON "certification_topics"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "certification_topics_insert"
ON "certification_topics"
FOR INSERT
TO authenticated
WITH CHECK (
	has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "certification_topics_update"
ON "certification_topics"
FOR UPDATE
TO authenticated
USING (
	has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
)
WITH CHECK (
	has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "certification_topics_delete"
ON "certification_topics"
FOR DELETE
TO authenticated
USING (
	has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- RLS Policies for certification_slides
-- Platform admins can do everything
-- Authenticated users can read slides (for published topics)
CREATE POLICY "certification_slides_select"
ON "certification_slides"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "certification_slides_insert"
ON "certification_slides"
FOR INSERT
TO authenticated
WITH CHECK (
	has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "certification_slides_update"
ON "certification_slides"
FOR UPDATE
TO authenticated
USING (
	has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
)
WITH CHECK (
	has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

CREATE POLICY "certification_slides_delete"
ON "certification_slides"
FOR DELETE
TO authenticated
USING (
	has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid)
);

-- Create trigger to update updated_at timestamp on certification_stages
CREATE OR REPLACE FUNCTION update_certification_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER certification_stages_updated_at_trigger
BEFORE UPDATE ON "certification_stages"
FOR EACH ROW
EXECUTE FUNCTION update_certification_stages_updated_at();

-- Create trigger to update updated_at timestamp on certification_slides
CREATE OR REPLACE FUNCTION update_certification_slides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER certification_slides_updated_at_trigger
BEFORE UPDATE ON "certification_slides"
FOR EACH ROW
EXECUTE FUNCTION update_certification_slides_updated_at();

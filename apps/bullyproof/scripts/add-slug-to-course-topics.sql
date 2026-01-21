-- Migration: Add slug column to course_topics table
-- This adds a slug column that is unique per course and populates it from existing titles

-- Step 1: Add slug column (nullable initially)
ALTER TABLE course_topics ADD COLUMN IF NOT EXISTS slug text;

-- Step 2: Create a function to generate slug from title
CREATE OR REPLACE FUNCTION create_slug_from_title(title_text text) RETURNS text AS $$
BEGIN
  RETURN lower(trim(regexp_replace(regexp_replace(regexp_replace(title_text, '[^\w\s-]', '', 'g'), '\s+', '-', 'g'), '-+', '-', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Populate slugs for existing topics, handling duplicates within each course
DO $$
DECLARE
  topic_record RECORD;
  base_slug text;
  final_slug text;
  counter integer;
  course_topics_cursor CURSOR FOR 
    SELECT id, course_id, title 
    FROM course_topics 
    ORDER BY course_id, course_order;
BEGIN
  FOR topic_record IN course_topics_cursor LOOP
    base_slug := create_slug_from_title(topic_record.title);
    final_slug := base_slug;
    counter := 1;
    
    -- Check if slug already exists for this course
    WHILE EXISTS (
      SELECT 1 
      FROM course_topics 
      WHERE course_id = topic_record.course_id 
        AND slug = final_slug 
        AND id != topic_record.id
    ) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter::text;
    END LOOP;
    
    -- Update the topic with the final slug
    UPDATE course_topics 
    SET slug = final_slug 
    WHERE id = topic_record.id;
  END LOOP;
END $$;

-- Step 4: Make slug column NOT NULL
ALTER TABLE course_topics ALTER COLUMN slug SET NOT NULL;

-- Step 5: Create unique constraint on (course_id, slug)
CREATE UNIQUE INDEX IF NOT EXISTS course_topics_course_slug_unique 
ON course_topics(course_id, slug);

-- Step 6: Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_course_topics_course_slug 
ON course_topics(course_id, slug);

-- Step 7: Drop the temporary function (optional, but clean)
DROP FUNCTION IF EXISTS create_slug_from_title(text);

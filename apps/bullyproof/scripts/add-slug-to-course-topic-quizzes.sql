-- Migration: Add slug column to course_topic_quizzes table
-- This adds a slug column that is unique per topic and populates it from existing titles

-- Step 1: Add slug column (nullable initially)
ALTER TABLE course_topic_quizzes ADD COLUMN IF NOT EXISTS slug text;

-- Step 2: Create a function to generate slug from title
CREATE OR REPLACE FUNCTION create_slug_from_title(title_text text) RETURNS text AS $$
BEGIN
  RETURN lower(trim(regexp_replace(regexp_replace(regexp_replace(title_text, '[^\w\s-]', '', 'g'), '\s+', '-', 'g'), '-+', '-', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Populate slugs for existing quizzes, handling duplicates within each topic
DO $$
DECLARE
  quiz_record RECORD;
  base_slug text;
  final_slug text;
  counter integer;
  course_topic_quizzes_cursor CURSOR FOR 
    SELECT id, topic_id, title 
    FROM course_topic_quizzes 
    ORDER BY topic_id, sort_order;
BEGIN
  FOR quiz_record IN course_topic_quizzes_cursor LOOP
    base_slug := create_slug_from_title(quiz_record.title);
    final_slug := base_slug;
    counter := 1;
    
    -- Check if slug already exists for this topic
    WHILE EXISTS (
      SELECT 1 
      FROM course_topic_quizzes 
      WHERE topic_id = quiz_record.topic_id 
        AND slug = final_slug 
        AND id != quiz_record.id
    ) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter::text;
    END LOOP;
    
    -- Update the quiz with the final slug
    UPDATE course_topic_quizzes 
    SET slug = final_slug 
    WHERE id = quiz_record.id;
  END LOOP;
END $$;

-- Step 4: Make slug column NOT NULL
ALTER TABLE course_topic_quizzes ALTER COLUMN slug SET NOT NULL;

-- Step 5: Create unique constraint on (topic_id, slug)
CREATE UNIQUE INDEX IF NOT EXISTS course_topic_quizzes_topic_slug_unique 
ON course_topic_quizzes(topic_id, slug);

-- Step 6: Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_course_topic_quizzes_topic_slug 
ON course_topic_quizzes(topic_id, slug);

-- Step 7: Drop the temporary function (optional, but clean)
DROP FUNCTION IF EXISTS create_slug_from_title(text);

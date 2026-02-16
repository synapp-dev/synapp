-- Add position column for future fractional indexing (Option C)
-- Nullable so we don't need to backfill; will use order_index until migration
ALTER TABLE topic_slides
  ADD COLUMN IF NOT EXISTS position text;

ALTER TABLE course_topic_slides
  ADD COLUMN IF NOT EXISTS position text;

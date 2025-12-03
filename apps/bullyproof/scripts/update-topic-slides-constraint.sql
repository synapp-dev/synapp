-- Update topic_slides constraint to allow null values for image_url and video_url
-- This allows slides to be created without URLs initially

-- Drop the existing constraint
ALTER TABLE topic_slides DROP CONSTRAINT IF EXISTS topic_slides_payload_chk;

-- Create new constraint that allows null values
ALTER TABLE topic_slides ADD CONSTRAINT topic_slides_payload_chk CHECK (
  (
    -- Text slide: text_html must be set, image_url and video_url must be null
    (kind = 'text'::text)
    AND (text_html IS NOT NULL)
    AND (image_url IS NULL)
    AND (video_url IS NULL)
  )
  OR (
    -- Image slide: image_url can be null or set, text_html and video_url must be null
    (kind = 'image'::text)
    AND (text_html IS NULL)
    AND (video_url IS NULL)
  )
  OR (
    -- Video slide: video_url can be null or set, text_html must be null
    (kind = 'video'::text)
    AND (text_html IS NULL)
  )
);

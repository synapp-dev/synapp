-- Create a view that combines topics with stage information, slide counts, and completion status
-- This view aggregates all the information needed for the topic selection dialog

CREATE OR REPLACE VIEW v_topics_with_completion AS
SELECT 
  t.id AS topic_id,
  t.title AS topic_title,
  t.official_notes AS topic_description,
  t.stage_order,
  t.status AS topic_status,
  t.created_at AS topic_created_at,
  
  -- Stage information
  cs.id AS stage_id,
  cs.code AS stage_code,
  cs.name AS stage_name,
  cs.sort_index AS stage_sort_index,
  
  -- Slide count
  COALESCE(slide_counts.slide_count, 0) AS slide_count,
  
  -- Classes that have completed this topic
  COALESCE(completed_classes.completed_class_ids, ARRAY[]::uuid[]) AS completed_class_ids,
  COALESCE(completed_classes.completed_class_names, ARRAY[]::text[]) AS completed_class_names

FROM topics t
INNER JOIN curriculum_stages cs ON t.stage_id = cs.id

-- Count slides per topic
LEFT JOIN (
  SELECT 
    topic_id,
    COUNT(*) AS slide_count
  FROM topic_slides
  GROUP BY topic_id
) slide_counts ON slide_counts.topic_id = t.id

-- Aggregate classes that have completed lessons for this topic
LEFT JOIN (
  SELECT 
    l.topic_id,
    array_agg(DISTINCT c.id ORDER BY c.id) AS completed_class_ids,
    array_agg(DISTINCT c.name ORDER BY c.name) AS completed_class_names
  FROM lessons l
  INNER JOIN lesson_classes lc ON l.id = lc.lesson_id
  INNER JOIN classes c ON lc.class_id = c.id
  WHERE l.status = 'completed'
  GROUP BY l.topic_id
) completed_classes ON completed_classes.topic_id = t.id

ORDER BY cs.sort_index, t.stage_order, t.title;

-- Add comment to the view
COMMENT ON VIEW v_topics_with_completion IS 'View combining topics with stage info, slide counts, and classes that have completed each topic';


-- Recreate v_lesson_slides_effective with position column and order by position
DROP VIEW IF EXISTS "public"."v_lesson_slides_effective";

CREATE VIEW "public"."v_lesson_slides_effective" AS
SELECT
  l.id AS lesson_id,
  l.topic_id,
  ts.id AS topic_slide_id,
  ts.order_index,
  ts.position,
  ts.kind,
  ts.text_html,
  ts.image_url,
  ts.video_url,
  ts.video_start_s,
  ts.video_end_s,
  COALESCE(lsn.notes_richtext, tsn.notes_richtext, ts.official_notes, t.official_notes) AS effective_notes,
  l.created_by_user_id AS teacher_user_id
FROM lessons l
JOIN topics t ON t.id = l.topic_id
JOIN topic_slides ts ON ts.topic_id = t.id
LEFT JOIN lesson_slide_notes lsn ON lsn.lesson_id = l.id AND lsn.topic_slide_id = ts.id
LEFT JOIN teacher_slide_notes tsn ON tsn.teacher_user_id = l.created_by_user_id AND tsn.topic_slide_id = ts.id
ORDER BY l.id, COALESCE(ts.position, 'z' || ts.order_index::text);

-- Recreate v_lesson_allowed_slides with position column and order by position
DROP VIEW IF EXISTS "public"."v_lesson_allowed_slides";

CREATE VIEW "public"."v_lesson_allowed_slides" AS
SELECT
  l.id AS lesson_id,
  ts.id AS topic_slide_id,
  ts.order_index,
  ts.position
FROM lessons l
JOIN topics t ON t.id = l.topic_id
JOIN topic_slides ts ON ts.topic_id = t.id
ORDER BY COALESCE(ts.position, 'z' || ts.order_index::text);

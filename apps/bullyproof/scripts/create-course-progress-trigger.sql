-- ============================================================================
-- TRIGGER: Auto-manage course_progress when course_topic_progress changes
-- ============================================================================
-- This trigger automatically creates/updates course_progress rows when
-- course_topic_progress is inserted or updated, ensuring course-level
-- progress tracking is always in sync with topic-level progress.

-- Helper function to sync course_progress for a specific user/course
-- This can be called directly (for backfill) or from the trigger
CREATE OR REPLACE FUNCTION sync_course_progress_for_user_course(
  p_user_id UUID,
  p_course_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_total_topics INTEGER;
  v_completed_topics INTEGER;
  v_max_completed_order INTEGER;
  v_progress_percentage INTEGER;
  v_status TEXT;
  v_next_topic_id UUID;
  v_next_topic_order INTEGER;
  v_course_progress_exists BOOLEAN;
BEGIN
  -- Get total topics for the course
  SELECT COUNT(*) INTO v_total_topics
  FROM course_topics
  WHERE course_id = p_course_id;

  -- Count completed topics for this user/course
  SELECT COUNT(*) INTO v_completed_topics
  FROM course_topic_progress
  WHERE user_id = p_user_id
    AND course_id = p_course_id
    AND status = 'completed';

  -- Get max completed topic order
  SELECT COALESCE(MAX(ct.course_order), 0) INTO v_max_completed_order
  FROM course_topic_progress ctp
  INNER JOIN course_topics ct ON ct.id = ctp.topic_id
  WHERE ctp.user_id = p_user_id
    AND ctp.course_id = p_course_id
    AND ctp.status = 'completed';

  -- Calculate progress percentage
  IF v_total_topics > 0 THEN
    v_progress_percentage := ROUND((v_completed_topics::NUMERIC / v_total_topics::NUMERIC) * 100);
  ELSE
    v_progress_percentage := 0;
  END IF;

  -- Determine status
  IF v_completed_topics = v_total_topics AND v_total_topics > 0 THEN
    v_status := 'completed';
  ELSIF v_completed_topics > 0 THEN
    v_status := 'in_progress';
  ELSE
    v_status := 'not_started';
  END IF;

  -- Find next topic to unlock (first topic after max completed order)
  SELECT id, course_order INTO v_next_topic_id, v_next_topic_order
  FROM course_topics
  WHERE course_id = p_course_id
    AND course_order > v_max_completed_order
    AND (is_sequential = false OR course_order = v_max_completed_order + 1)
  ORDER BY course_order
  LIMIT 1;

  -- Check if course_progress row exists
  SELECT EXISTS(
    SELECT 1 FROM course_progress
    WHERE user_id = p_user_id AND course_id = p_course_id
  ) INTO v_course_progress_exists;

  -- Get first topic if no next topic found (for initial state)
  IF v_next_topic_id IS NULL AND v_completed_topics = 0 THEN
    SELECT id, course_order INTO v_next_topic_id, v_next_topic_order
    FROM course_topics
    WHERE course_id = p_course_id
    ORDER BY course_order
    LIMIT 1;
  END IF;

  -- Insert or update course_progress
  IF v_course_progress_exists THEN
    UPDATE course_progress
    SET
      current_topic_id = v_next_topic_id,
      current_topic_order = v_next_topic_order,
      last_completed_topic_order = v_max_completed_order,
      completed_topics = v_completed_topics,
      progress_percentage = v_progress_percentage,
      status = v_status,
      completed_at = CASE WHEN v_status = 'completed' THEN NOW() ELSE completed_at END,
      started_at = COALESCE(started_at, CASE WHEN v_status != 'not_started' THEN NOW() END),
      updated_at = NOW()
    WHERE user_id = p_user_id AND course_id = p_course_id;
  ELSE
    INSERT INTO course_progress (
      user_id,
      course_id,
      current_topic_id,
      current_topic_order,
      last_completed_topic_order,
      total_topics,
      completed_topics,
      progress_percentage,
      status,
      started_at,
      completed_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_course_id,
      v_next_topic_id,
      v_next_topic_order,
      v_max_completed_order,
      v_total_topics,
      v_completed_topics,
      v_progress_percentage,
      v_status,
      CASE WHEN v_status != 'not_started' THEN NOW() END,
      CASE WHEN v_status = 'completed' THEN NOW() END,
      NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger function that calls the helper function
CREATE OR REPLACE FUNCTION sync_course_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_total_topics INTEGER;
  v_completed_topics INTEGER;
  v_max_completed_order INTEGER;
  v_progress_percentage INTEGER;
  v_status TEXT;
  v_next_topic_id UUID;
  v_next_topic_order INTEGER;
  v_course_progress_exists BOOLEAN;
BEGIN
  -- Get total topics for the course
  SELECT COUNT(*) INTO v_total_topics
  FROM course_topics
  WHERE course_id = NEW.course_id;

  -- Count completed topics for this user/course
  SELECT COUNT(*) INTO v_completed_topics
  FROM course_topic_progress
  WHERE user_id = NEW.user_id
    AND course_id = NEW.course_id
    AND status = 'completed';

  -- Get max completed topic order
  SELECT COALESCE(MAX(ct.course_order), 0) INTO v_max_completed_order
  FROM course_topic_progress ctp
  INNER JOIN course_topics ct ON ct.id = ctp.topic_id
  WHERE ctp.user_id = NEW.user_id
    AND ctp.course_id = NEW.course_id
    AND ctp.status = 'completed';

  -- Calculate progress percentage
  IF v_total_topics > 0 THEN
    v_progress_percentage := ROUND((v_completed_topics::NUMERIC / v_total_topics::NUMERIC) * 100);
  ELSE
    v_progress_percentage := 0;
  END IF;

  -- Determine status
  IF v_completed_topics = v_total_topics AND v_total_topics > 0 THEN
    v_status := 'completed';
  ELSIF v_completed_topics > 0 THEN
    v_status := 'in_progress';
  ELSE
    v_status := 'not_started';
  END IF;

  -- Find next topic to unlock (first topic after max completed order)
  SELECT id, course_order INTO v_next_topic_id, v_next_topic_order
  FROM course_topics
  WHERE course_id = NEW.course_id
    AND course_order > v_max_completed_order
    AND (is_sequential = false OR course_order = v_max_completed_order + 1)
  ORDER BY course_order
  LIMIT 1;

  -- Check if course_progress row exists
  SELECT EXISTS(
    SELECT 1 FROM course_progress
    WHERE user_id = NEW.user_id AND course_id = NEW.course_id
  ) INTO v_course_progress_exists;

  -- Get first topic if no next topic found (for initial state)
  IF v_next_topic_id IS NULL AND v_completed_topics = 0 THEN
    SELECT id, course_order INTO v_next_topic_id, v_next_topic_order
    FROM course_topics
    WHERE course_id = NEW.course_id
    ORDER BY course_order
    LIMIT 1;
  END IF;

  -- Insert or update course_progress
  IF v_course_progress_exists THEN
    UPDATE course_progress
    SET
      current_topic_id = v_next_topic_id,
      current_topic_order = v_next_topic_order,
      last_completed_topic_order = v_max_completed_order,
      completed_topics = v_completed_topics,
      progress_percentage = v_progress_percentage,
      status = v_status,
      completed_at = CASE WHEN v_status = 'completed' THEN NOW() ELSE completed_at END,
      started_at = COALESCE(started_at, CASE WHEN v_status != 'not_started' THEN NOW() END),
      updated_at = NOW()
    WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
  ELSE
    INSERT INTO course_progress (
      user_id,
      course_id,
      current_topic_id,
      current_topic_order,
      last_completed_topic_order,
      total_topics,
      completed_topics,
      progress_percentage,
      status,
      started_at,
      completed_at,
      updated_at
    ) VALUES (
      NEW.user_id,
      NEW.course_id,
      v_next_topic_id,
      v_next_topic_order,
      v_max_completed_order,
      v_total_topics,
      v_completed_topics,
      v_progress_percentage,
      v_status,
      CASE WHEN v_status != 'not_started' THEN NOW() END,
      CASE WHEN v_status = 'completed' THEN NOW() END,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on INSERT (fires for any new topic progress)
DROP TRIGGER IF EXISTS trigger_sync_course_progress_insert ON course_topic_progress;
CREATE TRIGGER trigger_sync_course_progress_insert
  AFTER INSERT ON course_topic_progress
  FOR EACH ROW
  EXECUTE FUNCTION sync_course_progress();

-- Create trigger on UPDATE (fires when status changes or any update)
DROP TRIGGER IF EXISTS trigger_sync_course_progress_update ON course_topic_progress;
CREATE TRIGGER trigger_sync_course_progress_update
  AFTER UPDATE ON course_topic_progress
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.course_id IS DISTINCT FROM NEW.course_id)
  EXECUTE FUNCTION sync_course_progress();

-- ============================================================================
-- BACKFILL: Create course_progress rows for existing topic progress
-- ============================================================================
-- This will create course_progress rows for any users who have topic progress
-- but no course_progress row yet.

DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Loop through each user/course combination that has topic progress but no course_progress
  FOR rec IN
    SELECT DISTINCT user_id, course_id
    FROM course_topic_progress
    WHERE NOT EXISTS (
      SELECT 1 FROM course_progress
      WHERE course_progress.user_id = course_topic_progress.user_id
        AND course_progress.course_id = course_topic_progress.course_id
    )
  LOOP
    -- Call the helper function directly to sync course_progress
    PERFORM sync_course_progress_for_user_course(rec.user_id, rec.course_id);
  END LOOP;
END $$;

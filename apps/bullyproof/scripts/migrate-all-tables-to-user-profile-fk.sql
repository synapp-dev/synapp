-- Migration: Change all foreign keys from auth.users(id) to user_profile(id)
-- This is safe because user_profile.id = auth.users.id (same UUID)
-- Only user_profile itself should reference auth.users.id

-- 1. slide_viewing_sessions
ALTER TABLE slide_viewing_sessions 
DROP CONSTRAINT IF EXISTS slide_viewing_sessions_user_id_fkey;
ALTER TABLE slide_viewing_sessions
ADD CONSTRAINT slide_viewing_sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE;

-- 2. course_topic_progress
ALTER TABLE course_topic_progress 
DROP CONSTRAINT IF EXISTS course_topic_progress_user_id_fkey;
ALTER TABLE course_topic_progress
ADD CONSTRAINT course_topic_progress_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE;

-- 3. lesson_feedback
ALTER TABLE lesson_feedback 
DROP CONSTRAINT IF EXISTS lesson_feedback_teacher_user_id_fkey;
ALTER TABLE lesson_feedback
ADD CONSTRAINT lesson_feedback_teacher_user_id_fkey 
FOREIGN KEY (teacher_user_id) REFERENCES user_profile(id);

-- 4. user_slide_views
ALTER TABLE user_slide_views 
DROP CONSTRAINT IF EXISTS user_slide_views_user_id_fkey;
ALTER TABLE user_slide_views
ADD CONSTRAINT user_slide_views_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE;

-- 5. quiz_attempts
ALTER TABLE quiz_attempts 
DROP CONSTRAINT IF EXISTS quiz_attempts_user_id_fkey;
ALTER TABLE quiz_attempts
ADD CONSTRAINT quiz_attempts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE;

-- 6. lessons
ALTER TABLE lessons 
DROP CONSTRAINT IF EXISTS lessons_created_by_user_id_fkey;
ALTER TABLE lessons
ADD CONSTRAINT lessons_created_by_user_id_fkey 
FOREIGN KEY (created_by_user_id) REFERENCES user_profile(id);

-- 7. lesson_live_state
ALTER TABLE lesson_live_state 
DROP CONSTRAINT IF EXISTS lesson_live_state_updated_by_fkey;
ALTER TABLE lesson_live_state
ADD CONSTRAINT lesson_live_state_updated_by_fkey 
FOREIGN KEY (updated_by) REFERENCES user_profile(id);

-- 8. user_roles
ALTER TABLE user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE user_roles
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE;

-- 9. lesson_sessions
ALTER TABLE lesson_sessions 
DROP CONSTRAINT IF EXISTS lesson_sessions_started_by_fkey;
ALTER TABLE lesson_sessions
ADD CONSTRAINT lesson_sessions_started_by_fkey 
FOREIGN KEY (started_by) REFERENCES user_profile(id);

-- 10. lesson_events
ALTER TABLE lesson_events 
DROP CONSTRAINT IF EXISTS lesson_events_actor_user_id_fkey;
ALTER TABLE lesson_events
ADD CONSTRAINT lesson_events_actor_user_id_fkey 
FOREIGN KEY (actor_user_id) REFERENCES user_profile(id);

-- 11. course_progress
ALTER TABLE course_progress 
DROP CONSTRAINT IF EXISTS course_progress_user_id_fkey;
ALTER TABLE course_progress
ADD CONSTRAINT course_progress_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE;

-- 12. course_topic_quiz_completions
ALTER TABLE course_topic_quiz_completions 
DROP CONSTRAINT IF EXISTS course_topic_quiz_completions_user_id_fkey;
ALTER TABLE course_topic_quiz_completions
ADD CONSTRAINT course_topic_quiz_completions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE;

-- 13. course_ratings
ALTER TABLE course_ratings 
DROP CONSTRAINT IF EXISTS course_ratings_user_id_fkey;
ALTER TABLE course_ratings
ADD CONSTRAINT course_ratings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE;

-- 14. teacher_slide_notes
ALTER TABLE teacher_slide_notes 
DROP CONSTRAINT IF EXISTS teacher_slide_notes_teacher_user_id_fkey;
ALTER TABLE teacher_slide_notes
ADD CONSTRAINT teacher_slide_notes_teacher_user_id_fkey 
FOREIGN KEY (teacher_user_id) REFERENCES user_profile(id) ON DELETE CASCADE;

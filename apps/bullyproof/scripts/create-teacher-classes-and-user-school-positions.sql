-- Migration: Create teacher_classes and user_school_positions tables
-- 
-- This migration creates two new tables:
-- 1. teacher_classes: Many-to-many junction table linking teachers (user_profile) to classes
--    - Allows multiple teachers to be assigned to multiple classes
--    - Since classes already have school_id, we don't need to store it here
-- 2. user_school_positions: Stores position information for users at specific schools
--    - Allows storing additional metadata like "Deputy Principal", "Teacher Aide", etc.
--    - Can have up to 2 positions per user per school (enforced via trigger)

-- Create teacher_classes table (many-to-many junction table)
CREATE TABLE IF NOT EXISTS public.teacher_classes (
    user_id UUID NOT NULL,
    class_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT teacher_classes_pkey PRIMARY KEY (user_id, class_id),
    CONSTRAINT teacher_classes_user_id_fkey FOREIGN KEY (user_id) 
        REFERENCES public.user_profile(id) ON DELETE CASCADE,
    CONSTRAINT teacher_classes_class_id_fkey FOREIGN KEY (class_id) 
        REFERENCES public.classes(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_teacher_classes_user_id 
    ON public.teacher_classes USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_class_id 
    ON public.teacher_classes USING btree (class_id);

-- Add comments
COMMENT ON TABLE public.teacher_classes IS 'Junction table linking teachers to classes. Allows multiple teachers to be assigned to multiple classes.';
COMMENT ON COLUMN public.teacher_classes.user_id IS 'Reference to user_profile.id (the teacher)';
COMMENT ON COLUMN public.teacher_classes.class_id IS 'Reference to classes.id. The class already has school_id, so we don''t need to store it here.';

-- Create user_school_positions table
CREATE TABLE IF NOT EXISTS public.user_school_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    user_id UUID NOT NULL,
    school_id UUID NOT NULL,
    position TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT user_school_positions_user_id_fkey FOREIGN KEY (user_id) 
        REFERENCES public.user_profile(id) ON DELETE CASCADE,
    CONSTRAINT user_school_positions_school_id_fkey FOREIGN KEY (school_id) 
        REFERENCES public.schools(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_school_positions_user_id 
    ON public.user_school_positions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_school_positions_school_id 
    ON public.user_school_positions USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_user_school_positions_user_school 
    ON public.user_school_positions USING btree (user_id, school_id);

-- Add comments
COMMENT ON TABLE public.user_school_positions IS 'Stores position information for users at specific schools (e.g., "Deputy Principal", "Teacher Aide"). Maximum of 2 positions per user per school.';
COMMENT ON COLUMN public.user_school_positions.user_id IS 'Reference to user_profile.id';
COMMENT ON COLUMN public.user_school_positions.school_id IS 'Reference to schools.id';
COMMENT ON COLUMN public.user_school_positions.position IS 'Position title (e.g., "Deputy Principal", "Teacher Aide", "Learning Support Officer")';

-- Create trigger function to enforce max 2 positions per user per school
CREATE OR REPLACE FUNCTION enforce_max_positions_per_user_school()
RETURNS TRIGGER AS $$
DECLARE
    position_count INTEGER;
BEGIN
    -- Count existing positions for this user-school combination
    -- Exclude the current row if this is an UPDATE
    SELECT COUNT(*) INTO position_count
    FROM public.user_school_positions
    WHERE user_id = NEW.user_id 
      AND school_id = NEW.school_id
      AND (TG_OP = 'INSERT' OR id != NEW.id);
    
    -- Check if adding this row would exceed the limit
    IF position_count >= 2 THEN
        RAISE EXCEPTION 'Maximum of 2 positions allowed per user per school. User % already has % position(s) at school %.', 
            NEW.user_id, position_count, NEW.school_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the constraint
DROP TRIGGER IF EXISTS check_max_positions_per_user_school ON public.user_school_positions;
CREATE TRIGGER check_max_positions_per_user_school
    BEFORE INSERT OR UPDATE ON public.user_school_positions
    FOR EACH ROW
    EXECUTE FUNCTION enforce_max_positions_per_user_school();

-- Add comment to the function
COMMENT ON FUNCTION enforce_max_positions_per_user_school() IS 
    'Enforces maximum of 2 positions per user per school constraint';

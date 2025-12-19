-- Updated trigger function to automatically create user_profile when auth.users is inserted
-- This function creates a new row in user_profile with the same ID and email from auth.users
-- This should be run once in Supabase to replace the existing trigger

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into user_profile table
  -- Using NEW.id as the primary key (matching auth.users.id)
  -- Email is taken from NEW.email
  INSERT INTO public.user_profile (
    id,
    email,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


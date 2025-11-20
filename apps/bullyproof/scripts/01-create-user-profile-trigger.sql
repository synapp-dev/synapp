-- Trigger function to automatically create user_profile when auth.users is inserted
-- This should be run once in Supabase before creating teacher accounts

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  email_prefix text;
  first_name text;
BEGIN
  -- Extract the part before @ from email
  email_prefix := split_part(NEW.email, '@', 1);
  
  -- Extract first word from email prefix (before any dots or underscores)
  first_name := split_part(split_part(email_prefix, '.', 1), '_', 1);
  
  -- Insert into user_profile table
  INSERT INTO public.user_profile (
    id,
    first_name,
    last_name,
    email,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    first_name,
    'Teacher',
    NEW.email,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

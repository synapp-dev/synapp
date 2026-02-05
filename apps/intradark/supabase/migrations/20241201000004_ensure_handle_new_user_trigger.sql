-- Ensure trigger exists that creates user_profiles row on auth.users INSERT
-- (Copies auth.users.id -> user_profiles.user_id and auth.users.email -> user_profiles.email)
-- Run this if the trigger was missing or failed; idempotent.

-- Drop trigger if it exists (so we can recreate it)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate function: insert user_profiles row with user_id and email from auth.users
-- ON CONFLICT so we don't fail if row already exists (e.g. app created it)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

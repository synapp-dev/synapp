-- Sync email from auth.users to user_profiles when email is updated
CREATE OR REPLACE FUNCTION public.sync_email_to_user_profiles()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.user_profiles
    SET email = NEW.email,
        updated_at = NOW()
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run when auth.users email is updated
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_email_to_user_profiles();

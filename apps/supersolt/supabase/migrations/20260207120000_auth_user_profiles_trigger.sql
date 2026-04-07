-- Auto-create public.user_profiles when a row is inserted into auth.users.
-- SECURITY DEFINER with fixed search_path so the trigger can insert despite RLS on user_profiles.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_first text;
  v_last text;
  v_full text;
  v_avatar text;
BEGIN
  v_first := NULLIF(btrim(meta ->> 'first_name'), '');
  IF v_first IS NULL THEN
    v_first := NULLIF(btrim(meta ->> 'given_name'), '');
  END IF;
  v_last := NULLIF(btrim(meta ->> 'last_name'), '');
  v_full := NULLIF(btrim(meta ->> 'full_name'), '');
  IF v_full IS NULL THEN
    v_full := NULLIF(btrim(meta ->> 'name'), '');
  END IF;
  v_avatar := NULLIF(btrim(meta ->> 'avatar_url'), '');

  INSERT INTO public.user_profiles (id, email, first_name, last_name, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    v_first,
    v_last,
    v_full,
    v_avatar
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.user_profiles.last_name),
    full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.user_profiles.avatar_url),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_user_profiles ON auth.users;

CREATE TRIGGER on_auth_user_created_user_profiles
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

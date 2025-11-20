-- Function to create users (run this first if it doesn't exist)
CREATE OR REPLACE FUNCTION public.create_user(
    email text,
    password text
) RETURNS void AS $$
  declare
  user_id uuid;
  encrypted_pw text;
BEGIN
  user_id := gen_random_uuid();
  encrypted_pw := crypt(password, gen_salt('bf'));
  
  INSERT INTO auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES
    ('00000000-0000-0000-0000-000000000000', user_id, 'authenticated', 'authenticated', email, encrypted_pw, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '');
  
  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), user_id, format('{"sub":"%s","email":"%s"}', user_id::text, email)::jsonb, 'email', NOW(), NOW(), NOW());
END;
$$ LANGUAGE plpgsql;

-- Creating teacher account for test school email
SELECT create_user('teacher@test.edu.au', 'bullyproof');

-- Creating teacher account for Testing School AG
SELECT create_user('teacher@testing.edu.au', 'bullyproof');

-- Creating teacher account for Amamoor State School
SELECT create_user('teacher@amamoor.edu.au', 'bullyproof');

-- Creating teacher account for Ipswich Girls' Grammar School
SELECT create_user('teacher@ipswichgirls.edu.au', 'bullyproof');

-- Creating teacher account for Coominya State School
SELECT create_user('teacher@coominya.edu.au', 'bullyproof');

-- Creating teacher account for Albert State School
SELECT create_user('teacher@albert.edu.au', 'bullyproof');

-- Creating teacher account for Tamrookum State School
SELECT create_user('teacher@tamrookum.edu.au', 'bullyproof');

-- Creating teacher account for McIlwraith State School
SELECT create_user('teacher@mcilwraith.edu.au', 'bullyproof');

-- Creating teacher account for Mount Molloy State School
SELECT create_user('teacher@mountmolloy.edu.au', 'bullyproof');

-- Creating teacher account for Booyal Central State School
SELECT create_user('teacher@booyal.edu.au', 'bullyproof');

-- Creating teacher account for Monkland State School
SELECT create_user('teacher@monkland.edu.au', 'bullyproof');

-- Creating teacher account for Tagai State College
SELECT create_user('teacher@tagai.edu.au', 'bullyproof');

-- Creating teacher account for Bauple State School
SELECT create_user('teacher@bauple.edu.au', 'bullyproof');

-- Creating teacher account for Gleneagle State School
SELECT create_user('teacher@gleneagle.edu.au', 'bullyproof');

-- Creating teacher account for Bluff State School
SELECT create_user('teacher@bluff.edu.au', 'bullyproof');

-- Creating teacher account for St John Fisher College
SELECT create_user('teacher@stjohn.edu.au', 'bullyproof');

-- Creating teacher account for Mt Maria College
SELECT create_user('teacher@mtmaria.edu.au', 'bullyproof');

-- Creating teacher account for Kepnock State High School
SELECT create_user('teacher@kepnock.edu.au', 'bullyproof');

-- Creating teacher account for Harristown State High school
SELECT create_user('teacher@harristown.edu.au', 'bullyproof');

-- Creating teacher account for Sample State School
SELECT create_user('teacher@sample.edu.au', 'bullyproof');

-- Creating teacher account for Bremer State High School
SELECT create_user('teacher@bremer.edu.au', 'bullyproof');

-- Creating teacher account for Marmor State School
SELECT create_user('teacher@marmor.edu.au', 'bullyproof');

-- Creating teacher account for Moranbah State High School
SELECT create_user('teacher@moranbah.edu.au', 'bullyproof');

-- Creating teacher account for Wallaville State School
SELECT create_user('teacher@wallaville.edu.au', 'bullyproof');

-- Creating teacher account for Vincent State School
SELECT create_user('teacher@vincent.edu.au', 'bullyproof');

-- Creating teacher account for Tingoora State School
SELECT create_user('teacher@tingoora.edu.au', 'bullyproof');

-- Creating teacher account for Tiaro State School
SELECT create_user('teacher@tiaro.edu.au', 'bullyproof');

-- Creating teacher account for The Caves State School
SELECT create_user('teacher@thecaves.edu.au', 'bullyproof');

-- Creating teacher account for Thangool State School
SELECT create_user('teacher@thangool.edu.au', 'bullyproof');

-- Creating teacher account for Stanwell State School
SELECT create_user('teacher@stanwell.edu.au', 'bullyproof');

-- Creating teacher account for Southport State School
SELECT create_user('teacher@southport.edu.au', 'bullyproof');

-- Creating teacher account for Our Lady of the Sacred Heart
SELECT create_user('teacher@ourlady.edu.au', 'bullyproof');

-- Creating teacher account for Millaroo State School
SELECT create_user('teacher@millaroo.edu.au', 'bullyproof');

-- Creating teacher account for Hambledon State School
SELECT create_user('teacher@hambledon.edu.au', 'bullyproof');

-- Creating teacher account for Haigslea State School
SELECT create_user('teacher@haigslea.edu.au', 'bullyproof');

-- Creating teacher account for Grovely State School
SELECT create_user('teacher@grovely.edu.au', 'bullyproof');

-- Creating teacher account for Gin Gin State High School
SELECT create_user('teacher@gingin.edu.au', 'bullyproof');

-- Creating teacher account for Elliot Heads State School
SELECT create_user('teacher@elliotheads.edu.au', 'bullyproof');

-- Creating teacher account for Garbutt State School
SELECT create_user('teacher@garbutt.edu.au', 'bullyproof');

-- Creating teacher account for Coombabah State High School
SELECT create_user('teacher@coombabah.edu.au', 'bullyproof');

-- Creating teacher account for Clare State School
SELECT create_user('teacher@clare.edu.au', 'bullyproof');

-- Creating teacher account for Bundaberg East State School
SELECT create_user('teacher@bundaberg.edu.au', 'bullyproof');

-- Creating teacher account for Biboohra State School
SELECT create_user('teacher@biboohra.edu.au', 'bullyproof');

-- Creating teacher account for Berrinba East State School
SELECT create_user('teacher@berrinba.edu.au', 'bullyproof');

-- Creating teacher account for Airville State School
SELECT create_user('teacher@airville.edu.au', 'bullyproof');

-- Creating teacher account for test school 1
SELECT create_user('teacher@test.edu.au', 'bullyproof');

-- Creating teacher account for School
SELECT create_user('teacher@school.edu.au', 'bullyproof');
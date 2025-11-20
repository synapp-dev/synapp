-- Creating teacher account for Amamoor State School
SELECT create_user('teacher@amamoorstate.edu.au', 'bullyproof');

-- Creating teacher account for Ipswich Girls Grammar School
SELECT create_user('teacher@ipswichgirls.edu.au', 'bullyproof');

-- Creating teacher account for Coominya State School
SELECT create_user('teacher@coominyastate.edu.au', 'bullyproof');

-- Creating teacher account for Albert State School
SELECT create_user('teacher@albertstate.edu.au', 'bullyproof');

-- Creating teacher account for Tamrookum State School
SELECT create_user('teacher@tamrookumstate.edu.au', 'bullyproof');

-- Creating teacher account for McIlwraith State School
SELECT create_user('teacher@mcilwraithstate.edu.au', 'bullyproof');

-- Creating teacher account for Mount Molloy State School
SELECT create_user('teacher@mountmolloy.edu.au', 'bullyproof');

-- Creating teacher account for Booyal Central State School
SELECT create_user('teacher@booyalcentral.edu.au', 'bullyproof');

-- Creating teacher account for Monkland State School
SELECT create_user('teacher@monklandstate.edu.au', 'bullyproof');

-- Creating teacher account for Tagai State College
SELECT create_user('teacher@tagaistate.edu.au', 'bullyproof');

-- Creating teacher account for Bauple State School
SELECT create_user('teacher@bauplestate.edu.au', 'bullyproof');

-- Creating teacher account for Gleneagle State School
SELECT create_user('teacher@gleneaglestate.edu.au', 'bullyproof');

-- Creating teacher account for Bluff State School
SELECT create_user('teacher@bluffstate.edu.au', 'bullyproof');

-- Creating teacher account for St John Fisher College
SELECT create_user('teacher@stjohn.edu.au', 'bullyproof');

-- Creating teacher account for Mt Maria College
SELECT create_user('teacher@mtmaria.edu.au', 'bullyproof');

-- Creating teacher account for Kepnock State High School
SELECT create_user('teacher@kepnockstate.edu.au', 'bullyproof');

-- Creating teacher account for Harristown State High school
SELECT create_user('teacher@harristownstate.edu.au', 'bullyproof');

-- Creating teacher account for Bremer State High School
SELECT create_user('teacher@bremerstate.edu.au', 'bullyproof');

-- Creating teacher account for Marmor State School
SELECT create_user('teacher@marmorstate.edu.au', 'bullyproof');

-- Creating teacher account for Moranbah State High School
SELECT create_user('teacher@moranbahstate.edu.au', 'bullyproof');

-- Creating teacher account for Wallaville State School
SELECT create_user('teacher@wallavillestate.edu.au', 'bullyproof');

-- Creating teacher account for Vincent State School
SELECT create_user('teacher@vincentstate.edu.au', 'bullyproof');

-- Creating teacher account for Tingoora State School
SELECT create_user('teacher@tingoorastate.edu.au', 'bullyproof');

-- Creating teacher account for Tiaro State School
SELECT create_user('teacher@tiarostate.edu.au', 'bullyproof');

-- Creating teacher account for The Caves State School
SELECT create_user('teacher@thecaves.edu.au', 'bullyproof');

-- Creating teacher account for Thangool State School
SELECT create_user('teacher@thangoolstate.edu.au', 'bullyproof');

-- Creating teacher account for Stanwell State School
SELECT create_user('teacher@stanwellstate.edu.au', 'bullyproof');

-- Creating teacher account for Southport State School
SELECT create_user('teacher@southportstate.edu.au', 'bullyproof');

-- Creating teacher account for Our Lady of the Sacred Heart
SELECT create_user('teacher@ourlady.edu.au', 'bullyproof');

-- Creating teacher account for Millaroo State School
SELECT create_user('teacher@millaroostate.edu.au', 'bullyproof');

-- Creating teacher account for Hambledon State School
SELECT create_user('teacher@hambledonstate.edu.au', 'bullyproof');

-- Creating teacher account for Haigslea State School
SELECT create_user('teacher@haigsleastate.edu.au', 'bullyproof');

-- Creating teacher account for Grovely State School
SELECT create_user('teacher@grovelystate.edu.au', 'bullyproof');

-- Creating teacher account for Gin Gin State High School
SELECT create_user('teacher@gingin.edu.au', 'bullyproof');

-- Creating teacher account for Elliot Heads State School
SELECT create_user('teacher@elliotheads.edu.au', 'bullyproof');

-- Creating teacher account for Garbutt State School
SELECT create_user('teacher@garbuttstate.edu.au', 'bullyproof');

-- Creating teacher account for Coombabah State High School
SELECT create_user('teacher@coombabahstate.edu.au', 'bullyproof');

-- Creating teacher account for Clare State School
SELECT create_user('teacher@clarestate.edu.au', 'bullyproof');

-- Creating teacher account for Bundaberg East State School
SELECT create_user('teacher@bundabergeast.edu.au', 'bullyproof');

-- Creating teacher account for Biboohra State School
SELECT create_user('teacher@biboohrastate.edu.au', 'bullyproof');

-- Creating teacher account for Berrinba East State School
SELECT create_user('teacher@berrinbaeast.edu.au', 'bullyproof');

-- Creating teacher account for Airville State School
SELECT create_user('teacher@airvillestate.edu.au', 'bullyproof');

-- Role Assignments

-- Assigning TEACHER role for Amamoor State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  'a16adb3e-8a37-44df-8ed2-ce2f08ce40bd'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@amamoorstate.edu.au';

-- Assigning TEACHER role for Ipswich Girls Grammar School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '16ec101e-2aa5-410e-bfc1-7d018120f2a1'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@ipswichgirls.edu.au';

-- Assigning TEACHER role for Coominya State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '3ad7f586-143c-4939-907e-701a72fe068e'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@coominyastate.edu.au';

-- Assigning TEACHER role for Albert State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '040f67cc-71cd-4f84-baed-48135bcaeaba'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@albertstate.edu.au';

-- Assigning TEACHER role for Tamrookum State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '1d293e2e-e1b2-4430-b885-f31880156cf0'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@tamrookumstate.edu.au';

-- Assigning TEACHER role for McIlwraith State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '5a656e4b-dfa4-4001-9aa9-2e07ecab34dd'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@mcilwraithstate.edu.au';

-- Assigning TEACHER role for Mount Molloy State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '128344c9-b282-468c-88bb-cd9a51489b23'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@mountmolloy.edu.au';

-- Assigning TEACHER role for Booyal Central State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  'c339d241-36e7-47af-ad2d-402103fb5974'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@booyalcentral.edu.au';

-- Assigning TEACHER role for Monkland State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  'aeea5eed-8ccc-4e65-ba53-c77447ae8230'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@monklandstate.edu.au';

-- Assigning TEACHER role for Tagai State College
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '65738baf-25c2-4324-9687-8647ce32f98c'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@tagaistate.edu.au';

-- Assigning TEACHER role for Bauple State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  'a760af0a-84d1-48fa-988c-39088c607fac'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@bauplestate.edu.au';

-- Assigning TEACHER role for Gleneagle State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '0739f47a-36ce-4ccd-9088-a4db9f52d691'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@gleneaglestate.edu.au';

-- Assigning TEACHER role for Bluff State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '76d8bc42-6f95-47ef-a968-241844cf2a2c'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@bluffstate.edu.au';

-- Assigning TEACHER role for St John Fisher College
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '38c5d740-1091-4553-b86b-dd97a941cebb'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@stjohn.edu.au';

-- Assigning TEACHER role for Mt Maria College
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  'bbf57732-5aa5-4f04-bff8-42b5926401a0'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@mtmaria.edu.au';

-- Assigning TEACHER role for Kepnock State High School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  'e340a7c3-9a01-4263-bd1f-8baa60af13f2'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@kepnockstate.edu.au';

-- Assigning TEACHER role for Harristown State High school
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '923cd3bd-fc88-435b-899f-3d238631bc98'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@harristownstate.edu.au';

-- Assigning TEACHER role for Bremer State High School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '584a32da-a469-42fe-8d28-e246c13159de'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@bremerstate.edu.au';

-- Assigning TEACHER role for Marmor State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '8065e3ad-e693-4a70-9a0a-bf93a5e37a8b'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@marmorstate.edu.au';

-- Assigning TEACHER role for Moranbah State High School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  'b464a755-98d2-4ac2-a97b-915324a73f19'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@moranbahstate.edu.au';

-- Assigning TEACHER role for Wallaville State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  'c0919686-267b-43bf-8ffb-69d4ddab6d93'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@wallavillestate.edu.au';

-- Assigning TEACHER role for Vincent State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '446442b2-e729-43bd-993c-5966843353c8'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@vincentstate.edu.au';

-- Assigning TEACHER role for Tingoora State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '8d2aa1a5-f138-4e1b-93aa-2473cf983c13'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@tingoorastate.edu.au';

-- Assigning TEACHER role for Tiaro State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '1563cc48-943b-4f7d-b00b-f2805329ab09'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@tiarostate.edu.au';

-- Assigning TEACHER role for The Caves State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '0ecf6eb3-f864-4108-ab20-3db5fb4becef'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@thecaves.edu.au';

-- Assigning TEACHER role for Thangool State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  'be182d8a-492c-40d3-a71c-c997fb5fdea8'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@thangoolstate.edu.au';

-- Assigning TEACHER role for Stanwell State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  'af059028-20bb-4aa9-bb3a-04f40234acee'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@stanwellstate.edu.au';

-- Assigning TEACHER role for Southport State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '942359c4-86f0-4341-8bca-dd5af0376a58'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@southportstate.edu.au';

-- Assigning TEACHER role for Our Lady of the Sacred Heart
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '52cce0bf-4edf-48ef-bf9f-e8938b941849'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@ourlady.edu.au';

-- Assigning TEACHER role for Millaroo State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '8e96ab6c-e237-4c41-89ff-cecf71a6be99'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@millaroostate.edu.au';

-- Assigning TEACHER role for Hambledon State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '29f42760-1731-4454-970d-ecc28952ed9c'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@hambledonstate.edu.au';

-- Assigning TEACHER role for Haigslea State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  'aacaadb7-9a1b-43e2-b191-3753f16b47ad'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@haigsleastate.edu.au';

-- Assigning TEACHER role for Grovely State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '5147db17-e765-4939-9bcf-0c4974bbdfe5'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@grovelystate.edu.au';

-- Assigning TEACHER role for Gin Gin State High School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '46f9a3e7-75f4-4882-a1e1-bf57059d7485'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@gingin.edu.au';

-- Assigning TEACHER role for Elliot Heads State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '496d8e88-8436-45ce-9e28-0e30f6918bf6'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@elliotheads.edu.au';

-- Assigning TEACHER role for Garbutt State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '3b6f5f9b-d08c-482a-8769-2aef521a6be0'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@garbuttstate.edu.au';

-- Assigning TEACHER role for Coombabah State High School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  'fa0be112-e8dc-4726-b54f-88884f30f185'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@coombabahstate.edu.au';

-- Assigning TEACHER role for Clare State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  'f2bae393-090d-4d3f-969b-10210683a15d'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@clarestate.edu.au';

-- Assigning TEACHER role for Bundaberg East State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '4d0f08e3-b08e-40e4-9fc2-ecd3a2dd2887'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@bundabergeast.edu.au';

-- Assigning TEACHER role for Biboohra State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '7d53834e-76dd-47fe-a296-5d3abadd2fcb'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@biboohrastate.edu.au';

-- Assigning TEACHER role for Berrinba East State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  '848d6b94-c653-4877-84ab-1a9e0a235408'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@berrinbaeast.edu.au';

-- Assigning TEACHER role for Airville State School
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4'::uuid as role_id,
  'c2cfd85b-56ca-4f27-8c60-db882311777a'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = 'teacher@airvillestate.edu.au';
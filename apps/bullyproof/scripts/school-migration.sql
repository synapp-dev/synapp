-- School Data Migration SQL
-- Generated from legacy schools.json
-- Run this in Supabase SQL Editor
-- Note: Assumes reference data (states, school_sectors, school_levels) already exists

-- Insert schools

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Amamoor State School',
  'AMGPQ151',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'amamoor-state-school-qld',
  NULL,
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Ipswich Girls Grammar School',
  'IPISQ199',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'independent'),
  'ipswich-girls-grammar-school-qld',
  NULL,
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Coominya State School',
  'COGPQ188',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'coominya-state-school-qld',
  '2025-03-20T06:50:49.500Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Albert State School',
  'ALGPQ774',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'albert-state-school-qld',
  '2025-03-05T23:07:48.113Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Tamrookum State School',
  'TAGPQ445',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'tamrookum-state-school-qld',
  '2025-03-06T00:23:37.278Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'McIlwraith State School',
  'MCGPQ934',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'mcilwraith-state-school-qld',
  '2025-03-18T21:33:02.181Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Mount Molloy State School',
  'MOGPQ919',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'mount-molloy-state-school-qld',
  '2025-03-07T06:10:28.773Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Booyal Central State School',
  'BOGPQ375',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'booyal-central-state-school-qld',
  '2025-03-07T00:48:05.026Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Monkland State School',
  'MOGPQ775',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'monkland-state-school-qld',
  '2025-03-05T04:27:35.263Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Tagai State College',
  'TAGPQ732',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'tagai-state-college-qld',
  '2025-02-23T06:29:16.055Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Bauple State School',
  'BAGPQ937',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'bauple-state-school-qld',
  '2025-02-20T03:06:02.859Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Gleneagle State School',
  'GLGPQ659',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'gleneagle-state-school-qld',
  '2025-02-23T07:19:40.391Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Bluff State School',
  'BLGPQ148',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'bluff-state-school-qld',
  '2025-02-17T21:50:37.508Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'St John Fisher College',
  'STCSQ510',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'catholic'),
  'st-john-fisher-college-qld',
  NULL,
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Mt Maria College',
  'MTCSQ143',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'catholic'),
  'mt-maria-college-qld',
  '2025-02-13T00:49:17.734Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Kepnock State High School',
  'KEGSQ762',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'kepnock-state-high-school-qld',
  NULL,
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Harristown State High school',
  'HAGSQ934',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'harristown-state-high-school-qld',
  NULL,
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Bremer State High School',
  'BRGSQ632',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'bremer-state-high-school-qld',
  NULL,
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Marmor State School',
  'MAGPQ147',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'marmor-state-school-qld',
  '2025-02-05T01:16:50.978Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Moranbah State High School',
  'MOGSQ973',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'moranbah-state-high-school-qld',
  NULL,
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Wallaville State School',
  'WAGPQ978',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'wallaville-state-school-qld',
  '2025-02-27T21:42:04.110Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Vincent State School',
  'VIGPQ376',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'vincent-state-school-qld',
  '2025-01-27T21:31:23.602Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Tingoora State School',
  'TIGPQ734',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'tingoora-state-school-qld',
  '2025-01-24T10:08:01.240Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Tiaro State School',
  'TIGPQ499',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'tiaro-state-school-qld',
  '2025-01-24T06:58:08.590Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'The Caves State School',
  'THGPQ821',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'the-caves-state-school-qld',
  '2025-02-03T06:59:54.816Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Thangool State School',
  'THGPQ124',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'thangool-state-school-qld',
  '2025-01-24T07:51:49.169Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Stanwell State School',
  'STGPQ863',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'stanwell-state-school-qld',
  '2025-02-18T00:12:30.510Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Southport State School',
  'SOGPQ809',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'southport-state-school-qld',
  '2025-01-25T23:32:53.078Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Our Lady of the Sacred Heart',
  'OUCPQ850',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'catholic'),
  'our-lady-of-the-sacred-heart-qld',
  '2025-01-28T00:30:02.249Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Millaroo State School',
  'MIGPQ740',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'millaroo-state-school-qld',
  '2025-01-24T06:21:00.482Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Hambledon State School',
  'HAGPQ368',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'hambledon-state-school-qld',
  NULL,
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Haigslea State School',
  'HAGPQ174',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'haigslea-state-school-qld',
  '2025-01-25T02:21:50.425Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Grovely State School',
  'GRGPQ189',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'grovely-state-school-qld',
  NULL,
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Gin Gin State High School',
  'GIGSQ170',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'gin-gin-state-high-school-qld',
  '2025-01-24T04:23:09.632Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Elliot Heads State School',
  'ELGPQ385',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'elliot-heads-state-school-qld',
  '2025-01-24T02:32:49.556Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Garbutt State School',
  'GAGPQ589',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'garbutt-state-school-qld',
  '2025-01-24T03:26:33.779Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Coombabah State High School',
  'COGSQ353',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'coombabah-state-high-school-qld',
  '2025-01-27T08:10:55.984Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Clare State School',
  'CLGPQ920',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'clare-state-school-qld',
  '2025-01-26T12:51:44.044Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Bundaberg East State School',
  'BUGPQ563',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'bundaberg-east-state-school-qld',
  '2025-01-27T22:08:41.986Z',
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Biboohra State School',
  'BIGPQ971',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'biboohra-state-school-qld',
  NULL,
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Berrinba East State School',
  'BEGPQ704',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'berrinba-east-state-school-qld',
  NULL,
  NOW()
);

INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  'Airville State School',
  'AIGPQ669',
  (SELECT id FROM states WHERE name = 'Queensland'),
  (SELECT id FROM school_sectors WHERE key = 'government'),
  'airville-state-school-qld',
  '2025-02-26T22:17:51.110Z',
  NOW()
);

-- School level assignments


INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'AMGPQ151'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'IPISQ199'),
  (SELECT id FROM school_levels WHERE key = 'secondary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'COGPQ188'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'ALGPQ774'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'TAGPQ445'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'MCGPQ934'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'MOGPQ919'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'BOGPQ375'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'MOGPQ775'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'TAGPQ732'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'TAGPQ732'),
  (SELECT id FROM school_levels WHERE key = 'secondary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'BAGPQ937'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'GLGPQ659'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'BLGPQ148'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'STCSQ510'),
  (SELECT id FROM school_levels WHERE key = 'secondary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'MTCSQ143'),
  (SELECT id FROM school_levels WHERE key = 'secondary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'KEGSQ762'),
  (SELECT id FROM school_levels WHERE key = 'secondary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'HAGSQ934'),
  (SELECT id FROM school_levels WHERE key = 'secondary')
);


INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'BRGSQ632'),
  (SELECT id FROM school_levels WHERE key = 'secondary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'MAGPQ147'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'MOGSQ973'),
  (SELECT id FROM school_levels WHERE key = 'secondary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'WAGPQ978'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'VIGPQ376'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'TIGPQ734'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'TIGPQ499'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'THGPQ821'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'THGPQ124'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'STGPQ863'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'SOGPQ809'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'OUCPQ850'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'MIGPQ740'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'HAGPQ368'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'HAGPQ174'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'GRGPQ189'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'GIGSQ170'),
  (SELECT id FROM school_levels WHERE key = 'secondary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'ELGPQ385'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'GAGPQ589'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'COGSQ353'),
  (SELECT id FROM school_levels WHERE key = 'secondary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'CLGPQ920'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'BUGPQ563'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'BIGPQ971'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'BEGPQ704'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);

INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = 'AIGPQ669'),
  (SELECT id FROM school_levels WHERE key = 'primary')
);


-- Summary:
-- 42 schools processed
-- 42 school inserts
-- 44 level assignments
-- Run this script in Supabase SQL Editor

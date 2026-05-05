INSERT INTO "public"."roles" ("slug", "label", "description") VALUES
  ('developer', 'Developer', 'Platform superuser: implies every capability (assign only out-of-band).')
ON CONFLICT ("slug") DO NOTHING;

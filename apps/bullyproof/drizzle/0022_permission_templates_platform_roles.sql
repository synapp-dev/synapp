ALTER TABLE "permission_templates"
ADD COLUMN IF NOT EXISTS "scope" text DEFAULT 'school' NOT NULL;

ALTER TABLE "permission_templates"
DROP CONSTRAINT IF EXISTS "permission_templates_scope_check";

ALTER TABLE "permission_templates"
ADD CONSTRAINT "permission_templates_scope_check"
CHECK (scope = ANY (ARRAY['school'::text, 'platform_role'::text]));

ALTER TABLE "permission_template_rules"
DROP CONSTRAINT IF EXISTS "permission_template_rules_level_check";

ALTER TABLE "permission_template_rules"
ADD CONSTRAINT "permission_template_rules_level_check"
CHECK (level = ANY (ARRAY['school'::text, 'school_role'::text, 'role'::text]));

ALTER TABLE "permission_template_rules"
DROP CONSTRAINT IF EXISTS "permission_template_rules_role_key_check";

ALTER TABLE "permission_template_rules"
ADD CONSTRAINT "permission_template_rules_role_key_check"
CHECK (
  (
    level = ANY (ARRAY['school_role'::text, 'role'::text])
    AND role_key IS NOT NULL
  )
  OR (level = 'school'::text AND role_key IS NULL)
);

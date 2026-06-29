-- Early-access blackout gate.
-- Introduces the `site.access` capability: while the platform is in stealth,
-- middleware redirects every principal lacking `site.access` (or `developer`)
-- to the public `/coming-soon` page. New Steam sign-ups only get `member`, so
-- they stay gated until explicitly granted access in /admin/users.

INSERT INTO "public"."roles" ("slug", "label", "description") VALUES
  ('site.access', 'Early Access', 'Bypass the coming-soon blackout and use the live app (middleware gate).')
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint

-- Guarantee the platform owner can always get in (developer already implies it,
-- but grant it explicitly so the gate never locks the owner out).
INSERT INTO "public"."user_roles" ("user_profile_id", "role_id")
SELECT up.id, r.id
FROM "public"."user_profiles" up
CROSS JOIN "public"."roles" r
WHERE up.email = 'agirton@intradark.com' AND r.slug = 'site.access'
ON CONFLICT ("user_profile_id", "role_id") DO NOTHING;
--> statement-breakpoint

-- Edge-callable authorization probe for middleware. SECURITY DEFINER so it can
-- read the role tables regardless of RLS; resolves the CURRENT user's effective
-- slugs (direct user_roles ∪ template-expanded) and returns true when they
-- include `site.access` or the `developer` superuser role.
CREATE OR REPLACE FUNCTION "public"."has_site_access"()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Direct role grants
    SELECT 1
    FROM user_profiles up
    JOIN user_roles ur ON ur.user_profile_id = up.id
    JOIN roles r ON r.id = ur.role_id
    WHERE up.user_id = auth.uid()
      AND r.slug IN ('site.access', 'developer')
    UNION ALL
    -- Template-expanded grants
    SELECT 1
    FROM user_profiles up
    JOIN user_role_templates urt ON urt.user_profile_id = up.id
    JOIN role_template_roles rtr ON rtr.template_id = urt.template_id
    JOIN roles r ON r.id = rtr.role_id
    WHERE up.user_id = auth.uid()
      AND r.slug IN ('site.access', 'developer')
  );
$$;
--> statement-breakpoint

GRANT EXECUTE ON FUNCTION "public"."has_site_access"() TO authenticated, anon;

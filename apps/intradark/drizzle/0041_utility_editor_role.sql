-- Utility moderation capability + protected superuser guarantee.
-- Introduces `utility.editor` so the /admin/utility review area can be granted
-- to non-developers (mirrors `news.editor`). The admin area itself is re-gated
-- from `developer`-only to `hasCapability(utility.editor)` in app code.

INSERT INTO "public"."roles" ("slug", "label", "description") VALUES
  ('utility.editor', 'Utility Editor', 'Review and publish community utility lineup submissions (/admin/utility).')
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint

-- God mode guarantee: the platform owner always holds `developer`. Keeps at
-- least one superuser even if every other grant is revoked via the panel.
INSERT INTO "public"."user_roles" ("user_profile_id", "role_id")
SELECT up.id, r.id
FROM "public"."user_profiles" up
CROSS JOIN "public"."roles" r
WHERE up.email = 'agirton@intradark.com' AND r.slug = 'developer'
ON CONFLICT ("user_profile_id", "role_id") DO NOTHING;

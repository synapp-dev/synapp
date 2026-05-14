CREATE TABLE IF NOT EXISTS "public"."role_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"label" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "role_templates_slug_key" ON "public"."role_templates" USING btree ("slug");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."role_template_roles" (
	"template_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "role_template_roles_template_id_role_id_pk" PRIMARY KEY("template_id","role_id")
);
--> statement-breakpoint
DO $rbac_fk1$ BEGIN
  ALTER TABLE "public"."role_template_roles"
    ADD CONSTRAINT "role_template_roles_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "public"."role_templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $rbac_fk1$;
--> statement-breakpoint
DO $rbac_fk2$ BEGIN
  ALTER TABLE "public"."role_template_roles"
    ADD CONSTRAINT "role_template_roles_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $rbac_fk2$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."user_role_templates" (
	"user_profile_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by" uuid,
	CONSTRAINT "user_role_templates_user_profile_id_template_id_pk" PRIMARY KEY("user_profile_id","template_id")
);
--> statement-breakpoint
DO $rbac_fk3$ BEGIN
  ALTER TABLE "public"."user_role_templates"
    ADD CONSTRAINT "user_role_templates_user_profile_id_fkey"
    FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $rbac_fk3$;
--> statement-breakpoint
DO $rbac_fk4$ BEGIN
  ALTER TABLE "public"."user_role_templates"
    ADD CONSTRAINT "user_role_templates_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "public"."role_templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $rbac_fk4$;
--> statement-breakpoint
DO $rbac_fk5$ BEGIN
  ALTER TABLE "public"."user_role_templates"
    ADD CONSTRAINT "user_role_templates_granted_by_fkey"
    FOREIGN KEY ("granted_by") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $rbac_fk5$;
--> statement-breakpoint
ALTER TABLE "public"."role_templates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."role_template_roles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."user_role_templates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "role_templates_select_authenticated" ON "public"."role_templates";
--> statement-breakpoint
CREATE POLICY "role_templates_select_authenticated" ON "public"."role_templates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
--> statement-breakpoint
DROP POLICY IF EXISTS "role_template_roles_select_authenticated" ON "public"."role_template_roles";
--> statement-breakpoint
CREATE POLICY "role_template_roles_select_authenticated" ON "public"."role_template_roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
--> statement-breakpoint
DROP POLICY IF EXISTS "user_role_templates_select_own" ON "public"."user_role_templates";
--> statement-breakpoint
CREATE POLICY "user_role_templates_select_own" ON "public"."user_role_templates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
  "user_profile_id" IN (SELECT "id" FROM "public"."user_profiles" WHERE "user_id" = auth.uid())
);
--> statement-breakpoint


INSERT INTO "public"."roles" ("slug", "label", "description") VALUES
  ('nav.news', 'Nav: News', 'Browse /news'),
  ('nav.forums', 'Nav: Forums', 'Browse /forums'),
  ('nav.media', 'Nav: Media', 'Browse /media'),
  ('nav.teams', 'Nav: Teams', 'Browse /teams'),
  ('nav.players', 'Nav: Players', 'Browse /players'),
  ('nav.theory', 'Nav: Theory', 'Browse /theory'),
  ('nav.utility', 'Nav: Utility', 'Browse /utility'),
  ('nav.scrims', 'Nav: Scrims', 'Browse /scrims'),
  ('nav.tournaments', 'Nav: Tournaments', 'Browse /tournaments'),
  ('nav.dashboard', 'Nav: Dashboard', 'Browse /dashboard'),
  ('nav.stats', 'Nav: Stats', 'Browse /stats'),
  ('nav.watchlist', 'Nav: Watchlist', 'Browse /watchlist'),
  ('nav.server', 'Nav: Server', 'Browse /server'),
  ('nav.matches', 'Nav: Matches', 'Browse /matches'),
  ('nav.match', 'Nav: Match', 'Browse /match'),
  ('nav.crew', 'Nav: Crew', 'Browse /crew'),
  ('nav.positions', 'Nav: Positions', 'Browse /positions')
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint

INSERT INTO "public"."role_templates" ("slug", "label", "description") VALUES
  ('member', 'Member navigation', 'Scrims, tournaments, dashboard for signed-in users')
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint

INSERT INTO "public"."role_template_roles" ("template_id", "role_id")
SELECT rt.id, r.id
FROM "public"."role_templates" rt
INNER JOIN "public"."roles" r ON r.slug IN ('nav.scrims', 'nav.tournaments', 'nav.dashboard')
WHERE rt.slug = 'member'
ON CONFLICT ("template_id", "role_id") DO NOTHING;
--> statement-breakpoint

INSERT INTO "public"."user_role_templates" ("user_profile_id", "template_id")
SELECT up.id, rt.id
FROM "public"."user_profiles" up
CROSS JOIN "public"."role_templates" rt
WHERE rt.slug = 'member'
ON CONFLICT ("user_profile_id", "template_id") DO NOTHING;
--> statement-breakpoint

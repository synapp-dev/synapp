CREATE TABLE "public"."roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"label" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "roles_slug_key" ON "public"."roles" USING btree ("slug");
--> statement-breakpoint
CREATE TABLE "public"."user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by" uuid
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "public"."user_roles" USING btree ("user_id", "role_id");
--> statement-breakpoint
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "roles_select_authenticated" ON "public"."roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
--> statement-breakpoint
CREATE POLICY "user_roles_select_own" ON "public"."user_roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = "user_id");
--> statement-breakpoint
INSERT INTO "public"."roles" ("slug", "label", "description") VALUES
  ('sandbox.access', 'Sandbox', 'Admin: UX simulators at /admin/sandbox'),
  ('news.editor', 'News editor', 'Create and publish news articles')
ON CONFLICT ("slug") DO NOTHING;

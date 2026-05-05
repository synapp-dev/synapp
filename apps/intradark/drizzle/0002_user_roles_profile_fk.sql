-- user_roles: reference user_profiles(id) instead of auth.users for the subject grantee.
DROP POLICY IF EXISTS "user_roles_select_own" ON "public"."user_roles";
--> statement-breakpoint
ALTER TABLE "public"."user_roles" ADD COLUMN "user_profile_id" uuid;
--> statement-breakpoint
UPDATE "public"."user_roles" ur
SET "user_profile_id" = up.id
FROM "public"."user_profiles" up
WHERE up.user_id = ur.user_id;
--> statement-breakpoint
DELETE FROM "public"."user_roles" WHERE "user_profile_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "public"."user_roles" ALTER COLUMN "user_profile_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "public"."user_roles" DROP CONSTRAINT IF EXISTS "user_roles_user_id_fkey";
--> statement-breakpoint
DROP INDEX IF EXISTS "user_roles_user_id_role_id_key";
--> statement-breakpoint
ALTER TABLE "public"."user_roles" DROP COLUMN IF EXISTS "user_id";
--> statement-breakpoint
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_user_profile_id_role_id_key" ON "public"."user_roles" USING btree ("user_profile_id", "role_id");
--> statement-breakpoint
ALTER TABLE "public"."user_roles" DROP CONSTRAINT IF EXISTS "user_roles_granted_by_fkey";
--> statement-breakpoint
UPDATE "public"."user_roles" SET "granted_by" = NULL WHERE "granted_by" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE POLICY "user_roles_select_own" ON "public"."user_roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
  "user_profile_id" IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
);

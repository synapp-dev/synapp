CREATE TABLE "public"."news_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(500) NOT NULL,
	"excerpt" text,
	"body_json" jsonb DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"author_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_articles_status_check" CHECK (("status") IN ('draft', 'published')),
	CONSTRAINT "news_articles_published_at_when_published" CHECK ((("status") <> 'published') OR ("published_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "public"."news_articles" ADD CONSTRAINT "news_articles_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "news_articles_slug_key" ON "public"."news_articles" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "news_articles_status_published_at_idx" ON "public"."news_articles" USING btree ("status", "published_at");
--> statement-breakpoint
ALTER TABLE "public"."news_articles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "news_articles_select" ON "public"."news_articles" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (
	(("status" = 'published') AND ("published_at" IS NOT NULL))
	OR EXISTS (
		SELECT 1
		FROM "public"."user_roles" ur
		INNER JOIN "public"."roles" r ON r.id = ur.role_id
		INNER JOIN "public"."user_profiles" up ON up.id = ur.user_profile_id
		WHERE up.user_id = auth.uid()
			AND r.slug IN ('news.editor', 'developer')
	)
);
--> statement-breakpoint
CREATE POLICY "news_articles_insert_editor" ON "public"."news_articles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
	"author_user_id" = auth.uid()
	AND EXISTS (
		SELECT 1
		FROM "public"."user_roles" ur
		INNER JOIN "public"."roles" r ON r.id = ur.role_id
		INNER JOIN "public"."user_profiles" up ON up.id = ur.user_profile_id
		WHERE up.user_id = auth.uid()
			AND r.slug IN ('news.editor', 'developer')
	)
);
--> statement-breakpoint
CREATE POLICY "news_articles_update_editor" ON "public"."news_articles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
	EXISTS (
		SELECT 1
		FROM "public"."user_roles" ur
		INNER JOIN "public"."roles" r ON r.id = ur.role_id
		INNER JOIN "public"."user_profiles" up ON up.id = ur.user_profile_id
		WHERE up.user_id = auth.uid()
			AND r.slug IN ('news.editor', 'developer')
	)
) WITH CHECK (
	EXISTS (
		SELECT 1
		FROM "public"."user_roles" ur
		INNER JOIN "public"."roles" r ON r.id = ur.role_id
		INNER JOIN "public"."user_profiles" up ON up.id = ur.user_profile_id
		WHERE up.user_id = auth.uid()
			AND r.slug IN ('news.editor', 'developer')
	)
);
--> statement-breakpoint
CREATE POLICY "news_articles_delete_editor" ON "public"."news_articles" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
	EXISTS (
		SELECT 1
		FROM "public"."user_roles" ur
		INNER JOIN "public"."roles" r ON r.id = ur.role_id
		INNER JOIN "public"."user_profiles" up ON up.id = ur.user_profile_id
		WHERE up.user_id = auth.uid()
			AND r.slug IN ('news.editor', 'developer')
	)
);

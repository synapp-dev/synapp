CREATE TABLE "public"."forum_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"label" varchar(255) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "forum_categories_slug_key" ON "public"."forum_categories" USING btree ("slug");
--> statement-breakpoint
CREATE TABLE "public"."forum_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"label" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "forum_tags_slug_key" ON "public"."forum_tags" USING btree ("slug");
--> statement-breakpoint
CREATE TABLE "public"."forum_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"author_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "public"."forum_threads" ADD CONSTRAINT "forum_threads_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."forum_categories"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."forum_threads" ADD CONSTRAINT "forum_threads_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "forum_threads_category_id_slug_key" ON "public"."forum_threads" USING btree ("category_id", "slug");
--> statement-breakpoint
CREATE INDEX "forum_threads_category_id_updated_at_idx" ON "public"."forum_threads" USING btree ("category_id", "updated_at");
--> statement-breakpoint
CREATE INDEX "forum_threads_author_user_id_idx" ON "public"."forum_threads" USING btree ("author_user_id");
--> statement-breakpoint
CREATE TABLE "public"."forum_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"parent_reply_id" uuid,
	"body" text NOT NULL,
	"author_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "public"."forum_replies" ADD CONSTRAINT "forum_replies_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."forum_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."forum_replies" ADD CONSTRAINT "forum_replies_parent_reply_id_fkey" FOREIGN KEY ("parent_reply_id") REFERENCES "public"."forum_replies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."forum_replies" ADD CONSTRAINT "forum_replies_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "forum_replies_thread_id_created_at_idx" ON "public"."forum_replies" USING btree ("thread_id", "created_at");
--> statement-breakpoint
CREATE INDEX "forum_replies_parent_reply_id_idx" ON "public"."forum_replies" USING btree ("parent_reply_id");
--> statement-breakpoint
CREATE TABLE "public"."forum_thread_tags" (
	"thread_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "forum_thread_tags_thread_id_tag_id_pk" PRIMARY KEY("thread_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "public"."forum_thread_tags" ADD CONSTRAINT "forum_thread_tags_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."forum_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."forum_thread_tags" ADD CONSTRAINT "forum_thread_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."forum_tags"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "forum_thread_tags_tag_id_idx" ON "public"."forum_thread_tags" USING btree ("tag_id");
--> statement-breakpoint
INSERT INTO "public"."forum_categories" ("slug", "label", "description", "sort_order") VALUES
	('general', 'General', 'Broad CS2 discussion and community topics', 10),
	('looking-for-team', 'Looking for team', 'Recruitment, roster changes, and finding teammates', 20),
	('feature-requests', 'Feature requests', 'Ideas for Intradark and the competitive toolkit', 30),
	('competitive', 'Competitive', 'Scrims, leagues, tournaments, and matchmaking meta', 40),
	('off-topic', 'Off topic', 'Non-CS2 lounge — keep it respectful', 50);
--> statement-breakpoint
INSERT INTO "public"."forum_tags" ("slug", "label") VALUES
	('strategy', 'Strategy'),
	('matchmaking', 'Matchmaking'),
	('maps', 'Maps'),
	('meta', 'Meta'),
	('lft', 'LFT');
--> statement-breakpoint
ALTER TABLE "public"."forum_categories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."forum_tags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."forum_threads" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."forum_replies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public"."forum_thread_tags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "forum_categories_select_public" ON "public"."forum_categories" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);
--> statement-breakpoint
CREATE POLICY "forum_tags_select_public" ON "public"."forum_tags" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);
--> statement-breakpoint
CREATE POLICY "forum_threads_select_public" ON "public"."forum_threads" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("deleted_at" IS NULL);
--> statement-breakpoint
CREATE POLICY "forum_threads_insert_own" ON "public"."forum_threads" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("author_user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "forum_threads_update_own" ON "public"."forum_threads" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("author_user_id" = auth.uid()) WITH CHECK ("author_user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "forum_replies_select_public" ON "public"."forum_replies" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (
	"deleted_at" IS NULL
	AND EXISTS (
		SELECT 1 FROM "public"."forum_threads" t
		WHERE t.id = "forum_replies"."thread_id" AND t."deleted_at" IS NULL
	)
);
--> statement-breakpoint
CREATE POLICY "forum_replies_insert_own" ON "public"."forum_replies" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
	"author_user_id" = auth.uid()
	AND EXISTS (
		SELECT 1 FROM "public"."forum_threads" t
		WHERE t.id = "forum_replies"."thread_id" AND t."deleted_at" IS NULL
	)
	AND (
		"parent_reply_id" IS NULL
		OR EXISTS (
			SELECT 1 FROM "public"."forum_replies" pr
			WHERE pr.id = "forum_replies"."parent_reply_id"
				AND pr."thread_id" = "forum_replies"."thread_id"
				AND pr."deleted_at" IS NULL
		)
	)
);
--> statement-breakpoint
CREATE POLICY "forum_replies_update_own" ON "public"."forum_replies" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("author_user_id" = auth.uid()) WITH CHECK ("author_user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "forum_thread_tags_select_public" ON "public"."forum_thread_tags" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (
	EXISTS (
		SELECT 1 FROM "public"."forum_threads" t
		WHERE t.id = "forum_thread_tags"."thread_id" AND t."deleted_at" IS NULL
	)
);
--> statement-breakpoint
CREATE POLICY "forum_thread_tags_insert_author" ON "public"."forum_thread_tags" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
	EXISTS (
		SELECT 1 FROM "public"."forum_threads" t
		WHERE t.id = "forum_thread_tags"."thread_id" AND t."author_user_id" = auth.uid() AND t."deleted_at" IS NULL
	)
);
--> statement-breakpoint
CREATE POLICY "forum_thread_tags_delete_author" ON "public"."forum_thread_tags" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
	EXISTS (
		SELECT 1 FROM "public"."forum_threads" t
		WHERE t.id = "forum_thread_tags"."thread_id" AND t."author_user_id" = auth.uid()
	)
);

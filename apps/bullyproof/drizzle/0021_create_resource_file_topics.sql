CREATE TABLE IF NOT EXISTS "resource_file_topics" (
  "file_id" uuid NOT NULL,
  "topic_id" uuid NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "resource_file_topics_pkey" PRIMARY KEY ("file_id", "topic_id")
);
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "resource_file_topics"
    ADD CONSTRAINT "resource_file_topics_file_id_fkey"
    FOREIGN KEY ("file_id") REFERENCES "public"."resource_files"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "resource_file_topics"
    ADD CONSTRAINT "resource_file_topics_topic_id_fkey"
    FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "resource_file_topics"
    ADD CONSTRAINT "resource_file_topics_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "public"."user_profile"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resource_file_topics_topic"
  ON "resource_file_topics" USING btree ("topic_id");
CREATE INDEX IF NOT EXISTS "idx_resource_file_topics_file"
  ON "resource_file_topics" USING btree ("file_id");
--> statement-breakpoint
ALTER TABLE "resource_file_topics" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
BEGIN
  CREATE POLICY "resource_file_topics_select"
    ON "resource_file_topics"
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  CREATE POLICY "resource_file_topics_insert"
    ON "resource_file_topics"
    AS PERMISSIVE
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  CREATE POLICY "resource_file_topics_delete"
    ON "resource_file_topics"
    AS PERMISSIVE
    FOR DELETE
    TO authenticated
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

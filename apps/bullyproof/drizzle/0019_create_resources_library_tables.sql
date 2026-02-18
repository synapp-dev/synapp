CREATE TABLE "resource_folders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "parent_id" uuid,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "scope_type" text NOT NULL,
  "school_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "folder_id" uuid NOT NULL,
  "display_name" text NOT NULL,
  "storage_path" text NOT NULL,
  "mime_type" text,
  "size_bytes" bigint NOT NULL,
  "scope_type" text NOT NULL,
  "school_id" uuid,
  "uploaded_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resource_folders" ADD CONSTRAINT "resource_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."resource_folders"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "resource_folders" ADD CONSTRAINT "resource_folders_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "resource_folders" ADD CONSTRAINT "resource_folders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profile"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."resource_folders"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user_profile"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_resource_folders_parent_id" ON "resource_folders" USING btree ("parent_id");
CREATE INDEX "idx_resource_folders_scope" ON "resource_folders" USING btree ("scope_type","school_id");
CREATE UNIQUE INDEX "ux_resource_folders_sibling_name" ON "resource_folders" USING btree (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),"scope_type",coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid),lower(name));
--> statement-breakpoint
CREATE INDEX "idx_resource_files_folder" ON "resource_files" USING btree ("folder_id");
CREATE INDEX "idx_resource_files_scope" ON "resource_files" USING btree ("scope_type","school_id");
CREATE UNIQUE INDEX "ux_resource_files_folder_display_name" ON "resource_files" USING btree ("folder_id",lower(display_name));
--> statement-breakpoint
ALTER TABLE "resource_folders" ADD CONSTRAINT "resource_folders_scope_type_check" CHECK (scope_type = ANY (ARRAY['global'::text, 'school'::text]));
ALTER TABLE "resource_folders" ADD CONSTRAINT "resource_folders_scope_school_consistency" CHECK (((scope_type = 'global'::text) AND (school_id IS NULL)) OR ((scope_type = 'school'::text) AND (school_id IS NOT NULL)));
ALTER TABLE "resource_folders" ADD CONSTRAINT "resource_folders_name_not_empty" CHECK (char_length(trim(BOTH FROM name)) > 0);
ALTER TABLE "resource_folders" ADD CONSTRAINT "resource_folders_slug_not_empty" CHECK (char_length(trim(BOTH FROM slug)) > 0);
--> statement-breakpoint
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_scope_type_check" CHECK (scope_type = ANY (ARRAY['global'::text, 'school'::text]));
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_scope_school_consistency" CHECK (((scope_type = 'global'::text) AND (school_id IS NULL)) OR ((scope_type = 'school'::text) AND (school_id IS NOT NULL)));
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_display_name_not_empty" CHECK (char_length(trim(BOTH FROM display_name)) > 0);
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_storage_path_not_empty" CHECK (char_length(trim(BOTH FROM storage_path)) > 0);
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_size_bytes_non_negative" CHECK (size_bytes >= 0);
--> statement-breakpoint
ALTER TABLE "resource_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resource_files" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "resource_folders_select"
  ON "resource_folders"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "resource_folders_insert"
  ON "resource_folders"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
CREATE POLICY "resource_folders_update"
  ON "resource_folders"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true);
CREATE POLICY "resource_folders_delete"
  ON "resource_folders"
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);
--> statement-breakpoint
CREATE POLICY "resource_files_select"
  ON "resource_files"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "resource_files_insert"
  ON "resource_files"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
CREATE POLICY "resource_files_update"
  ON "resource_files"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true);
CREATE POLICY "resource_files_delete"
  ON "resource_files"
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

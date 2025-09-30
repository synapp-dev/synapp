-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."invite_status" AS ENUM('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."licence_status" AS ENUM('DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "states_code_key" UNIQUE("code"),
	CONSTRAINT "states_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "school_sectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	CONSTRAINT "school_types_name_key" UNIQUE("name"),
	CONSTRAINT "school_sectors_key_chk" CHECK (key = ANY (ARRAY['government'::text, 'catholic'::text, 'independent'::text]))
);
--> statement-breakpoint
CREATE TABLE "school_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"display_name" text NOT NULL,
	"level_id" uuid NOT NULL,
	"sort_index" smallint NOT NULL,
	CONSTRAINT "school_years_code_key" UNIQUE("code"),
	CONSTRAINT "school_years_sort_index_key" UNIQUE("sort_index")
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" uuid PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
ALTER TABLE "user_profile" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "curriculum_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sort_index" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curriculum_stages_code_key" UNIQUE("code"),
	CONSTRAINT "curriculum_stages_name_key" UNIQUE("name"),
	CONSTRAINT "curriculum_stages_sort_index_key" UNIQUE("sort_index"),
	CONSTRAINT "curriculum_stages_code_chk" CHECK (code ~ '^S[0-9]+$'::text)
);
--> statement-breakpoint
CREATE TABLE "scopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "scopes_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"stream" text,
	"room" text,
	"student_cap" smallint,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classes_school_code_unique" UNIQUE("school_id","code")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"official_notes" text,
	CONSTRAINT "topics_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"key" text,
	CONSTRAINT "roles_scope_id_name_key" UNIQUE("scope_id","name"),
	CONSTRAINT "roles_key_key" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "lesson_live_state" (
	"lesson_id" uuid PRIMARY KEY NOT NULL,
	"current_slide_id" uuid NOT NULL,
	"current_index" integer NOT NULL,
	"is_paused" boolean DEFAULT false NOT NULL,
	"updated_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lesson_live_state" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "school_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	CONSTRAINT "school_levels_name_key" UNIQUE("name"),
	CONSTRAINT "school_levels_key_chk" CHECK (key = ANY (ARRAY['primary'::text, 'secondary'::text]))
);
--> statement-breakpoint
CREATE TABLE "topic_slides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"kind" text NOT NULL,
	"text_html" text,
	"image_url" text,
	"video_url" text,
	"video_start_s" integer,
	"video_end_s" integer,
	"official_notes" text,
	"duration_sec" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topic_slides_unique_order" UNIQUE("topic_id","order_index"),
	CONSTRAINT "topic_slides_kind_check" CHECK (kind = ANY (ARRAY['text'::text, 'image'::text, 'video'::text])),
	CONSTRAINT "topic_slides_payload_chk" CHECK (((kind = 'text'::text) AND (text_html IS NOT NULL) AND (image_url IS NULL) AND (video_url IS NULL)) OR ((kind = 'image'::text) AND (image_url IS NOT NULL) AND (text_html IS NULL) AND (video_url IS NULL)) OR ((kind = 'video'::text) AND (video_url IS NOT NULL) AND (text_html IS NULL)))
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"school_id" uuid,
	"assigned_at" timestamp with time zone DEFAULT now(),
	"role_scope" text,
	CONSTRAINT "user_roles_unique" UNIQUE("user_id","role_id","school_id"),
	CONSTRAINT "user_roles_scope_coherence_chk" CHECK (((role_scope = 'platform'::text) AND (school_id IS NULL)) OR ((role_scope = 'school'::text) AND (school_id IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "lesson_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"from_slide_id" uuid,
	"to_slide_id" uuid,
	"to_index" integer,
	"actor_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_events_kind_check" CHECK (kind = ANY (ARRAY['SLIDE_CHANGED'::text, 'PAUSED'::text, 'RESUMED'::text, 'JUMPED'::text, 'ENDED'::text]))
);
--> statement-breakpoint
ALTER TABLE "lesson_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lesson_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"started_by" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "lesson_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"state_id" uuid,
	"sector_id" uuid,
	"email_domain" text,
	"address" text,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"slug" text,
	CONSTRAINT "schools_code_key" UNIQUE("code"),
	CONSTRAINT "schools_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "school_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role_key" text NOT NULL,
	"token" text NOT NULL,
	"status" "invite_status" DEFAULT 'PENDING' NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"user_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_invites_email_check" CHECK (POSITION(('@'::text) IN (email)) > 1)
);
--> statement-breakpoint
CREATE TABLE "school_licences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"plan" text DEFAULT 'STANDARD' NOT NULL,
	"starts_at" date DEFAULT CURRENT_DATE NOT NULL,
	"ends_at" date DEFAULT (CURRENT_DATE + '3 years'::interval) NOT NULL,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"status" "licence_status" DEFAULT 'PENDING' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_level_assignments" (
	"school_id" uuid NOT NULL,
	"level_id" uuid NOT NULL,
	CONSTRAINT "school_level_assignments_pkey" PRIMARY KEY("school_id","level_id")
);
--> statement-breakpoint
CREATE TABLE "lesson_classes" (
	"lesson_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	CONSTRAINT "lesson_classes_pkey" PRIMARY KEY("lesson_id","class_id")
);
--> statement-breakpoint
CREATE TABLE "stage_year_links" (
	"stage_id" uuid NOT NULL,
	"school_year_id" uuid NOT NULL,
	CONSTRAINT "stage_year_links_pkey" PRIMARY KEY("stage_id","school_year_id")
);
--> statement-breakpoint
CREATE TABLE "class_years" (
	"class_id" uuid NOT NULL,
	"school_year_id" uuid NOT NULL,
	CONSTRAINT "class_years_pkey" PRIMARY KEY("class_id","school_year_id")
);
--> statement-breakpoint
CREATE TABLE "teacher_slide_notes" (
	"teacher_user_id" uuid NOT NULL,
	"topic_slide_id" uuid NOT NULL,
	"notes_richtext" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_slide_notes_pkey" PRIMARY KEY("teacher_user_id","topic_slide_id")
);
--> statement-breakpoint
CREATE TABLE "lesson_slide_notes" (
	"lesson_id" uuid NOT NULL,
	"topic_slide_id" uuid NOT NULL,
	"notes_richtext" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_slide_notes_pkey" PRIMARY KEY("lesson_id","topic_slide_id")
);
--> statement-breakpoint
ALTER TABLE "school_years" ADD CONSTRAINT "school_years_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."school_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."curriculum_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_scope_id_fkey" FOREIGN KEY ("scope_id") REFERENCES "public"."scopes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_live_state" ADD CONSTRAINT "lesson_live_state_current_slide_id_fkey" FOREIGN KEY ("current_slide_id") REFERENCES "public"."topic_slides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_live_state" ADD CONSTRAINT "lesson_live_state_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_live_state" ADD CONSTRAINT "lesson_live_state_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_slides" ADD CONSTRAINT "topic_slides_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_events" ADD CONSTRAINT "lesson_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_events" ADD CONSTRAINT "lesson_events_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_events" ADD CONSTRAINT "lesson_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."lesson_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_sessions" ADD CONSTRAINT "lesson_sessions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_sessions" ADD CONSTRAINT "lesson_sessions_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "public"."school_sectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_invites" ADD CONSTRAINT "school_invites_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_licences" ADD CONSTRAINT "school_licences_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_level_assignments" ADD CONSTRAINT "school_level_assignments_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."school_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_level_assignments" ADD CONSTRAINT "school_level_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_classes" ADD CONSTRAINT "lesson_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_classes" ADD CONSTRAINT "lesson_classes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_year_links" ADD CONSTRAINT "stage_year_links_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "public"."school_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_year_links" ADD CONSTRAINT "stage_year_links_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."curriculum_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_years" ADD CONSTRAINT "class_years_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_years" ADD CONSTRAINT "class_years_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "public"."school_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_slide_notes" ADD CONSTRAINT "teacher_slide_notes_teacher_user_id_fkey" FOREIGN KEY ("teacher_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_slide_notes" ADD CONSTRAINT "teacher_slide_notes_topic_slide_id_fkey" FOREIGN KEY ("topic_slide_id") REFERENCES "public"."topic_slides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_slide_notes" ADD CONSTRAINT "lesson_slide_notes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_slide_notes" ADD CONSTRAINT "lesson_slide_notes_topic_slide_id_fkey" FOREIGN KEY ("topic_slide_id") REFERENCES "public"."topic_slides"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_school_sectors_key" ON "school_sectors" USING btree ("key" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_classes_school_name" ON "classes" USING btree (school_id uuid_ops,lower(name) text_ops);--> statement-breakpoint
CREATE INDEX "idx_lessons_school_id" ON "lessons" USING btree ("school_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_lessons_topic_id" ON "lessons" USING btree ("topic_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_topics_stage_title" ON "topics" USING btree (stage_id text_ops,lower(title) text_ops);--> statement-breakpoint
CREATE INDEX "lesson_live_state_slide_idx" ON "lesson_live_state" USING btree ("current_slide_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_school_levels_key" ON "school_levels" USING btree ("key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_topic_slides_topic_order" ON "topic_slides" USING btree ("topic_id" int4_ops,"order_index" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "topic_slides_topic_order_uniq" ON "topic_slides" USING btree ("topic_id" int4_ops,"order_index" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_user_roles_school_id" ON "user_roles" USING btree ("school_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_user_roles_user_id" ON "user_roles" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "user_roles_role_idx" ON "user_roles" USING btree ("role_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "user_roles_school_idx" ON "user_roles" USING btree ("school_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "user_roles_user_idx" ON "user_roles" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "lesson_events_lesson_idx" ON "lesson_events" USING btree ("lesson_id" timestamptz_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "lesson_events_session_idx" ON "lesson_events" USING btree ("session_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "lesson_sessions_lesson_idx" ON "lesson_sessions" USING btree ("lesson_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_schools_sector_id" ON "schools" USING btree ("sector_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_schools_state_id" ON "schools" USING btree ("state_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_schools_name_lower" ON "schools" USING btree (lower(name) text_ops);--> statement-breakpoint
CREATE INDEX "ix_school_invites_email" ON "school_invites" USING btree (lower(email) text_ops);--> statement-breakpoint
CREATE INDEX "ix_school_invites_school" ON "school_invites" USING btree ("school_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_school_invites_pending" ON "school_invites" USING btree (school_id uuid_ops,lower(email) text_ops,role_key text_ops) WHERE (status = 'PENDING'::invite_status);--> statement-breakpoint
CREATE INDEX "ix_licences_school" ON "school_licences" USING btree ("school_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ix_licences_status" ON "school_licences" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_school_active_or_pending_licence" ON "school_licences" USING btree ("school_id" uuid_ops) WHERE (status = ANY (ARRAY['PENDING'::licence_status, 'ACTIVE'::licence_status]));--> statement-breakpoint
CREATE INDEX "idx_school_level_assignments_level_id" ON "school_level_assignments" USING btree ("level_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_school_level_assignments_school_id" ON "school_level_assignments" USING btree ("school_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_lesson_classes_class_id" ON "lesson_classes" USING btree ("class_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_stage_year_links_school_year_id" ON "stage_year_links" USING btree ("school_year_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_stage_year_links_stage_id" ON "stage_year_links" USING btree ("stage_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_class_years_class_id" ON "class_years" USING btree ("class_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_class_years_school_year_id" ON "class_years" USING btree ("school_year_id" uuid_ops);--> statement-breakpoint
CREATE VIEW "public"."v_school_years" AS (SELECT y.id, y.code, y.display_name, y.level_id, y.sort_index, sl.key AS level_key, sl.name AS level_name FROM school_years y JOIN school_levels sl ON sl.id = y.level_id);--> statement-breakpoint
CREATE VIEW "public"."school_level_badge" AS (SELECT s.id AS school_id, CASE WHEN count(*) FILTER (WHERE sl.key = 'primary'::text) = 1 AND count(*) FILTER (WHERE sl.key = 'secondary'::text) = 1 THEN 'P–12'::text WHEN COALESCE(bool_or(sl.key = 'primary'::text), false) THEN 'Primary'::text WHEN COALESCE(bool_or(sl.key = 'secondary'::text), false) THEN 'Secondary'::text ELSE 'Unknown'::text END AS level_badge FROM schools s LEFT JOIN school_level_assignments sla ON sla.school_id = s.id LEFT JOIN school_levels sl ON sl.id = sla.level_id GROUP BY s.id);--> statement-breakpoint
CREATE VIEW "public"."v_stage_thresholds" AS (SELECT s.id AS stage_id, min(y.sort_index) AS min_sort_index, max(y.sort_index) AS max_sort_index FROM curriculum_stages s JOIN stage_year_links l ON l.stage_id = s.id JOIN school_years y ON y.id = l.school_year_id GROUP BY s.id);--> statement-breakpoint
CREATE VIEW "public"."v_lesson_slides_effective" AS (SELECT l.id AS lesson_id, l.topic_id, ts.id AS topic_slide_id, ts.order_index, ts.kind, ts.text_html, ts.image_url, ts.video_url, ts.video_start_s, ts.video_end_s, COALESCE(lsn.notes_richtext, tsn.notes_richtext, ts.official_notes, t.official_notes) AS effective_notes, l.created_by_user_id AS teacher_user_id FROM lessons l JOIN topics t ON t.id = l.topic_id JOIN topic_slides ts ON ts.topic_id = t.id LEFT JOIN lesson_slide_notes lsn ON lsn.lesson_id = l.id AND lsn.topic_slide_id = ts.id LEFT JOIN teacher_slide_notes tsn ON tsn.teacher_user_id = l.created_by_user_id AND tsn.topic_slide_id = ts.id ORDER BY l.id, ts.order_index);--> statement-breakpoint
CREATE VIEW "public"."v_curriculum_stages_years" AS (WITH yrs AS ( SELECT s.id AS stage_id, s.code AS stage_code, s.name AS stage_name, array_agg(y.code ORDER BY y.sort_index) AS year_codes, array_agg(y.display_name ORDER BY y.sort_index) AS year_names, min(y.sort_index) AS min_sort_index, max(y.sort_index) AS max_sort_index FROM curriculum_stages s LEFT JOIN stage_year_links l ON l.stage_id = s.id LEFT JOIN school_years y ON y.id = l.school_year_id GROUP BY s.id, s.code, s.name ) SELECT stage_id, stage_code, stage_name, year_codes, year_names, CASE WHEN array_length(year_codes, 1) IS NULL THEN NULL::text WHEN array_length(year_codes, 1) = 1 THEN year_codes[1] ELSE (year_codes[1] || '–'::text) || year_codes[array_length(year_codes, 1)] END AS year_code_range, CASE WHEN array_length(year_names, 1) IS NULL THEN NULL::text WHEN array_length(year_names, 1) = 1 THEN year_names[1] ELSE (year_names[1] || ' – '::text) || year_names[array_length(year_names, 1)] END AS year_name_range, min_sort_index, max_sort_index FROM yrs ORDER BY min_sort_index, stage_code);--> statement-breakpoint
CREATE VIEW "public"."v_classes_years" AS (WITH yrs AS ( SELECT c.id, c.school_id, c.name, array_agg(y.code ORDER BY y.sort_index) AS year_codes, array_agg(y.display_name ORDER BY y.sort_index) AS year_names, min(y.sort_index) AS min_sort, max(y.sort_index) AS max_sort, min(sl.key) AS level_key, min(sl.name) AS level_name FROM classes c LEFT JOIN class_years cy ON cy.class_id = c.id LEFT JOIN school_years y ON y.id = cy.school_year_id LEFT JOIN school_levels sl ON sl.id = y.level_id GROUP BY c.id, c.school_id, c.name ) SELECT id, school_id, name, year_codes, year_names, CASE WHEN array_length(year_codes, 1) IS NULL THEN NULL::text WHEN array_length(year_codes, 1) = 1 THEN year_codes[1] ELSE (year_codes[1] || '–'::text) || year_codes[array_length(year_codes, 1)] END AS year_code_range, CASE WHEN array_length(year_names, 1) IS NULL THEN NULL::text WHEN array_length(year_names, 1) = 1 THEN year_names[1] ELSE (year_names[1] || ' – '::text) || year_names[array_length(year_names, 1)] END AS year_name_range, level_key, level_name FROM yrs ORDER BY name);--> statement-breakpoint
CREATE VIEW "public"."v_lesson_allowed_slides" AS (SELECT l.id AS lesson_id, ts.id AS topic_slide_id, ts.order_index FROM lessons l JOIN topics t ON t.id = l.topic_id JOIN topic_slides ts ON ts.topic_id = t.id);--> statement-breakpoint
CREATE VIEW "public"."v_schools_enriched" AS (SELECT sch.id, sch.name, sch.code, sch.slug, sch.email_domain, sch.address, sch.joined_at, sch.created_at, CASE WHEN st.id IS NULL THEN NULL::jsonb ELSE jsonb_build_object('id', st.id, 'code', st.code, 'name', st.name) END AS state, CASE WHEN sec.id IS NULL THEN NULL::jsonb ELSE jsonb_build_object('id', sec.id, 'key', sec.key, 'name', sec.name) END AS sector, COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', lvl.id, 'key', lvl.key, 'name', lvl.name) ORDER BY lvl.key) AS jsonb_agg FROM school_level_assignments sla JOIN school_levels lvl ON lvl.id = sla.level_id WHERE sla.school_id = sch.id), '[]'::jsonb) AS levels FROM schools sch LEFT JOIN states st ON st.id = sch.state_id LEFT JOIN school_sectors sec ON sec.id = sch.sector_id);--> statement-breakpoint
CREATE VIEW "public"."v_schools_readable" AS (SELECT sch.id, sch.name, sch.code, sch.slug, lower(st.code) AS state, sec.key AS sector, ARRAY( SELECT lvl.name FROM school_level_assignments sla JOIN school_levels lvl ON lvl.id = sla.level_id WHERE sla.school_id = sch.id ORDER BY ( CASE lvl.key WHEN 'primary'::text THEN 1 WHEN 'secondary'::text THEN 2 ELSE 99 END)) AS levels, sch.email_domain, sch.address, sch.joined_at, sch.created_at FROM schools sch LEFT JOIN states st ON st.id = sch.state_id LEFT JOIN school_sectors sec ON sec.id = sch.sector_id);--> statement-breakpoint
CREATE POLICY "livestate_delete" ON "lesson_live_state" AS PERMISSIVE FOR DELETE TO public USING ((has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid) OR has_any_role(ARRAY['SCHOOL_ADMIN'::text], ( SELECT lessons.school_id
   FROM lessons
  WHERE (lessons.id = lesson_live_state.lesson_id))) OR ((EXISTS ( SELECT 1
   FROM lessons l
  WHERE ((l.id = lesson_live_state.lesson_id) AND (l.created_by_user_id = auth.uid())))) AND has_any_role(ARRAY['TEACHER'::text], ( SELECT lessons.school_id
   FROM lessons
  WHERE (lessons.id = lesson_live_state.lesson_id))))));--> statement-breakpoint
CREATE POLICY "livestate_insert" ON "lesson_live_state" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "livestate_select" ON "lesson_live_state" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "livestate_update" ON "lesson_live_state" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "events_delete" ON "lesson_events" AS PERMISSIVE FOR DELETE TO public USING (false);--> statement-breakpoint
CREATE POLICY "events_insert" ON "lesson_events" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "events_select" ON "lesson_events" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "events_update" ON "lesson_events" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "sessions_delete" ON "lesson_sessions" AS PERMISSIVE FOR DELETE TO public USING ((has_any_role(ARRAY['PLATFORM_ADMIN'::text, 'PLATFORM_STAFF'::text], NULL::uuid) OR has_any_role(ARRAY['SCHOOL_ADMIN'::text], ( SELECT lessons.school_id
   FROM lessons
  WHERE (lessons.id = lesson_sessions.lesson_id))) OR (EXISTS ( SELECT 1
   FROM lessons l
  WHERE ((l.id = lesson_sessions.lesson_id) AND (l.created_by_user_id = auth.uid()))))));--> statement-breakpoint
CREATE POLICY "sessions_insert" ON "lesson_sessions" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "sessions_select" ON "lesson_sessions" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "sessions_update" ON "lesson_sessions" AS PERMISSIVE FOR UPDATE TO public;
*/
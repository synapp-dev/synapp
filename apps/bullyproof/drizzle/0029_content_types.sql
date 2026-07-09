-- Configurable Content Type entity (change-request module M1).
-- Introduces content_types and scopes curriculum_stages / certification_courses /
-- schools under a content type. Every existing row is backfilled to a protected
-- "Default" type, so reads that omit a content type stay byte-identical to today.

CREATE TABLE "content_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"level_count" smallint NOT NULL,
	"level_names" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_types_name_key" UNIQUE ("name"),
	CONSTRAINT "content_types_level_count_chk" CHECK (level_count >= 1)
);
--> statement-breakpoint
-- Case-insensitive uniqueness on name; at most one default type.
CREATE UNIQUE INDEX "ux_content_types_name_lower" ON "content_types" (lower("name"));
--> statement-breakpoint
CREATE UNIQUE INDEX "ux_content_types_single_default" ON "content_types" ("is_default") WHERE "is_default";
--> statement-breakpoint
ALTER TABLE "content_types" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Reference data: any authenticated user may read. Writes flow only through the
-- admin-gated route handlers (server connection bypasses RLS); no client writes.
CREATE POLICY "content_types_select" ON "content_types" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
--> statement-breakpoint

-- Seed the protected Default type from the existing curriculum stages, so its
-- level_count / level_names mirror the K-12 tree already in production.
INSERT INTO "content_types" ("name", "level_count", "level_names", "is_default")
SELECT
	'Default',
	COUNT(*)::smallint,
	COALESCE(jsonb_agg(s."name" ORDER BY s."sort_index"), '[]'::jsonb),
	true
FROM "curriculum_stages" s;
--> statement-breakpoint

-- Add the content type foreign keys (nullable during backfill).
ALTER TABLE "curriculum_stages" ADD COLUMN "content_type_id" uuid;
--> statement-breakpoint
ALTER TABLE "certification_courses" ADD COLUMN "content_type_id" uuid;
--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "content_type_id" uuid;
--> statement-breakpoint

UPDATE "curriculum_stages" SET "content_type_id" = (SELECT "id" FROM "content_types" WHERE "is_default");
--> statement-breakpoint
UPDATE "certification_courses" SET "content_type_id" = (SELECT "id" FROM "content_types" WHERE "is_default");
--> statement-breakpoint
UPDATE "schools" SET "content_type_id" = (SELECT "id" FROM "content_types" WHERE "is_default");
--> statement-breakpoint

-- Stages and schools always belong to a type; certification stays nullable
-- (custom types get no certification tree in v1).
ALTER TABLE "curriculum_stages" ALTER COLUMN "content_type_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "schools" ALTER COLUMN "content_type_id" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "curriculum_stages" ADD CONSTRAINT "curriculum_stages_content_type_id_fkey" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "certification_courses" ADD CONSTRAINT "certification_courses_content_type_id_fkey" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_content_type_id_fkey" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

-- Re-scope the stage uniques to per-type: code / name / slug / sort_index are
-- now unique within a content type, so each type carries its own S1..Sn ladder.
ALTER TABLE "curriculum_stages" DROP CONSTRAINT "curriculum_stages_code_key";
--> statement-breakpoint
ALTER TABLE "curriculum_stages" DROP CONSTRAINT "curriculum_stages_name_key";
--> statement-breakpoint
ALTER TABLE "curriculum_stages" DROP CONSTRAINT "curriculum_stages_sort_index_key";
--> statement-breakpoint
ALTER TABLE "curriculum_stages" DROP CONSTRAINT "curriculum_stages_slug_key";
--> statement-breakpoint
ALTER TABLE "curriculum_stages" ADD CONSTRAINT "curriculum_stages_type_code_key" UNIQUE ("content_type_id","code");
--> statement-breakpoint
ALTER TABLE "curriculum_stages" ADD CONSTRAINT "curriculum_stages_type_name_key" UNIQUE ("content_type_id","name");
--> statement-breakpoint
ALTER TABLE "curriculum_stages" ADD CONSTRAINT "curriculum_stages_type_sort_index_key" UNIQUE ("content_type_id","sort_index");
--> statement-breakpoint
ALTER TABLE "curriculum_stages" ADD CONSTRAINT "curriculum_stages_type_slug_key" UNIQUE ("content_type_id","slug");
--> statement-breakpoint

CREATE INDEX "idx_curriculum_stages_content_type_id" ON "curriculum_stages" ("content_type_id");
--> statement-breakpoint
CREATE INDEX "idx_schools_content_type_id" ON "schools" ("content_type_id");

-- School year assignments: per-school list of allowed year levels (source of truth for P-10, custom, etc.)
CREATE TABLE IF NOT EXISTS "school_year_assignments" (
	"school_id" uuid NOT NULL,
	"school_year_id" uuid NOT NULL,
	CONSTRAINT "school_year_assignments_pkey" PRIMARY KEY("school_id","school_year_id")
);

CREATE INDEX IF NOT EXISTS "idx_school_year_assignments_school_id" ON "school_year_assignments" USING btree ("school_id");

CREATE INDEX IF NOT EXISTS "idx_school_year_assignments_school_year_id" ON "school_year_assignments" USING btree ("school_year_id");

DO $$ BEGIN
 ALTER TABLE "school_year_assignments" ADD CONSTRAINT "school_year_assignments_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "public"."school_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
 ALTER TABLE "school_year_assignments" ADD CONSTRAINT "school_year_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;

-- Backfill: for each school, assign all school_years whose level_id is in that school's school_level_assignments
INSERT INTO school_year_assignments (school_id, school_year_id)
SELECT sla.school_id, sy.id
FROM school_level_assignments sla
JOIN school_years sy ON sy.level_id = sla.level_id
ON CONFLICT (school_id, school_year_id) DO NOTHING;

-- Recreate v_school_level_badge to derive from school_year_assignments (supports P-10, Custom)
DROP VIEW IF EXISTS "school_level_badge";

CREATE VIEW "school_level_badge" AS
SELECT s.id AS school_id,
  COALESCE(
    (SELECT CASE
      WHEN min(y.sort_index) = 0 AND max(y.sort_index) = 12 THEN 'P–12'::text
      WHEN min(y.sort_index) = 0 AND max(y.sort_index) = 10 THEN 'P–10'::text
      WHEN min(y.sort_index) = 0 AND max(y.sort_index) = 6 THEN 'Primary'::text
      WHEN min(y.sort_index) >= 7 AND max(y.sort_index) = 12 THEN 'Secondary'::text
      WHEN count(*) > 0 THEN 'Custom'::text
      ELSE 'Unknown'::text
     END
     FROM school_year_assignments sya
     JOIN school_years y ON y.id = sya.school_year_id
     WHERE sya.school_id = s.id),
    'Unknown'::text
  ) AS level_badge
FROM schools s;

-- Add level_badge to v_schools_readable (from school_year_assignments-derived badge)
DROP VIEW IF EXISTS "v_schools_readable";

CREATE VIEW "v_schools_readable" AS
SELECT sch.id, sch.name, sch.code, sch.state_id, sch.sector_id, sch.email_domain, sch.address, sch.joined_at, sch.created_at, sch.slug, sch.banner_url, sch.avatar_url, lower(st.code) AS state, sec.key AS sector, ARRAY(SELECT lvl.name FROM school_level_assignments sla JOIN school_levels lvl ON lvl.id = sla.level_id WHERE sla.school_id = sch.id ORDER BY CASE lvl.key WHEN 'primary' THEN 1 WHEN 'secondary' THEN 2 ELSE 99 END) AS levels, b.level_badge
FROM schools sch
LEFT JOIN states st ON st.id = sch.state_id
LEFT JOIN school_sectors sec ON sec.id = sch.sector_id
LEFT JOIN school_level_badge b ON b.school_id = sch.id;

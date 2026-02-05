-- Add level_badge to v_schools_enriched so school switcher and me/schools show P-10 etc.
DROP VIEW IF EXISTS "v_schools_enriched";

CREATE VIEW "v_schools_enriched" AS
SELECT sch.id, sch.name, sch.code, sch.slug, sch.email_domain, sch.address, sch.joined_at, sch.created_at,
  CASE WHEN st.id IS NULL THEN NULL::jsonb ELSE jsonb_build_object('id', st.id, 'code', st.code, 'name', st.name) END AS state,
  CASE WHEN sec.id IS NULL THEN NULL::jsonb ELSE jsonb_build_object('id', sec.id, 'key', sec.key, 'name', sec.name) END AS sector,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('id', lvl.id, 'key', lvl.key, 'name', lvl.name) ORDER BY lvl.key) FROM school_level_assignments sla JOIN school_levels lvl ON lvl.id = sla.level_id WHERE sla.school_id = sch.id), '[]'::jsonb) AS levels,
  b.level_badge
FROM schools sch
LEFT JOIN states st ON st.id = sch.state_id
LEFT JOIN school_sectors sec ON sec.id = sch.sector_id
LEFT JOIN school_level_badge b ON b.school_id = sch.id;

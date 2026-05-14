/**
 * Prints DELETE + INSERT SQL for Dust 2 lineups (misc/dust2smoke.json).
 * Same JSON shape and normalization as Mirage (miragesmoke-lineup-map + mirage-smoke-coords).
 *
 * Usage (from apps/intradark):
 *   pnpm exec tsx scripts/generate-dust2-lineups-sql.ts > supabase/seed_dust2_lineups.sql
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  mirageSmokeRowToLineupInsert,
  type MirageSmokeJsonRow,
} from "@/entities/utility-lineups/lib/miragesmoke-lineup-map";

const __dirname = dirname(fileURLToPath(import.meta.url));

const raw = JSON.parse(
  readFileSync(join(__dirname, "../misc/dust2smoke.json"), "utf8"),
) as MirageSmokeJsonRow[];

const mapIdSql =
  "(SELECT id FROM public.maps WHERE slug = 'de_dust2' LIMIT 1)";

function sqlLit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

const cols = [
  "map_id",
  "throw_spot_x",
  "throw_spot_y",
  "land_spot_x",
  "land_spot_y",
  "throw_label",
  "land_label",
  "grenade_type",
  "side",
  "movement",
  "technique",
  "margin",
  "youtube_url",
  "video_object_path",
  "video_start_ms",
  "video_end_ms",
  "lineup_image_url",
  "description",
  "setpos_text",
  "author_profile_id",
  "status",
  "pro_verified",
  "intradark_verified",
  "created_at",
  "updated_at",
];

const vals = raw.map((row) => {
  const full = mirageSmokeRowToLineupInsert(
    "00000000-0000-0000-0000-000000000000",
    row,
  );
  const { mapId: _omitMapId, ...r } = full;
  return `(${[
    mapIdSql,
    r.throwSpotX,
    r.throwSpotY,
    r.landSpotX,
    r.landSpotY,
    sqlLit(r.throwLabel ?? ""),
    sqlLit(r.landLabel ?? ""),
    sqlLit(r.grenadeType ?? ""),
    sqlLit(r.side ?? ""),
    sqlLit(r.movement ?? ""),
    sqlLit(r.technique ?? ""),
    sqlLit(r.margin ?? ""),
    sqlLit(r.youtubeUrl ?? ""),
    "NULL",
    r.videoStartMs,
    r.videoEndMs === null ? "NULL" : r.videoEndMs,
    r.lineupImageUrl == null ? "NULL" : sqlLit(r.lineupImageUrl),
    sqlLit(r.description ?? ""),
    r.setposText === null ? "NULL" : sqlLit(r.setposText ?? ""),
    "NULL",
    sqlLit(r.status ?? "published"),
    r.proVerified,
    r.intradarkVerified,
    "NOW()",
    "NOW()",
  ].join(", ")})`;
});

console.log(`-- Dust 2 utility lineups from misc/dust2smoke.json (${raw.length} rows).
-- Requires public.maps.slug = 'de_dust2'.
-- Coordinate normalization matches Mirage smoke exports (1006×1024 px → 0–1 radar space).

DELETE FROM public.utility_lineups WHERE map_id = ${mapIdSql};
`);

console.log(
  `INSERT INTO public.utility_lineups (${cols.join(", ")}) VALUES\n${vals.join(",\n")};`,
);

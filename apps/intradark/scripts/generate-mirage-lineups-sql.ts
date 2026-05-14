/**
 * Prints DELETE + INSERT SQL for Mirage lineups (miragesmoke.json).
 * Usage: npx tsx scripts/generate-mirage-lineups-sql.ts <map_uuid> [start end]
 *
 * When [start end] are omitted, prints one DELETE + full INSERT.
 * When provided (half-open range on JSON row indices), prints DELETE only if start=0,
 * then INSERT for rows [start, end).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  mirageSmokeRowToLineupInsert,
  type MirageSmokeJsonRow,
} from "@/entities/utility-lineups/lib/miragesmoke-lineup-map";

const mapId = process.argv[2];
if (!mapId) {
  console.error(
    "Usage: tsx scripts/generate-mirage-lineups-sql.ts <map_uuid> [start end]",
  );
  process.exit(1);
}

const rangeStart = process.argv[3] !== undefined ? Number(process.argv[3]) : 0;
const rangeEnd =
  process.argv[4] !== undefined ? Number(process.argv[4]) : Number.POSITIVE_INFINITY;
if (
  (process.argv[3] !== undefined && !Number.isFinite(rangeStart)) ||
  (process.argv[4] !== undefined && !Number.isFinite(rangeEnd))
) {
  console.error("Invalid start/end indices.");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(
  readFileSync(join(__dirname, "../misc/miragesmoke.json"), "utf8"),
) as MirageSmokeJsonRow[];

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

const sliced =
  process.argv[4] !== undefined
    ? raw.slice(rangeStart, rangeEnd)
    : raw.slice(rangeStart);

const vals = sliced.map((row) => {
  const r = mirageSmokeRowToLineupInsert(mapId, row);
  return `(${[
    `${sqlLit(mapId)}::uuid`,
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
    `${sqlLit(r.createdAt ?? "")}::timestamptz`,
    `${sqlLit(r.updatedAt ?? "")}::timestamptz`,
  ].join(", ")})`;
});

if (vals.length === 0) {
  console.error("No rows in range — nothing to emit.");
  process.exit(1);
}

if (rangeStart === 0) {
  console.log(
    `DELETE FROM public.utility_lineups WHERE map_id = ${sqlLit(mapId)}::uuid;`,
  );
}
console.log(
  `INSERT INTO public.utility_lineups (${cols.join(", ")}) VALUES\n${vals.join(",\n")};`,
);

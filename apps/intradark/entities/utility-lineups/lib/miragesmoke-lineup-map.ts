/**
 * Map misc/miragesmoke.json rows into utility_lineups enum columns + normalized coords.
 *
 * JSON shape (per row): throwFrom/throwTo pixel coords, titleFrom/titleTo, team, type,
 * movement, technique, precision, video.youtubeId + start/end.
 *
 * Coordinates use the same normalization as the radar overlay (mirage-smoke-coords).
 */

import type { InferInsertModel } from "drizzle-orm";

import { normalizeMirageRadarPixel } from "@/entities/utility-lineups/lib/mirage-smoke-coords";
import { utilityLineups } from "@/server/db/schema";

export type MirageSmokeVideo = {
  youtubeId: string;
  start?: number | null;
  end?: number | null;
};

export type MirageSmokeJsonRow = {
  throwFrom: { x: number; y: number };
  throwTo: { x: number; y: number };
  titleFrom: string;
  titleTo: string;
  team: string;
  type: string;
  movement: string | null;
  technique: string | null;
  precision: string | null;
  slug: string;
  video: MirageSmokeVideo | null;
};

export type MirageLineupInsert = InferInsertModel<typeof utilityLineups>;

function mapMovement(raw: string | null): MirageLineupInsert["movement"] {
  if (raw == null || raw === "") return "stationary";
  if (raw === "crouched_stationary") return "crouched";
  if (
    raw === "stationary" ||
    raw === "running" ||
    raw === "walking" ||
    raw === "crouched" ||
    raw === "crouched_walking"
  ) {
    return raw;
  }
  return "stationary";
}

function mapTechnique(raw: string | null): MirageLineupInsert["technique"] {
  if (raw == null || raw === "") return "left_click";
  switch (raw) {
    case "left":
      return "left_click";
    case "left_jump":
      return "jump_left_click";
    case "both":
      return "left_and_right_click";
    case "both_jump":
      return "jump_left_and_right_click";
    default:
      return "left_click";
  }
}

function mapMargin(raw: string | null): MirageLineupInsert["margin"] {
  if (raw === "very_precise") return "high";
  if (raw === "precise") return "medium";
  return "low";
}

function mapSide(team: string): MirageLineupInsert["side"] {
  if (team === "any") return "both";
  if (team === "t" || team === "ct" || team === "both") return team;
  return "both";
}

function mapGrenadeType(t: string): MirageLineupInsert["grenadeType"] {
  if (t === "smoke" || t === "molotov" || t === "flashbang" || t === "he") return t;
  return "smoke";
}

/** Build a Drizzle insert row for utility_lineups from one miragesmoke.json entry. */
export function mirageSmokeRowToLineupInsert(
  mapId: string,
  row: MirageSmokeJsonRow,
): MirageLineupInsert {
  const throwNorm = normalizeMirageRadarPixel(row.throwFrom.x, row.throwFrom.y);
  const landNorm = normalizeMirageRadarPixel(row.throwTo.x, row.throwTo.y);
  const vid = row.video;
  const youtubeId = vid?.youtubeId?.trim() ?? "";
  if (!youtubeId) {
    throw new Error(`miragesmoke row "${row.slug}" has no video.youtubeId`);
  }
  const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;

  const videoStartMs =
    typeof vid?.start === "number" && Number.isFinite(vid.start)
      ? Math.max(0, Math.round(vid.start))
      : 0;

  let videoEndMs: number | null = null;
  if (typeof vid?.end === "number" && Number.isFinite(vid.end) && vid.end > 0) {
    videoEndMs = Math.round(vid.end);
  }

  const description = `${row.titleFrom} → ${row.titleTo} (${row.slug})`;

  const now = new Date().toISOString();

  return {
    mapId,
    throwSpotX: throwNorm.radarX,
    throwSpotY: throwNorm.radarY,
    landSpotX: landNorm.radarX,
    landSpotY: landNorm.radarY,
    throwLabel: row.titleFrom,
    landLabel: row.titleTo,
    grenadeType: mapGrenadeType(row.type),
    side: mapSide(row.team),
    movement: mapMovement(row.movement),
    technique: mapTechnique(row.technique),
    margin: mapMargin(row.precision),
    youtubeUrl,
    videoStartMs,
    videoEndMs,
    lineupImageUrl: null,
    description,
    setposText: null,
    authorProfileId: null,
    status: "published",
    proVerified: false,
    intradarkVerified: false,
    createdAt: now,
    updatedAt: now,
  };
}

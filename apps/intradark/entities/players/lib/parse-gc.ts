/**
 * Parse a CS2 Game Coordinator `requestPlayersProfile` result into the columns
 * we archive. Mirrors the node-globaloffensive / node-cs2 profile shape.
 * Defensive: tolerates missing fields and never throws.
 */

export interface ParsedGcProfile {
  player_level: number | null;
  cmd_friendly: number | null;
  cmd_teaching: number | null;
  cmd_leader: number | null;
  vac_banned: boolean | null;
  medals: unknown | null;
  rankings: unknown | null;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function asNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && !Number.isNaN(n) ? n : null;
}

export function parseGcProfile(raw: unknown): ParsedGcProfile {
  const profile = asRecord(raw);
  const commendation = asRecord(profile.commendation);

  const vac = profile.vac_banned;
  const vacBanned =
    typeof vac === "boolean"
      ? vac
      : typeof vac === "number"
        ? vac !== 0
        : null;

  return {
    player_level: asNumber(profile.player_level),
    cmd_friendly: asNumber(commendation.cmd_friendly),
    cmd_teaching: asNumber(commendation.cmd_teaching),
    cmd_leader: asNumber(commendation.cmd_leader),
    vac_banned: vacBanned,
    medals: profile.medals ?? null,
    rankings: profile.rankings ?? profile.ranking ?? null,
  };
}

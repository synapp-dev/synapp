/**
 * Parse a Faceit Data API player payload into the columns we archive.
 * Defensive: tolerates missing/extra fields and never throws.
 */

import { normalizeCountryCode } from "@/entities/players/lib/country-code";

export interface ParsedFaceit {
  faceit_player_id: string | null;
  nickname: string | null;
  /** ISO 3166-1 alpha-2 (uppercase), from Faceit `country`. */
  country: string | null;
  faceit_elo: number | null;
  skill_level: number | null;
  region: string | null;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function asNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && !Number.isNaN(n) ? n : null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function parseFaceit(raw: unknown): ParsedFaceit {
  const root = asRecord(raw);
  const games = asRecord(root.games);
  // Prefer cs2, fall back to csgo.
  const game = asRecord(games.cs2 ?? games.csgo);

  return {
    faceit_player_id: asString(root.player_id),
    nickname: asString(root.nickname),
    country: normalizeCountryCode(asString(root.country)),
    faceit_elo: asNumber(game.faceit_elo),
    skill_level: asNumber(game.skill_level),
    region: asString(game.region),
  };
}

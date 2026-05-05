import { UTILITY_GRENADE_TYPES, type UtilitySearchFilters } from "./types";

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Coerce URL `searchParams` into safe filter defaults (never throws).
 * Query keys: `type`, `side`.
 */
export function normalizeUtilitySearchParams(
  raw: Record<string, string | string[] | undefined>,
): UtilitySearchFilters {
  const typeRaw = firstString(raw.type)?.toLowerCase().trim();
  const sideRaw = firstString(raw.side)?.toLowerCase().trim();

  let grenadeType: UtilitySearchFilters["grenadeType"] = "all";
  if (
    typeRaw &&
    (UTILITY_GRENADE_TYPES as readonly string[]).includes(typeRaw)
  ) {
    grenadeType = typeRaw as UtilitySearchFilters["grenadeType"];
  }

  let side: UtilitySearchFilters["side"] = "any";
  if (sideRaw === "t" || sideRaw === "ct") {
    side = sideRaw;
  }

  return { grenadeType, side };
}

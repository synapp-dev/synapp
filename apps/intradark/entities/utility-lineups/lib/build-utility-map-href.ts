import type { UtilitySearchFilters } from "./types";

/**
 * Build `/utility/[mapSlug]` href with optional `type` / `side` query (omitted when default).
 */
export function buildUtilityMapHref(
  mapSlug: string,
  filters: UtilitySearchFilters,
): string {
  const params = new URLSearchParams();
  if (filters.grenadeType !== "all") {
    params.set("type", filters.grenadeType);
  }
  if (filters.side !== "any") {
    params.set("side", filters.side);
  }
  const q = params.toString();
  return q ? `/utility/${mapSlug}?${q}` : `/utility/${mapSlug}`;
}

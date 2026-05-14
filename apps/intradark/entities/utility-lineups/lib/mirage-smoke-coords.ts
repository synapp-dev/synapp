/** Pixel width for `throwFrom.x` / `throwTo.x` in misc/miragesmoke.json-style exports. */
export const MIRAGE_COORD_EXTENT_X = 1006;
/** Pixel height for Y (square-ish radar canvas). */
export const MIRAGE_COORD_EXTENT_Y = 1024;

/** Normalize miragesmoke pixel coords to 0–1 radar space (matches `UtilityMapRadarClient` dummy overlay). */
export function normalizeMirageRadarPixel(px: number, py: number) {
  return {
    radarX: px / MIRAGE_COORD_EXTENT_X,
    radarY: py / MIRAGE_COORD_EXTENT_Y,
  };
}

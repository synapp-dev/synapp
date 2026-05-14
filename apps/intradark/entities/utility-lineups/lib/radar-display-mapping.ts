/**
 * Maps stored 0–1 lineup coordinates onto the rendered radar image.
 * Seeds often normalize X/Y with different pixel extents than the final art; the overlay also
 * uses percentage layout that should stay visually aligned with the bitmap.
 *
 * Transforms are **around the center (0.5, 0.5)**:
 * - `scaleX` < 1 — squash toward the middle horizontally (pins move in from left/right)
 * - `scaleY` > 1 — stretch vertically (pins move toward top/bottom)
 *
 * **Asymmetric Y:** when the data’s vertical origin or “anchor” doesn’t match the artwork,
 * error is often **worse at the top** than the bottom. Use `yShiftBottom` / `yShiftTop` to
 * nudge **down** (positive values) with a **linear blend** by stored `ny`:
 * - at bottom of map (`ny` → 1) apply `yShiftBottom`
 * - at top (`ny` → 0) apply `yShiftTop`
 * If only one is set, the other defaults so **top ≈ 2× bottom** (typical fix).
 */
export type RadarNormMapping = {
  scaleX: number;
  scaleY: number;
  /**
   * After center scaling, shift **down** this much (normalized 0–1) at the bottom (`ny` → 1).
   */
  yShiftBottom?: number;
  /**
   * After center scaling, shift **down** this much at the top (`ny` → 0).
   * Defaults to `2 * yShiftBottom` when only bottom is set.
   */
  yShiftTop?: number;
  /**
   * Vertical scale pivot (default `0.5`). Raise toward `1` if the artwork’s vert baseline feels
   * “low” — tops drift more than bottoms under uniform center scale.
   */
  pivotY?: number;
};

const DEFAULT_MAPPING: RadarNormMapping = { scaleX: 1, scaleY: 1 };

/**
 * Tune per map until pins match the radar artwork (`maps.*.radar_image_url`).
 * Stored lineup coords are 0–1 from seed normalization; these transforms only affect overlay fit.
 */
const MAP_SLUG_RADAR_MAPPING: Record<string, RadarNormMapping> = {
  de_mirage: {
    scaleX: 1,
    scaleY: 1.05,
    /** Small nudge down at bottom; top gets ~2× via `yGradientDelta` */
    yShiftBottom: 0.008,
  },
  /** Starter values — adjust scale / yShift* until smokes sit on the Dust II radar PNG. */
  de_dust2: {
    scaleX: 0.75,
    scaleY: 1.04,
    yShiftBottom: 0.007,
  },
};

export function radarNormMappingForMap(mapSlug: string): RadarNormMapping {
  return MAP_SLUG_RADAR_MAPPING[mapSlug] ?? DEFAULT_MAPPING;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function yGradientDelta(ny: number, mapping: RadarNormMapping): number {
  const sbRaw = mapping.yShiftBottom;
  const stRaw = mapping.yShiftTop;
  if (sbRaw == null && stRaw == null) return 0;

  const sb = sbRaw ?? (stRaw != null ? stRaw / 2 : 0);
  const st = stRaw ?? (sbRaw != null ? sbRaw * 2 : 0);
  return sb * ny + st * (1 - ny);
}

export function mapStoredRadarNormToDisplay(
  nx: number,
  ny: number,
  mapping: RadarNormMapping,
): { x: number; y: number } {
  const pivotY = mapping.pivotY ?? 0.5;
  const x = 0.5 + (nx - 0.5) * mapping.scaleX;
  let y = pivotY + (ny - pivotY) * mapping.scaleY;
  y += yGradientDelta(ny, mapping);
  return { x: clamp01(x), y: clamp01(y) };
}

/** Inverse of `mapStoredRadarNormToDisplay` for click-to-stored coords (e.g. user upload sheet). */
export function mapDisplayRadarNormToStored(
  dx: number,
  dy: number,
  mapping: RadarNormMapping,
): { x: number; y: number } {
  const nx = 0.5 + (dx - 0.5) / mapping.scaleX;
  const pivotY = mapping.pivotY ?? 0.5;
  const sbRaw = mapping.yShiftBottom;
  const stRaw = mapping.yShiftTop;
  const sb = sbRaw ?? (stRaw != null ? stRaw / 2 : 0);
  const st = stRaw ?? (sbRaw != null ? sbRaw * 2 : 0);
  const denom = mapping.scaleY + sb - st;
  if (Math.abs(denom) < 1e-9) {
    return { x: clamp01(nx), y: clamp01(dy) };
  }
  const ny = (dy - (pivotY - pivotY * mapping.scaleY + st)) / denom;
  return { x: clamp01(nx), y: clamp01(ny) };
}

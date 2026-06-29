/**
 * World → radar-image coordinate transforms for CS2 maps.
 *
 * Each map's standard overview defines a top-left world origin (`posX`,`posY`)
 * and a `scale` (world units per radar pixel) against a 1024×1024 render. To put
 * a world point on the radar we normalise into 0..1 (so the actual image
 * resolution doesn't matter, as long as it covers the same area as the standard
 * overview — which the stored `radar.webp` files do):
 *
 *   nx = (worldX - posX) / (scale * 1024)
 *   ny = (posY - worldY) / (scale * 1024)
 *
 * Values are the exact game-depot overview constants (extracted from CS2's
 * `resource/overviews/<map>.txt`; verified against MurkyYT/cs2-map-icons).
 *
 * CRITICAL: these are defined for the STANDARD 1024×1024 overview render, so the
 * replay must draw onto that exact image — see `radarImagePath` / the bundled
 * `public/radars/<slug>.png`. The utility-module radar images (`maps.radar_image_url`)
 * are differently-framed, non-square crops and do NOT line up with this transform.
 * Keyed by `maps.slug`, which equals the demo header's `map_name`.
 */

export type RadarTransform = { posX: number; posY: number; scale: number };

const RADAR_IMAGE_SIZE = 1024;

export const MAP_RADAR_TRANSFORMS: Record<string, RadarTransform> = {
  de_dust2: { posX: -2476, posY: 3239, scale: 4.4 },
  de_mirage: { posX: -3230, posY: 1713, scale: 5.0 },
  de_inferno: { posX: -2087, posY: 3870, scale: 4.9 },
  de_nuke: { posX: -3453, posY: 2887, scale: 7.0 },
  de_ancient: { posX: -2953, posY: 2164, scale: 5.0 },
  de_anubis: { posX: -2796, posY: 3328, scale: 5.22 },
  de_overpass: { posX: -4831, posY: 1781, scale: 5.2 },
  de_vertigo: { posX: -3168, posY: 1762, scale: 4.0 },
  de_train: { posX: -2308, posY: 2078, scale: 4.082 },
  cs_office: { posX: -1838, posY: 1858, scale: 4.1 },
};

/**
 * Maps with a bundled standard-overview radar in `public/radars/`. A replay is
 * only "supported" when a slug has BOTH a transform and a matching image.
 */
const BUNDLED_RADARS = new Set(Object.keys(MAP_RADAR_TRANSFORMS));

/** Path (under /public) to the standard radar image the transform aligns to. */
export function radarImagePath(slug: string): string | null {
  return BUNDLED_RADARS.has(slug) ? `/radars/${slug}.png` : null;
}

/** Map a world (x,y) to normalised radar coords in 0..1 (origin top-left). */
export function worldToRadar(
  worldX: number,
  worldY: number,
  t: RadarTransform,
): { x: number; y: number } {
  const span = t.scale * RADAR_IMAGE_SIZE;
  return {
    x: (worldX - t.posX) / span,
    y: (t.posY - worldY) / span,
  };
}

export function radarTransformFor(slug: string): RadarTransform | null {
  return MAP_RADAR_TRANSFORMS[slug] ?? null;
}

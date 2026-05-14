export type LineupLandRef = {
  id: string;
  landSpotX: number;
  landSpotY: number;
  landLabel: string;
};

export type LandSpotCluster = {
  /** Stable key for React lists */
  clusterKey: string;
  landSpotX: number;
  landSpotY: number;
  landLabel: string;
  lineupIds: string[];
  count: number;
  /**
   * When nearby (non-identical) land points were merged, use combined T/CT smoke art on the radar.
   * Same-pixel stacks keep `false` so we still pick T vs CT by majority.
   */
  combineSidesVisual: boolean;
};

/** ~32px land marker on a ~640px-wide radar → normalized diameter scale. */
export const DEFAULT_LAND_SMOKE_MARKER_NORM_DIAMETER = 0.048;

/**
 * Max center distance (normalized 0–1) to merge two land markers.
 * Set to half the assumed smoke footprint so overlaps exceed ~half the icon when merged.
 */
export const defaultLandClusterMergeMaxDistance = (): number =>
  DEFAULT_LAND_SMOKE_MARKER_NORM_DIAMETER * 0.5;

function landDist2(
  a: { landSpotX: number; landSpotY: number },
  b: { landSpotX: number; landSpotY: number },
): number {
  const dx = a.landSpotX - b.landSpotX;
  const dy = a.landSpotY - b.landSpotY;
  return dx * dx + dy * dy;
}

function landCoordKey(x: number, y: number): string {
  const rx = Math.round(x * 1e6) / 1e6;
  const ry = Math.round(y * 1e6) / 1e6;
  return `${rx},${ry}`;
}

function clusterKeyFrom(lineupIds: string[], cx: number, cy: number): string {
  const sorted = [...lineupIds].sort();
  const rx = Math.round(cx * 1e6) / 1e6;
  const ry = Math.round(cy * 1e6) / 1e6;
  return `${rx},${ry}|${sorted.join(",")}`;
}

function unionFind(n: number): { find: (i: number) => number; union: (i: number, j: number) => void } {
  const parent: number[] = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    const pi = parent[i]!;
    if (pi !== i) parent[i] = find(pi);
    return parent[i]!;
  };
  const union = (i: number, j: number) => {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[rj] = ri;
  };
  return { find, union };
}

/**
 * Group lineups by landing spot: exact same coords share one marker; distinct coords within
 * `mergeMaxDistance` are merged to one marker at the centroid (combined smoke art when spread > 0).
 */
export function clusterLineupsByLandSpot(
  lineups: LineupLandRef[],
  options?: { mergeMaxDistance?: number },
): LandSpotCluster[] {
  if (lineups.length === 0) return [];

  const mergeMax = options?.mergeMaxDistance ?? defaultLandClusterMergeMaxDistance();
  const mergeMax2 = mergeMax * mergeMax;

  const { find, union } = unionFind(lineups.length);
  for (let i = 0; i < lineups.length; i++) {
    const ri = lineups[i]!;
    for (let j = i + 1; j < lineups.length; j++) {
      if (landDist2(ri, lineups[j]!) <= mergeMax2) {
        union(i, j);
      }
    }
  }

  const buckets = new Map<number, number[]>();
  for (let i = 0; i < lineups.length; i++) {
    const r = find(i);
    const arr = buckets.get(r);
    if (arr) arr.push(i);
    else buckets.set(r, [i]);
  }

  const out: LandSpotCluster[] = [];
  for (const indices of buckets.values()) {
    const rows = indices.map((i) => lineups[i]!);
    const lineupIds = [...new Set(rows.map((r) => r.id))].sort();

    let sumX = 0;
    let sumY = 0;
    for (const r of rows) {
      sumX += r.landSpotX;
      sumY += r.landSpotY;
    }
    const n = rows.length;
    const landSpotX = sumX / n;
    const landSpotY = sumY / n;

    let maxPairDist2 = 0;
    for (let a = 0; a < rows.length; a++) {
      const ra = rows[a]!;
      for (let b = a + 1; b < rows.length; b++) {
        const d2 = landDist2(ra, rows[b]!);
        if (d2 > maxPairDist2) maxPairDist2 = d2;
      }
    }
    const COINCIDENT_EPS2 = 1e-14;
    const combineSidesVisual = maxPairDist2 > COINCIDENT_EPS2;

    const labelRow = [...rows].sort((x, y) => x.id.localeCompare(y.id))[0]!;
    const landLabel = labelRow.landLabel;

    out.push({
      clusterKey: clusterKeyFrom(lineupIds, landSpotX, landSpotY),
      landSpotX,
      landSpotY,
      landLabel,
      lineupIds,
      count: lineupIds.length,
      combineSidesVisual,
    });
  }

  out.sort((a, b) => a.clusterKey.localeCompare(b.clusterKey));
  return out;
}

export type LineupLandRef = {
  id: string;
  landSpotId: string;
};

export type LandSpotCluster = {
  landSpotId: string;
  lineupIds: string[];
  count: number;
};

/**
 * Group lineups by landing spot for radar marker counts.
 */
export function clusterLineupsByLandSpot(
  lineups: LineupLandRef[],
): LandSpotCluster[] {
  const map = new Map<string, string[]>();
  for (const row of lineups) {
    const list = map.get(row.landSpotId);
    if (list) list.push(row.id);
    else map.set(row.landSpotId, [row.id]);
  }
  return [...map.entries()].map(([landSpotId, lineupIds]) => ({
    landSpotId,
    lineupIds,
    count: lineupIds.length,
  }));
}

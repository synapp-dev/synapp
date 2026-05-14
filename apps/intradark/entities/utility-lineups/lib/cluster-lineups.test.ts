import { describe, expect, it } from "vitest";

import {
  clusterLineupsByLandSpot,
  DEFAULT_LAND_SMOKE_MARKER_NORM_DIAMETER,
} from "./cluster-lineups";

describe("clusterLineupsByLandSpot", () => {
  it("groups identical land coordinates without combined icon", () => {
    const out = clusterLineupsByLandSpot([
      { id: "a", landSpotX: 0.5, landSpotY: 0.6, landLabel: "A" },
      { id: "b", landSpotX: 0.5, landSpotY: 0.6, landLabel: "A" },
      { id: "c", landSpotX: 0.2, landSpotY: 0.3, landLabel: "B" },
    ]);
    expect(out).toHaveLength(2);
    const ab = out.find((c) => c.count === 2);
    expect(ab?.landLabel).toBe("A");
    expect(ab?.lineupIds).toEqual(["a", "b"]);
    expect(ab?.combineSidesVisual).toBe(false);
    const solo = out.find((c) => c.count === 1);
    expect(solo?.landLabel).toBe("B");
    expect(solo?.lineupIds).toEqual(["c"]);
    expect(solo?.combineSidesVisual).toBe(false);
  });

  it("merges nearby lands within merge radius and sets combineSidesVisual", () => {
    const mergeMax = DEFAULT_LAND_SMOKE_MARKER_NORM_DIAMETER * 0.5;
    const delta = mergeMax * 0.6;
    const out = clusterLineupsByLandSpot(
      [
        { id: "a", landSpotX: 0.5, landSpotY: 0.5, landLabel: "Left" },
        { id: "b", landSpotX: 0.5 + delta, landSpotY: 0.5, landLabel: "Right" },
        { id: "c", landSpotX: 0.1, landSpotY: 0.1, landLabel: "Far" },
      ],
      { mergeMaxDistance: mergeMax },
    );
    expect(out).toHaveLength(2);
    const merged = out.find((c) => c.lineupIds.includes("a") && c.lineupIds.includes("b"));
    expect(merged?.count).toBe(2);
    expect(merged?.combineSidesVisual).toBe(true);
    expect(merged?.landSpotX).toBeCloseTo(0.5 + delta / 2, 6);
    expect(merged?.landSpotY).toBeCloseTo(0.5, 6);
    expect(out.find((c) => c.lineupIds.includes("c"))?.combineSidesVisual).toBe(false);
  });

  it("does not merge lands beyond merge radius", () => {
    const mergeMax = DEFAULT_LAND_SMOKE_MARKER_NORM_DIAMETER * 0.5;
    const out = clusterLineupsByLandSpot(
      [
        { id: "a", landSpotX: 0.5, landSpotY: 0.5, landLabel: "A" },
        { id: "b", landSpotX: 0.5 + mergeMax * 3, landSpotY: 0.5, landLabel: "B" },
      ],
      { mergeMaxDistance: mergeMax },
    );
    expect(out).toHaveLength(2);
    expect(out.every((c) => c.count === 1)).toBe(true);
  });

  it("returns empty for empty input", () => {
    expect(clusterLineupsByLandSpot([])).toEqual([]);
  });
});

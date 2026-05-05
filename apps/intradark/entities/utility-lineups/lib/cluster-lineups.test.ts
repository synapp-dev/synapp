import { describe, expect, it } from "vitest";

import { clusterLineupsByLandSpot } from "./cluster-lineups";

describe("clusterLineupsByLandSpot", () => {
  it("groups by land spot", () => {
    const out = clusterLineupsByLandSpot([
      { id: "a", landSpotId: "s1" },
      { id: "b", landSpotId: "s1" },
      { id: "c", landSpotId: "s2" },
    ]);
    expect(out).toHaveLength(2);
    const s1 = out.find((c) => c.landSpotId === "s1");
    expect(s1?.count).toBe(2);
    expect(s1?.lineupIds).toEqual(["a", "b"]);
    const s2 = out.find((c) => c.landSpotId === "s2");
    expect(s2?.count).toBe(1);
  });

  it("returns empty for empty input", () => {
    expect(clusterLineupsByLandSpot([])).toEqual([]);
  });
});

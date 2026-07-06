import { describe, expect, it } from "vitest";
import {
  buildAppendNewSlidePositions,
  mergeReorderWithNewSlidePositions,
  resolveFinalSlideOrder,
  findSlidesNotOwnedByTopic,
} from "./order";

describe("resolveFinalSlideOrder", () => {
  it("resolves desiredOrder with temp IDs and filters deleted", () => {
    const tempMap = new Map([["temp_1", "real-1"]]);
    const deleted = new Set(["old-deleted"]);

    expect(
      resolveFinalSlideOrder({
        desiredOrder: ["existing", "temp_1", "old-deleted"],
        deletedSlideIds: deleted,
        tempIdToSlideIdMap: tempMap,
      })
    ).toEqual(["existing", "real-1"]);
  });

  it("merges reorder with appended new slides", () => {
    const order = resolveFinalSlideOrder({
      reorder: ["a", "b"],
      deletedSlideIds: new Set(),
      tempIdToSlideIdMap: new Map(),
      newSlidePositions: buildAppendNewSlidePositions(2, ["c", "d"]),
    });

    expect(order).toEqual(["a", "b", "c", "d"]);
  });

  it("returns null when no reorder input", () => {
    expect(
      resolveFinalSlideOrder({
        deletedSlideIds: new Set(),
        tempIdToSlideIdMap: new Map(),
      })
    ).toBeNull();
  });
});

describe("mergeReorderWithNewSlidePositions", () => {
  it("interleaves new slides at specified indices", () => {
    expect(
      mergeReorderWithNewSlidePositions(["a", "c"], [
        [1, "b"],
      ])
    ).toEqual(["a", "b", "c"]);
  });
});

describe("findSlidesNotOwnedByTopic", () => {
  it("returns IDs missing from the valid set", () => {
    expect(
      findSlidesNotOwnedByTopic(["a", "b", "c"], new Set(["a", "c"]))
    ).toEqual(["b"]);
  });
});

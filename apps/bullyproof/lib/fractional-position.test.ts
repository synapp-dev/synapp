import { describe, expect, it } from "vitest";
import {
  compareSlidesByPosition,
  computePositionsForOrder,
  generatePositionBetween,
} from "./fractional-position";

describe("fractional-position", () => {
  it("generates ordered positions for slide ids", () => {
    const positions = computePositionsForOrder(["a", "b", "c"]);
    expect(positions).toHaveLength(3);
    expect(positions[0]! < positions[1]!).toBe(true);
    expect(positions[1]! < positions[2]!).toBe(true);
  });

  it("generates a position between two bounds", () => {
    const positions = computePositionsForOrder(["only"]);
    const between = generatePositionBetween(positions[0]!, null);
    expect(between > positions[0]!).toBe(true);
  });

  it("sorts slides by position", () => {
    const sorted = [
      { id: "2", position: "a1" },
      { id: "1", position: "a0" },
    ].sort(compareSlidesByPosition);
    expect(sorted.map((s) => s.id)).toEqual(["1", "2"]);
  });
});

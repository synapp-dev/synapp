import { describe, expect, it } from "vitest";

import { normalizeUtilitySearchParams } from "./normalize-utility-search-params";

describe("normalizeUtilitySearchParams", () => {
  it("defaults when params missing", () => {
    expect(normalizeUtilitySearchParams({})).toEqual({
      grenadeType: "all",
      side: "any",
    });
  });

  it("accepts valid type and side", () => {
    expect(
      normalizeUtilitySearchParams({ type: "smoke", side: "ct" }),
    ).toEqual({
      grenadeType: "smoke",
      side: "ct",
    });
  });

  it("coerces invalid type to all", () => {
    expect(normalizeUtilitySearchParams({ type: "nade" })).toEqual({
      grenadeType: "all",
      side: "any",
    });
  });

  it("coerces invalid side to any", () => {
    expect(normalizeUtilitySearchParams({ side: "terrorist" })).toEqual({
      grenadeType: "all",
      side: "any",
    });
  });

  it("uses first array entry", () => {
    expect(
      normalizeUtilitySearchParams({ type: ["flashbang", "smoke"] }),
    ).toEqual({
      grenadeType: "flashbang",
      side: "any",
    });
  });
});

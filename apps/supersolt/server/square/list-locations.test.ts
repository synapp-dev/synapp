import { describe, expect, it } from "vitest";

import { pickDefaultSquareLocation } from "@/server/square/list-locations";

describe("pickDefaultSquareLocation", () => {
  it("returns the only active location", () => {
    const picked = pickDefaultSquareLocation([
      { id: "loc-a", name: "Hawthorn", status: "ACTIVE" },
    ]);
    expect(picked?.id).toBe("loc-a");
  });

  it("returns null when multiple active locations exist", () => {
    const picked = pickDefaultSquareLocation([
      { id: "loc-a", name: "Hawthorn", status: "ACTIVE" },
      { id: "loc-b", name: "Richmond", status: "ACTIVE" },
    ]);
    expect(picked).toBeNull();
  });
});

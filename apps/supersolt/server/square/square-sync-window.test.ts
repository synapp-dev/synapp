import { describe, expect, it } from "vitest";

import { rollingSyncIsoRange } from "@/server/square/square-sync-window";

describe("rollingSyncIsoRange", () => {
  it("covers three venue-local days ending on today", () => {
    const { startIso, endIso } = rollingSyncIsoRange(
      "Australia/Melbourne",
      3,
      "2026-06-01",
    );

    expect(new Date(startIso).getTime()).toBeLessThan(new Date(endIso).getTime());
    const spanMs = new Date(endIso).getTime() - new Date(startIso).getTime();
    expect(spanMs).toBeGreaterThan(2 * 24 * 60 * 60 * 1000);
    expect(spanMs).toBeLessThan(4 * 24 * 60 * 60 * 1000);
  });
});

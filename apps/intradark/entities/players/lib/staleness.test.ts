import { describe, expect, it } from "vitest";

import { isStale, SOURCE_TTL_MS } from "./staleness";

describe("isStale", () => {
  const now = 1_000_000_000_000;

  it("is stale when never fetched", () => {
    expect(isStale(null, SOURCE_TTL_MS.faceit, now)).toBe(true);
    expect(isStale(undefined, SOURCE_TTL_MS.faceit, now)).toBe(true);
  });

  it("is fresh within the TTL", () => {
    const fetchedAt = now - SOURCE_TTL_MS.faceit + 1000;
    expect(isStale(fetchedAt, SOURCE_TTL_MS.faceit, now)).toBe(false);
  });

  it("is stale past the TTL", () => {
    const fetchedAt = now - SOURCE_TTL_MS.faceit - 1000;
    expect(isStale(fetchedAt, SOURCE_TTL_MS.faceit, now)).toBe(true);
  });

  it("accepts ISO date strings", () => {
    const iso = new Date(now - 1000).toISOString();
    expect(isStale(iso, SOURCE_TTL_MS.steam, now)).toBe(false);
  });

  it("treats unparseable timestamps as stale", () => {
    expect(isStale("not-a-date", SOURCE_TTL_MS.steam, now)).toBe(true);
  });
});

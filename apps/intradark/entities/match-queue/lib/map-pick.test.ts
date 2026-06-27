import { describe, expect, it } from "vitest";

import { selectMapSlug } from "./map-pick";

const POOL = [
  "de_mirage",
  "de_dust2",
  "de_inferno",
  "de_ancient",
  "de_anubis",
  "de_nuke",
  "de_overpass",
  "de_cache",
];

describe("selectMapSlug", () => {
  it("returns a map from the pool", () => {
    expect(POOL).toContain(selectMapSlug(POOL, 0.42));
  });

  it("maps roll=0 to the first map and roll→1 to the last", () => {
    expect(selectMapSlug(POOL, 0)).toBe(POOL[0]);
    expect(selectMapSlug(POOL, 0.9999)).toBe(POOL[POOL.length - 1]);
  });

  it("clamps a roll of exactly 1 to the last index (no out-of-bounds)", () => {
    expect(selectMapSlug(POOL, 1)).toBe(POOL[POOL.length - 1]);
  });

  it("is deterministic for the same roll", () => {
    expect(selectMapSlug(POOL, 0.6)).toBe(selectMapSlug(POOL, 0.6));
  });

  it("distributes across the whole pool as roll sweeps [0,1)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < POOL.length; i++) {
      seen.add(selectMapSlug(POOL, i / POOL.length));
    }
    expect(seen.size).toBe(POOL.length);
  });

  it("throws on an empty pool", () => {
    expect(() => selectMapSlug([], 0.5)).toThrow(/empty pool/);
  });
});

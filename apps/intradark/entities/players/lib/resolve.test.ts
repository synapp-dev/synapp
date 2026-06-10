import { describe, expect, it, vi } from "vitest";

import {
  classifyIdentifier,
  canonicalPath,
  isSteamId64,
  resolveToSteamId64,
  type ResolveLookups,
} from "./resolve";

describe("classifyIdentifier", () => {
  it("classifies an @username", () => {
    expect(classifyIdentifier("@niko")).toEqual({
      kind: "username",
      value: "niko",
    });
  });

  it("classifies a bare steamid64", () => {
    expect(classifyIdentifier("76561198000000000")).toEqual({
      kind: "steamid64",
      value: "76561198000000000",
    });
  });

  it("extracts steamid64 from a /profiles/ URL", () => {
    expect(
      classifyIdentifier(
        "https://steamcommunity.com/profiles/76561198000000000",
      ),
    ).toEqual({ kind: "steamid64", value: "76561198000000000" });
  });

  it("extracts a vanity from an /id/ URL", () => {
    expect(
      classifyIdentifier("https://steamcommunity.com/id/niko/"),
    ).toEqual({ kind: "vanity", value: "niko" });
  });

  it("treats a bare word as ambiguous", () => {
    expect(classifyIdentifier("niko")).toEqual({
      kind: "ambiguous",
      value: "niko",
    });
  });
});

describe("isSteamId64", () => {
  it("accepts 17 digits", () => {
    expect(isSteamId64("76561198000000000")).toBe(true);
  });
  it("rejects non-17-digit input", () => {
    expect(isSteamId64("123")).toBe(false);
    expect(isSteamId64("niko")).toBe(false);
  });
});

describe("canonicalPath", () => {
  it("uses @username for linked members", () => {
    expect(canonicalPath("76561198000000000", "niko")).toBe("/players/@niko");
  });
  it("uses steamid64 for unclaimed players", () => {
    expect(canonicalPath("76561198000000000", null)).toBe(
      "/players/76561198000000000",
    );
  });
});

function makeLookups(over: Partial<ResolveLookups> = {}): ResolveLookups {
  return {
    byUsername: vi.fn(async () => null),
    byVanity: vi.fn(async () => null),
    byFaceitNickname: vi.fn(async () => null),
    ...over,
  };
}

describe("resolveToSteamId64", () => {
  it("returns a steamid64 directly without lookups", async () => {
    const lookups = makeLookups();
    const res = await resolveToSteamId64("76561198000000000", lookups);
    expect(res).toEqual({ steamid64: "76561198000000000", via: "steamid64" });
    expect(lookups.byVanity).not.toHaveBeenCalled();
  });

  it("resolves @username via byUsername", async () => {
    const lookups = makeLookups({
      byUsername: vi.fn(async () => "76561198000000001"),
    });
    const res = await resolveToSteamId64("@niko", lookups);
    expect(res).toEqual({ steamid64: "76561198000000001", via: "username" });
  });

  it("tries vanity before faceit for ambiguous input", async () => {
    const byVanity = vi.fn(async () => null);
    const byFaceitNickname = vi.fn(async () => "76561198000000002");
    const res = await resolveToSteamId64("niko", {
      ...makeLookups(),
      byVanity,
      byFaceitNickname,
    });
    expect(byVanity).toHaveBeenCalledWith("niko");
    expect(byFaceitNickname).toHaveBeenCalledWith("niko");
    expect(res).toEqual({ steamid64: "76561198000000002", via: "ambiguous" });
  });

  it("returns null when nothing resolves", async () => {
    const res = await resolveToSteamId64("ghost", makeLookups());
    expect(res).toBeNull();
  });
});

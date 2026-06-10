import { describe, expect, it } from "vitest";

import { isTeamLeader } from "./leader";

describe("isTeamLeader", () => {
  it("returns true when steam ids match", () => {
    expect(isTeamLeader("76561198000000000", "76561198000000000")).toBe(true);
  });

  it("returns false when leader is missing", () => {
    expect(isTeamLeader(null, "76561198000000000")).toBe(false);
  });

  it("returns false when viewer is missing", () => {
    expect(isTeamLeader("76561198000000000", null)).toBe(false);
  });

  it("returns false when ids differ", () => {
    expect(isTeamLeader("1", "2")).toBe(false);
  });
});

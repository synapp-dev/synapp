import { describe, expect, it } from "vitest";

import { canonicalTeamPathIfMismatch } from "./resolve-team-slug";

describe("canonicalTeamPathIfMismatch", () => {
  it("returns null when slugs match", () => {
    expect(canonicalTeamPathIfMismatch("falcons", "falcons")).toBeNull();
  });

  it("returns redirect path when slugs differ", () => {
    expect(canonicalTeamPathIfMismatch("old-name", "new-name")).toBe(
      "/teams/new-name/home",
    );
  });
});

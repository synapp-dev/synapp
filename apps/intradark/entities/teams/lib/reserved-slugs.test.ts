import { describe, expect, it } from "vitest";

import { TEAM_RESERVED_SLUGS } from "./reserved-slugs";
import { validateTeamSlug } from "./slug";

describe("TEAM_RESERVED_SLUGS", () => {
  it("rejects route segments as team slugs", () => {
    for (const slug of TEAM_RESERVED_SLUGS) {
      const res = validateTeamSlug(slug);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("reserved");
    }
  });
});

describe("validateTeamSlug", () => {
  it("accepts a valid slug", () => {
    expect(validateTeamSlug("falcons-esports").ok).toBe(true);
  });

  it("rejects empty slug", () => {
    const res = validateTeamSlug("");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("empty");
  });

  it("rejects invalid characters", () => {
    const res = validateTeamSlug("bad slug!");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("invalid_chars");
  });
});

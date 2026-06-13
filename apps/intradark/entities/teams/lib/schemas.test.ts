import { describe, expect, it } from "vitest";

import { createTeamSchema, updateTeamSchema } from "./schemas";

describe("createTeamSchema", () => {
  it("requires name", () => {
    const res = createTeamSchema.safeParse({ name: "" });
    expect(res.success).toBe(false);
  });

  it("accepts minimal valid input", () => {
    const res = createTeamSchema.safeParse({ name: "Team Falcons" });
    expect(res.success).toBe(true);
  });

  it("rejects reserved slug", () => {
    const res = createTeamSchema.safeParse({ name: "X", slug: "admin" });
    expect(res.success).toBe(false);
  });
});

describe("updateTeamSchema", () => {
  it("requires teamId and slug", () => {
    const res = updateTeamSchema.safeParse({
      teamId: "not-uuid",
      name: "A",
      slug: "a",
    });
    expect(res.success).toBe(false);
  });
});

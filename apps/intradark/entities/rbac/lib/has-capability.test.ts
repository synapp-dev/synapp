import { describe, expect, it } from "vitest";

import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";
import { NAV_SLUG } from "./nav-slugs";
import { hasCapability } from "./has-capability";

describe("hasCapability", () => {
  it("returns true when slug is present", () => {
    expect(hasCapability([NAV_SLUG.NEWS], NAV_SLUG.NEWS)).toBe(true);
  });

  it("returns false when slug is missing", () => {
    expect(hasCapability([], NAV_SLUG.DASHBOARD)).toBe(false);
  });

  it("developer implies any capability", () => {
    expect(hasCapability([ROLE_DEVELOPER], NAV_SLUG.DASHBOARD)).toBe(true);
    expect(hasCapability([ROLE_DEVELOPER], "future.capability")).toBe(true);
  });
});

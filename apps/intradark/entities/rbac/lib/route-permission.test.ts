import { describe, expect, it } from "vitest";

import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";

import { NAV_SLUG } from "./nav-slugs";
import { hasRoutePermission } from "./route-permission";

describe("hasRoutePermission", () => {
  it("allows when slug present", () => {
    expect(hasRoutePermission([NAV_SLUG.NEWS], NAV_SLUG.NEWS)).toBe(true);
  });

  it("denies when slug missing", () => {
    expect(hasRoutePermission([], NAV_SLUG.DASHBOARD)).toBe(false);
  });

  it("developer implies any checked slug", () => {
    expect(hasRoutePermission([ROLE_DEVELOPER], NAV_SLUG.DASHBOARD)).toBe(true);
  });
});

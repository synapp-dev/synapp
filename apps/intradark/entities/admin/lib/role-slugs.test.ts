import { describe, expect, it } from "vitest";

import {
  ADMIN_AREA_SLUGS,
  ROLE_DEVELOPER,
  ROLE_NEWS_EDITOR,
  ROLE_SANDBOX_ACCESS,
} from "./rbac-constants";
import { hasAnyAdminSlug, hasCapability, hasRoleSlug } from "./role-slugs";

describe("hasRoleSlug", () => {
  it("returns true when slug present", () => {
    expect(hasRoleSlug(["a", ROLE_SANDBOX_ACCESS], ROLE_SANDBOX_ACCESS)).toBe(
      true,
    );
  });

  it("returns false when missing", () => {
    expect(hasRoleSlug(["news.editor"], ROLE_SANDBOX_ACCESS)).toBe(false);
  });

  it("returns false for empty slugs", () => {
    expect(hasRoleSlug([], ROLE_SANDBOX_ACCESS)).toBe(false);
  });
});

describe("hasAnyAdminSlug", () => {
  it("matches any admin slug", () => {
    expect(hasAnyAdminSlug(["news.editor"], ADMIN_AREA_SLUGS)).toBe(true);
  });

  it("returns false when none match", () => {
    expect(hasAnyAdminSlug(["other"], ADMIN_AREA_SLUGS)).toBe(false);
  });

  it("treats developer as admin area access", () => {
    expect(hasAnyAdminSlug([ROLE_DEVELOPER], ADMIN_AREA_SLUGS)).toBe(true);
  });
});

describe("hasCapability", () => {
  it("developer implies sandbox", () => {
    expect(hasCapability([ROLE_DEVELOPER], ROLE_SANDBOX_ACCESS)).toBe(true);
  });

  it("developer implies news editor", () => {
    expect(hasCapability([ROLE_DEVELOPER], ROLE_NEWS_EDITOR)).toBe(true);
  });

  it("developer implies arbitrary future slug", () => {
    expect(hasCapability([ROLE_DEVELOPER], "future.capability")).toBe(true);
  });

  it("non-developer requires exact slug", () => {
    expect(hasCapability([ROLE_NEWS_EDITOR], ROLE_SANDBOX_ACCESS)).toBe(false);
    expect(hasCapability([ROLE_SANDBOX_ACCESS], ROLE_SANDBOX_ACCESS)).toBe(
      true,
    );
  });
});

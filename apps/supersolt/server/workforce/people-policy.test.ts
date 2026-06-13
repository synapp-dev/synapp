import { describe, expect, it } from "vitest";

import {
  canViewEmployeeSensitive,
  requiresAwardOverrideReason,
} from "@/server/workforce/people-policy";
import type { UserTenantRoles } from "@/server/auth/rbac";

const orgId = "org-1";

function roles(grantsOrgAdmin: boolean): UserTenantRoles {
  return {
    organisations: [
      {
        organisationId: orgId,
        organisationSlug: "acme",
        membershipId: "uo-1",
        roleSlug: grantsOrgAdmin ? "owner" : "manager",
        roleDisplayName: grantsOrgAdmin ? "Owner" : "Manager",
        grantsOrgAdmin,
        venues: [],
      },
    ],
  };
}

describe("canViewEmployeeSensitive", () => {
  it("allows owner to view colleague sensitive data", () => {
    expect(
      canViewEmployeeSensitive(roles(true), orgId, "profile-b", "profile-owner"),
    ).toBe(true);
  });

  it("denies manager viewing colleague sensitive data", () => {
    expect(
      canViewEmployeeSensitive(roles(false), orgId, "profile-b", "profile-manager"),
    ).toBe(false);
  });

  it("allows self view", () => {
    expect(
      canViewEmployeeSensitive(roles(false), orgId, "profile-self", "profile-self"),
    ).toBe(true);
  });
});

describe("requiresAwardOverrideReason", () => {
  it("requires reason when below minimum", () => {
    expect(
      requiresAwardOverrideReason({
        newRateCents: 2000,
        minimumRateCents: 2500,
        overrideReason: null,
      }),
    ).toBe(true);
  });

  it("passes when override reason provided", () => {
    expect(
      requiresAwardOverrideReason({
        newRateCents: 2000,
        minimumRateCents: 2500,
        overrideReason: "Market correction",
      }),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { AuthError } from "@/server/auth/errors";
import {
  assertOrganisationAdmin,
  assertVenueMember,
  isOrganisationAdmin,
  type UserTenantRoles,
} from "@/server/auth/rbac";

const tenantRoles: UserTenantRoles = {
  organisations: [
    {
      organisationId: "org-1",
      organisationSlug: "acme",
      membershipId: "mem-1",
      roleSlug: "owner",
      roleDisplayName: "Owner",
      grantsOrgAdmin: true,
      venues: [
        {
          venueId: "venue-1",
          venueSlug: "richmond",
          roleSlug: "manager",
          roleDisplayName: "Manager",
          grantsOrgAdmin: false,
        },
      ],
    },
    {
      organisationId: "org-2",
      organisationSlug: "beta",
      membershipId: "mem-2",
      roleSlug: "crew",
      roleDisplayName: "Crew",
      grantsOrgAdmin: false,
      venues: [
        {
          venueId: "venue-2",
          venueSlug: "cbd",
          roleSlug: "crew",
          roleDisplayName: "Crew",
          grantsOrgAdmin: false,
        },
      ],
    },
  ],
};

describe("rbac", () => {
  it("allows venue members", () => {
    expect(() =>
      assertVenueMember(tenantRoles, {
        organisationId: "org-1",
        venueId: "venue-1",
      }),
    ).not.toThrow();
  });

  it("rejects users without venue membership", () => {
    expect(() =>
      assertVenueMember(tenantRoles, {
        organisationId: "org-1",
        venueId: "missing",
      }),
    ).toThrow(AuthError);
  });

  it("detects organisation admins", () => {
    expect(isOrganisationAdmin(tenantRoles, "org-1")).toBe(true);
    expect(isOrganisationAdmin(tenantRoles, "org-2")).toBe(false);
  });

  it("assertOrganisationAdmin throws for crew orgs", () => {
    expect(() => assertOrganisationAdmin(tenantRoles, "org-2")).toThrow(
      AuthError,
    );
  });
});

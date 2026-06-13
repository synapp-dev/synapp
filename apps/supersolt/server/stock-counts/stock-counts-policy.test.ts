import { describe, expect, it } from "vitest";

import {
  assertValidStatusTransition,
  buildAllowedActions,
} from "@/server/stock-counts/stock-counts-policy";
import type { UserTenantRoles } from "@/server/auth/rbac";

const orgId = "org-1";
const userId = "user-1";

function roles(
  orgRole: "owner" | "admin" | "manager" | "supervisor" | "crew",
): UserTenantRoles {
  return {
    organisations: [
      {
        organisationId: orgId,
        organisationSlug: "acme",
        membershipId: "m-1",
        roleSlug: orgRole,
        roleDisplayName: orgRole,
        grantsOrgAdmin: orgRole === "owner" || orgRole === "admin",
        venues: [],
      },
    ],
  };
}

describe("stock-counts-policy", () => {
  it("allows in_progress → pending_approval", () => {
    expect(() =>
      assertValidStatusTransition("in_progress", "pending_approval"),
    ).not.toThrow();
  });

  it("rejects approved → in_progress without reopen path", () => {
    expect(() =>
      assertValidStatusTransition("approved", "archived"),
    ).toThrow();
  });

  it("grants submit to assignee manager", () => {
    const actions = buildAllowedActions({
      status: "in_progress",
      roles: roles("manager"),
      organisationId: orgId,
      assigneeUserId: userId,
      userId,
      largeVarianceOwnerRequired: false,
    });
    expect(actions).toContain("submit");
    expect(actions).toContain("edit");
  });

  it("withholds approve from crew on pending_approval", () => {
    const actions = buildAllowedActions({
      status: "pending_approval",
      roles: roles("crew"),
      organisationId: orgId,
      assigneeUserId: userId,
      userId,
      largeVarianceOwnerRequired: false,
    });
    expect(actions).not.toContain("approve");
  });

  it("requires owner for large variance approve", () => {
    const managerActions = buildAllowedActions({
      status: "pending_approval",
      roles: roles("manager"),
      organisationId: orgId,
      assigneeUserId: userId,
      userId,
      largeVarianceOwnerRequired: true,
    });
    expect(managerActions).not.toContain("approve");

    const ownerActions = buildAllowedActions({
      status: "pending_approval",
      roles: roles("owner"),
      organisationId: orgId,
      assigneeUserId: userId,
      userId,
      largeVarianceOwnerRequired: true,
    });
    expect(ownerActions).toContain("approve");
  });

  it("includes export on approved counts", () => {
    const actions = buildAllowedActions({
      status: "approved",
      roles: roles("crew"),
      organisationId: orgId,
      assigneeUserId: null,
      userId,
      largeVarianceOwnerRequired: false,
    });
    expect(actions).toContain("export");
  });
});

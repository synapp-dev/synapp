import { describe, expect, it, vi, beforeEach } from "vitest";

import type { RequestAuthContext } from "@/server/auth/context";
import type { UserTenantRoles } from "@/server/auth/rbac";
import { resolveAgentVenueScopeForNavigation } from "@/server/agent/agent-tool-scope";

import { executeSuggestAppNavigation } from "./execute-suggest-app-navigation";

vi.mock("@/server/agent/agent-tool-scope", () => ({
  resolveAgentVenueScopeForNavigation: vi.fn(),
}));

const resolveVenueScope = vi.mocked(resolveAgentVenueScopeForNavigation);

const memberRoles: UserTenantRoles = {
  organisations: [
    {
      organisationId: "org-1",
      organisationSlug: "acme",
      membershipId: "m-1",
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
  ],
};

function createMockCtx(tenantRoles: UserTenantRoles = memberRoles): RequestAuthContext {
  return {
    userId: "user-1",
    appDb: {
      rls: async (fn) => fn({} as never),
      admin: {} as never,
    },
    tenantRoles,
  };
}

describe("executeSuggestAppNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns INVALID_INPUT for malformed tool args", async () => {
    const out = await executeSuggestAppNavigation({
      ctx: createMockCtx(),
      rawInput: { organisationSlug: "", venueSlug: "x", destinationKeys: ["ingredients"] },
    });
    expect(out).toMatchObject({
      error: {
        code: "INVALID_INPUT",
      },
    });
  });

  it("returns ACCESS_DENIED when venue context is missing", async () => {
    resolveVenueScope.mockResolvedValue({ denied: true, reason: "venue_not_found" });
    const out = await executeSuggestAppNavigation({
      ctx: createMockCtx(),
      rawInput: {
        organisationSlug: "acme",
        venueSlug: "nope",
        destinationKeys: ["ingredients"],
      },
    });
    expect(out).toMatchObject({
      error: {
        code: "ACCESS_DENIED",
      },
    });
  });

  it("returns ACCESS_DENIED when venue membership check fails", async () => {
    resolveVenueScope.mockResolvedValue({ denied: true, reason: "access_denied" });

    const out = await executeSuggestAppNavigation({
      ctx: createMockCtx({ organisations: [] }),
      rawInput: {
        organisationSlug: "acme",
        venueSlug: "richmond",
        destinationKeys: ["ingredients"],
      },
    });
    expect(out).toMatchObject({ error: { code: "ACCESS_DENIED" } });
  });

  it("returns ACCESS_DENIED when every requested destination is Phase 2 locked", async () => {
    resolveVenueScope.mockResolvedValue({
      organisationId: "org-1",
      venueId: "venue-1",
      timezone: "UTC",
      organisationName: "Acme",
      venueName: "Richmond",
    });

    const out = await executeSuggestAppNavigation({
      ctx: createMockCtx(),
      rawInput: {
        organisationSlug: "acme",
        venueSlug: "richmond",
        destinationKeys: ["workforce", "operations_daybook", "insights_p_and_l"],
      },
    });
    expect(out).toMatchObject({ error: { code: "ACCESS_DENIED" } });
  });

  it("drops Phase 2 locked destinations but keeps unlocked ones", async () => {
    resolveVenueScope.mockResolvedValue({
      organisationId: "org-1",
      venueId: "venue-1",
      timezone: "UTC",
      organisationName: "Acme",
      venueName: "Richmond",
    });

    const out = await executeSuggestAppNavigation({
      ctx: createMockCtx(),
      rawInput: {
        organisationSlug: "acme",
        venueSlug: "richmond",
        destinationKeys: ["workforce_roster", "dashboard"],
      },
    });
    expect(out).toMatchObject({
      cards: [expect.objectContaining({ destinationKey: "dashboard" })],
    });
  });

  it("returns navigation cards on success", async () => {
    resolveVenueScope.mockResolvedValue({
      organisationId: "org-1",
      venueId: "venue-1",
      timezone: "UTC",
      organisationName: "Acme",
      venueName: "Richmond",
    });

    const out = await executeSuggestAppNavigation({
      ctx: createMockCtx(),
      rawInput: {
        organisationSlug: "acme",
        venueSlug: "richmond",
        destinationKeys: ["ingredients"],
      },
    });
    expect(out).toEqual({
      cards: [
        {
          title: "Ingredients",
          description: "View and manage ingredients for this venue.",
          href: "/acme/richmond/settings/inventory-setup/inventory/master-list",
          destinationKey: "ingredients",
          organisationName: "Acme",
          venueName: "Richmond",
        },
      ],
    });
  });
});

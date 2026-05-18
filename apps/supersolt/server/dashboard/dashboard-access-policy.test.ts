import { describe, expect, it } from "vitest";

import type { AccessContextPayloadDto } from "@/server/access/load-access-context-for-user";

import {
  getStaffDashboardRedirectPath,
  userCanAccessDashboard,
} from "./dashboard-access-policy";

function ctx(partial: AccessContextPayloadDto): AccessContextPayloadDto {
  return partial;
}

describe("userCanAccessDashboard", () => {
  it("denies crew-only memberships", () => {
    const access = ctx({
      organisations: [
        {
          id: "o1",
          name: "Org",
          slug: "org",
          logoUrl: null,
          roleSlug: "crew",
          roleDisplayName: "Crew",
          grantsOrgAdmin: false,
          venues: [
            {
              id: "v1",
              name: "Venue",
              slug: "venue",
              suburb: null,
              state: null,
              venueType: "cafe",
              roleSlug: "crew",
              roleDisplayName: "Crew",
              grantsOrgAdmin: false,
            },
          ],
        },
      ],
    });
    expect(userCanAccessDashboard(access)).toBe(false);
  });

  it("allows owner org role", () => {
    const access = ctx({
      organisations: [
        {
          id: "o1",
          name: "Org",
          slug: "org",
          logoUrl: null,
          roleSlug: "owner",
          roleDisplayName: "Owner",
          grantsOrgAdmin: true,
          venues: [],
        },
      ],
    });
    expect(userCanAccessDashboard(access)).toBe(true);
  });

  it("allows supervisor at venue even if org role is manager", () => {
    const access = ctx({
      organisations: [
        {
          id: "o1",
          name: "Org",
          slug: "org",
          logoUrl: null,
          roleSlug: "manager",
          roleDisplayName: "Manager",
          grantsOrgAdmin: false,
          venues: [
            {
              id: "v1",
              name: "Venue",
              slug: "venue",
              suburb: null,
              state: null,
              venueType: "cafe",
              roleSlug: "supervisor",
              roleDisplayName: "Supervisor",
              grantsOrgAdmin: false,
            },
          ],
        },
      ],
    });
    expect(userCanAccessDashboard(access)).toBe(true);
  });
});

describe("getStaffDashboardRedirectPath", () => {
  it("redirects to roster when a venue exists", () => {
    const path = getStaffDashboardRedirectPath(
      ctx({
        organisations: [
          {
            id: "o1",
            name: "Org",
            slug: "acme",
            logoUrl: null,
            roleSlug: "crew",
            roleDisplayName: "Crew",
            grantsOrgAdmin: false,
            venues: [
              {
                id: "v1",
                name: "Venue",
                slug: "richmond",
                suburb: null,
                state: null,
                venueType: "cafe",
                roleSlug: "crew",
                roleDisplayName: "Crew",
                grantsOrgAdmin: false,
              },
            ],
          },
        ],
      }),
    );
    expect(path).toBe("/acme/richmond/workforce/roster");
  });

  it("falls back to setup when no venues", () => {
    expect(
      getStaffDashboardRedirectPath(
        ctx({
          organisations: [
            {
              id: "o1",
              name: "Org",
              slug: "acme",
              logoUrl: null,
              roleSlug: "crew",
              roleDisplayName: "Crew",
              grantsOrgAdmin: false,
              venues: [],
            },
          ],
        }),
      ),
    ).toBe("/setup");
  });
});

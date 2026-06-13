import { describe, expect, it } from "vitest";

import type { AccessContextPayloadDto } from "@/server/access/load-access-context-for-user";

import { venueScopeFromAccess } from "./resolve-venue-scope";

function ctx(partial: AccessContextPayloadDto): AccessContextPayloadDto {
  return partial;
}

describe("venueScopeFromAccess", () => {
  it("returns preferred scope when the user has access", () => {
    const access = ctx({
      organisations: [
        {
          id: "o1",
          name: "Acme",
          slug: "acme",
          logoUrl: null,
          roleSlug: "owner",
          roleDisplayName: "Owner",
          grantsOrgAdmin: true,
          venues: [
            {
              id: "v1",
              name: "Richmond",
              slug: "richmond",
              suburb: null,
              state: null,
              venueType: "cafe",
              roleSlug: "owner",
              roleDisplayName: "Owner",
              grantsOrgAdmin: true,
            },
            {
              id: "v2",
              name: "Southbank",
              slug: "southbank",
              suburb: null,
              state: null,
              venueType: "cafe",
              roleSlug: "owner",
              roleDisplayName: "Owner",
              grantsOrgAdmin: true,
            },
          ],
        },
      ],
    });

    expect(
      venueScopeFromAccess(access, {
        organisationSlug: "acme",
        venueSlug: "southbank",
      }),
    ).toEqual({
      organisationSlug: "acme",
      venueSlug: "southbank",
    });
  });

  it("falls back to the first accessible venue when preferred scope is invalid", () => {
    const access = ctx({
      organisations: [
        {
          id: "o1",
          name: "Acme",
          slug: "acme",
          logoUrl: null,
          roleSlug: "owner",
          roleDisplayName: "Owner",
          grantsOrgAdmin: true,
          venues: [
            {
              id: "v1",
              name: "Richmond",
              slug: "richmond",
              suburb: null,
              state: null,
              venueType: "cafe",
              roleSlug: "owner",
              roleDisplayName: "Owner",
              grantsOrgAdmin: true,
            },
          ],
        },
      ],
    });

    expect(
      venueScopeFromAccess(access, {
        organisationSlug: "acme",
        venueSlug: "missing",
      }),
    ).toEqual({
      organisationSlug: "acme",
      venueSlug: "richmond",
    });
  });
});

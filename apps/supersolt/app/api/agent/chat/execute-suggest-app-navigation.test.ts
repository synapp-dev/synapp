import { describe, expect, it, vi, beforeEach } from "vitest";

import { assertUserHasVenueAccess, VenueAccessError } from "@/server/access/venue-access";
import { ingredientsRepo } from "@/server/ingredients/ingredients.repo";

import { executeSuggestAppNavigation } from "./execute-suggest-app-navigation";

vi.mock("@/server/ingredients/ingredients.repo", () => ({
  ingredientsRepo: {
    getVenueContextBySlugs: vi.fn(),
  },
}));

vi.mock("@/server/access/venue-access", async () => {
  const actual = await vi.importActual<typeof import("@/server/access/venue-access")>(
    "@/server/access/venue-access"
  );
  return {
    ...actual,
    assertUserHasVenueAccess: vi.fn(),
  };
});

const getVenueContextBySlugs = vi.mocked(ingredientsRepo.getVenueContextBySlugs);
const assertAccess = vi.mocked(assertUserHasVenueAccess);

describe("executeSuggestAppNavigation", () => {
  const supabase = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns INVALID_INPUT for malformed tool args", async () => {
    const out = await executeSuggestAppNavigation({
      supabase,
      userId: "user-1",
      rawInput: { organisationSlug: "", venueSlug: "x", destinationKeys: ["ingredients"] },
    });
    expect(out).toMatchObject({
      error: {
        code: "INVALID_INPUT",
      },
    });
  });

  it("returns ACCESS_DENIED when venue context is missing", async () => {
    getVenueContextBySlugs.mockResolvedValue(null);
    const out = await executeSuggestAppNavigation({
      supabase,
      userId: "user-1",
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
    expect(assertAccess).not.toHaveBeenCalled();
  });

  it("returns ACCESS_DENIED when venue membership check fails", async () => {
    getVenueContextBySlugs.mockResolvedValue({
      organisationId: "org-1",
      venueId: "venue-1",
      timezone: "UTC",
      organisationName: "Acme",
      venueName: "Richmond",
    });
    assertAccess.mockRejectedValue(new VenueAccessError(403, "Forbidden"));

    const out = await executeSuggestAppNavigation({
      supabase,
      userId: "user-1",
      rawInput: {
        organisationSlug: "acme",
        venueSlug: "richmond",
        destinationKeys: ["ingredients"],
      },
    });
    expect(out).toMatchObject({ error: { code: "ACCESS_DENIED" } });
  });

  it("returns navigation cards on success", async () => {
    getVenueContextBySlugs.mockResolvedValue({
      organisationId: "org-1",
      venueId: "venue-1",
      timezone: "UTC",
      organisationName: "Acme",
      venueName: "Richmond",
    });
    assertAccess.mockResolvedValue(undefined);

    const out = await executeSuggestAppNavigation({
      supabase,
      userId: "user-1",
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
          href: "/acme/richmond/catalog/ingredients",
          destinationKey: "ingredients",
          organisationName: "Acme",
          venueName: "Richmond",
        },
      ],
    });
  });
});

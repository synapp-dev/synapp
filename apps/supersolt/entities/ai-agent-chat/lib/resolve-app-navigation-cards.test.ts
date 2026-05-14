import { describe, expect, it } from "vitest";

import { resolveAppNavigationCards } from "./resolve-app-navigation-cards";

describe("resolveAppNavigationCards", () => {
  it("builds ingredients href from org and venue slugs", () => {
    const cards = resolveAppNavigationCards({
      organisationSlug: "acme",
      venueSlug: "richmond",
      organisationName: "Acme Co",
      venueName: "Richmond",
      destinationKeys: ["ingredients"],
    });
    expect(cards).toEqual([
      {
        title: "Ingredients",
        description: "View and manage ingredients for this venue.",
        href: "/acme/richmond/catalog/ingredients",
        destinationKey: "ingredients",
        organisationName: "Acme Co",
        venueName: "Richmond",
      },
    ]);
  });

  it("dedupes repeated keys", () => {
    const cards = resolveAppNavigationCards({
      organisationSlug: "a",
      venueSlug: "b",
      organisationName: "Org",
      venueName: "Venue",
      destinationKeys: ["ingredients", "ingredients"],
    });
    expect(cards).toHaveLength(1);
  });
});

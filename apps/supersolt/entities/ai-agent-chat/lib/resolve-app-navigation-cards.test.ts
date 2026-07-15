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
        href: "/acme/richmond/settings/inventory-setup/inventory/master-list",
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

  it("appends the period query only to destinations that read it", () => {
    const cards = resolveAppNavigationCards({
      organisationSlug: "acme",
      venueSlug: "richmond",
      organisationName: "Acme Co",
      venueName: "Richmond",
      destinationKeys: ["insights_sales", "dashboard"],
      period: { kind: "custom", from: "2026-07-06", to: "2026-07-12" },
    });
    expect(cards.map((c) => c.href)).toEqual([
      "/acme/richmond/insights/sales?preset=custom&from=2026-07-06&to=2026-07-12",
      "/acme/richmond/dashboard",
    ]);
  });

  it("appends a preset period as-is", () => {
    const cards = resolveAppNavigationCards({
      organisationSlug: "acme",
      venueSlug: "richmond",
      organisationName: "Acme Co",
      venueName: "Richmond",
      destinationKeys: ["insights_sales"],
      period: { kind: "preset", preset: "last-week" },
    });
    expect(cards[0]?.href).toBe("/acme/richmond/insights/sales?preset=last-week");
  });

  it("builds scoped dashboard href from org and venue slugs", () => {
    const cards = resolveAppNavigationCards({
      organisationSlug: "acme",
      venueSlug: "richmond",
      organisationName: "Acme Co",
      venueName: "Richmond",
      destinationKeys: ["dashboard"],
    });
    expect(cards).toEqual([
      {
        title: "Dashboard",
        description: "Workspace home with KPIs and venue overview.",
        href: "/acme/richmond/dashboard",
        destinationKey: "dashboard",
        organisationName: "Acme Co",
        venueName: "Richmond",
      },
    ]);
  });
});

import { describe, expect, it } from "vitest";

import {
  appNavigationCardSchema,
  dedupeDestinationKeys,
  MAX_APP_NAVIGATION_DESTINATION_KEYS,
  suggestAppNavigationInputSchema,
  suggestAppNavigationSuccessSchema,
} from "./app-navigation-tool-schema";

describe("app-navigation-tool-schema", () => {
  it("rejects oversize destination key arrays", () => {
    const keys = Array.from({ length: MAX_APP_NAVIGATION_DESTINATION_KEYS + 1 }, () => "ingredients" as const);
    const result = suggestAppNavigationInputSchema.safeParse({
      organisationSlug: "acme",
      venueSlug: "richmond",
      destinationKeys: keys,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid slug shapes", () => {
    const result = suggestAppNavigationInputSchema.safeParse({
      organisationSlug: "Acme",
      venueSlug: "richmond",
      destinationKeys: ["ingredients"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid input", () => {
    const result = suggestAppNavigationInputSchema.safeParse({
      organisationSlug: "acme",
      venueSlug: "richmond",
      destinationKeys: ["ingredients"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown destination enum values", () => {
    const result = suggestAppNavigationInputSchema.safeParse({
      organisationSlug: "acme",
      venueSlug: "richmond",
      destinationKeys: ["recipes"],
    });
    expect(result.success).toBe(false);
  });

  it("dedupes destination keys in stable first-seen order", () => {
    expect(dedupeDestinationKeys(["ingredients", "ingredients", "ingredients"])).toEqual([
      "ingredients",
    ]);
  });

  it("rejects unsafe href values on cards", () => {
    expect(
      appNavigationCardSchema.safeParse({
        title: "X",
        href: "//evil.com",
      }).success
    ).toBe(false);
    expect(
      appNavigationCardSchema.safeParse({
        title: "X",
        href: "https://evil.com",
      }).success
    ).toBe(false);
    expect(
      appNavigationCardSchema.safeParse({
        title: "X",
        href: "/a/b/c",
        destinationKey: "ingredients",
        organisationName: "Org",
        venueName: "Venue",
      }).success
    ).toBe(true);
  });

  it("accepts a valid success payload", () => {
    const parsed = suggestAppNavigationSuccessSchema.safeParse({
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
    expect(parsed.success).toBe(true);
  });
});

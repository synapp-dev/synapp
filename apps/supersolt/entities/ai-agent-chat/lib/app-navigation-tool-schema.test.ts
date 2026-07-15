import { describe, expect, it } from "vitest";

import {
  appNavigationCardSchema,
  dedupeDestinationKeys,
  isSafeAppNavigationHref,
  MAX_APP_NAVIGATION_DESTINATION_KEYS,
  periodFromNavigationInput,
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

  it("accepts period presets and custom ranges on input", () => {
    expect(
      suggestAppNavigationInputSchema.safeParse({
        organisationSlug: "acme",
        venueSlug: "richmond",
        destinationKeys: ["insights_sales"],
        periodPreset: "last-week",
      }).success,
    ).toBe(true);
    expect(
      suggestAppNavigationInputSchema.safeParse({
        organisationSlug: "acme",
        venueSlug: "richmond",
        destinationKeys: ["insights_sales"],
        periodFrom: "2026-07-06",
        periodTo: "2026-07-12",
      }).success,
    ).toBe(true);
  });

  it("rejects half-open or inverted custom ranges", () => {
    expect(
      suggestAppNavigationInputSchema.safeParse({
        organisationSlug: "acme",
        venueSlug: "richmond",
        destinationKeys: ["insights_sales"],
        periodFrom: "2026-07-06",
      }).success,
    ).toBe(false);
    expect(
      suggestAppNavigationInputSchema.safeParse({
        organisationSlug: "acme",
        venueSlug: "richmond",
        destinationKeys: ["insights_sales"],
        periodFrom: "2026-07-12",
        periodTo: "2026-07-06",
      }).success,
    ).toBe(false);
  });

  it("prefers a custom range over a preset", () => {
    expect(
      periodFromNavigationInput({
        periodPreset: "today",
        periodFrom: "2026-07-06",
        periodTo: "2026-07-12",
      }),
    ).toEqual({ kind: "custom", from: "2026-07-06", to: "2026-07-12" });
    expect(periodFromNavigationInput({ periodPreset: "today" })).toEqual({
      kind: "preset",
      preset: "today",
    });
    expect(periodFromNavigationInput({})).toBeUndefined();
  });

  it("allows only the insights period query on hrefs", () => {
    expect(
      isSafeAppNavigationHref(
        "/acme/richmond/insights/sales?preset=custom&from=2026-07-06&to=2026-07-12",
      ),
    ).toBe(true);
    expect(isSafeAppNavigationHref("/acme/richmond/insights/sales?preset=this-week")).toBe(
      true,
    );
    expect(isSafeAppNavigationHref("/a/b?redirect=https://evil.com")).toBe(false);
    expect(isSafeAppNavigationHref("/a/b?preset=<script>")).toBe(false);
    expect(isSafeAppNavigationHref("/a/b?")).toBe(false);
    expect(isSafeAppNavigationHref("/a/b?preset=custom?from=x")).toBe(false);
  });

  it("accepts a valid success payload", () => {
    const parsed = suggestAppNavigationSuccessSchema.safeParse({
      cards: [
        {
          title: "Ingredients",
          description: "View and manage ingredients for this venue.",
          href: "/acme/richmond/settings/inventory",
          destinationKey: "ingredients",
          organisationName: "Acme",
          venueName: "Richmond",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});

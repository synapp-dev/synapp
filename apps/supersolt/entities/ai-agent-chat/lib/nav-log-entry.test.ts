import { describe, expect, it } from "vitest";

import { deriveNavLogLabel } from "./nav-log-entry";

describe("deriveNavLogLabel", () => {
  it("labels reserved top-level routes without a scope", () => {
    expect(deriveNavLogLabel("/agent")).toEqual({
      label: "Agent",
      scopeLabel: null,
    });
    expect(deriveNavLogLabel("/dashboard")).toEqual({
      label: "Dashboard",
      scopeLabel: null,
    });
  });

  it("falls back to Home for the root path", () => {
    expect(deriveNavLogLabel("/")).toEqual({
      label: "Home",
      scopeLabel: null,
    });
  });

  it("looks up known venue routes from the navigation catalog", () => {
    expect(
      deriveNavLogLabel("/piccolo-panini-bar/hawthorn/settings/inventory"),
    ).toEqual({
      label: "Ingredients",
      scopeLabel: "Piccolo Panini Bar · Hawthorn",
    });
    expect(
      deriveNavLogLabel("/piccolo-panini-bar/hawthorn/purchasing/orders"),
    ).toEqual({
      label: "Order guide",
      scopeLabel: "Piccolo Panini Bar · Hawthorn",
    });
  });

  it("falls back to formatted segments for unknown venue routes", () => {
    expect(
      deriveNavLogLabel("/piccolo-panini-bar/hawthorn/insights/some-new-page"),
    ).toEqual({
      label: "Insights / Some New Page",
      scopeLabel: "Piccolo Panini Bar · Hawthorn",
    });
  });

  it("labels a venue root without a catalog entry", () => {
    expect(deriveNavLogLabel("/piccolo-panini-bar/hawthorn")).toEqual({
      label: "Hawthorn",
      scopeLabel: null,
    });
  });
});

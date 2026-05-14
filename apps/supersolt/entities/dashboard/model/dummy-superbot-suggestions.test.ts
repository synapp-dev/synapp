import { describe, expect, it } from "vitest";

import { dummySuperbotSuggestions } from "./dummy-superbot-suggestions";

describe("dummySuperbotSuggestions", () => {
  it("is non-empty and every entry has required fields", () => {
    expect(dummySuperbotSuggestions.length).toBeGreaterThan(0);
    for (const s of dummySuperbotSuggestions) {
      expect(s.gridLabel.length).toBeGreaterThan(0);
      expect(s.id.length).toBeGreaterThan(0);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
      expect(s.ctaLabel.length).toBeGreaterThan(0);
      expect(s.pathSuffix.length).toBeGreaterThan(0);
      expect(["users", "calendar", "clipboard-list", "utensils"]).toContain(
        s.iconId,
      );
    }
  });
});

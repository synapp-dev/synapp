import { describe, expect, it } from "vitest";

import {
  buildSuperbotSuggestionAssistantText,
  formatSuperbotScopePlaceLine,
  normalizeSuperbotPathSuffix,
  superbotSuggestionToPageHandoff,
} from "./superbot-suggestion-handoff";
import { dummySuperbotSuggestions } from "@/entities/dashboard/model/dummy-superbot-suggestions";

describe("superbot-suggestion-handoff", () => {
  it("normalises path suffixes", () => {
    expect(normalizeSuperbotPathSuffix("/workforce/timesheets")).toBe(
      "workforce/timesheets",
    );
    expect(normalizeSuperbotPathSuffix("workforce/timesheets/")).toBe(
      "workforce/timesheets",
    );
  });

  it("formats scope place lines", () => {
    expect(
      formatSuperbotScopePlaceLine({
        organisationName: "Acme",
        venuePart: "Richmond",
      }),
    ).toBe("Acme · Richmond");
    expect(
      formatSuperbotScopePlaceLine({
        organisationName: "Solo",
        venuePart: "Solo",
      }),
    ).toBe("Solo");
  });

  it("builds assistant copy including optional place line", () => {
    const s = dummySuperbotSuggestions[0]!;
    const withPlace = buildSuperbotSuggestionAssistantText(s, "Acme · Hawthorn");
    expect(withPlace).toContain("Acme · Hawthorn");
    expect(withPlace).toContain(s.description);
    const noPlace = buildSuperbotSuggestionAssistantText(s, null);
    expect(noPlace).not.toContain("This suggestion was for");
  });

  it("maps a suggestion to page handoff with follow-up text", () => {
    const s = dummySuperbotSuggestions[0]!;
    const h = superbotSuggestionToPageHandoff(s);
    expect(h.pathSuffix).toBe("workforce/timesheets");
    expect(h.pageFollowUpQuestion.length).toBeGreaterThan(0);
  });
});

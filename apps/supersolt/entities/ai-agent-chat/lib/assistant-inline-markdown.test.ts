import { describe, expect, it } from "vitest";

import {
  parseInlineBoldSegments,
  stripInlineBoldMarkers,
} from "@/entities/ai-agent-chat/lib/assistant-inline-markdown";

describe("parseInlineBoldSegments", () => {
  it("returns a single plain segment when there are no markers", () => {
    expect(parseInlineBoldSegments("Hello there")).toEqual([
      { text: "Hello there", bold: false },
    ]);
  });

  it("splits a bold span out of surrounding text", () => {
    expect(
      parseInlineBoldSegments(
        "Open **Ingredients** to view and manage your ingredient list.",
      ),
    ).toEqual([
      { text: "Open ", bold: false },
      { text: "Ingredients", bold: true },
      { text: " to view and manage your ingredient list.", bold: false },
    ]);
  });

  it("handles multiple bold spans", () => {
    expect(parseInlineBoldSegments("**A** and **B**")).toEqual([
      { text: "A", bold: true },
      { text: " and ", bold: false },
      { text: "B", bold: true },
    ]);
  });

  it("bolds the remainder for an unterminated marker (mid-stream)", () => {
    expect(parseInlineBoldSegments("Open **Ingred")).toEqual([
      { text: "Open ", bold: false },
      { text: "Ingred", bold: true },
    ]);
  });

  it("drops a trailing opener with no content yet", () => {
    expect(parseInlineBoldSegments("Open **")).toEqual([
      { text: "Open ", bold: false },
    ]);
  });

  it("handles empty input", () => {
    expect(parseInlineBoldSegments("")).toEqual([]);
  });
});

describe("stripInlineBoldMarkers", () => {
  it("removes markers but keeps the text", () => {
    expect(
      stripInlineBoldMarkers("Open **Ingredients** for Hawthorn."),
    ).toBe("Open Ingredients for Hawthorn.");
  });
});
